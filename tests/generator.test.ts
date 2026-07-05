import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeterministicBriefGenerator,
  LlmBriefGenerator,
  RecordedBriefGenerator,
} from "@/lib/firmascope/generator";
import { FixtureRegistryClient } from "@/lib/firmascope/registry";
import type { CompanyBrief } from "@/lib/firmascope/types";

const registryClient = new FixtureRegistryClient();

function validBrief(): CompanyBrief {
  return {
    input: { nip: "9512381607" },
    verdict: "low_risk",
    summary: "No immediate issue found in available VAT whitelist data.",
    registryFacts: [{ text: "VAT status: Czynny.", citationIds: ["c1"] }],
    riskSignals: [{ level: "info", text: "Active VAT payer.", citationIds: ["c1"] }],
    unknowns: [],
    citations: [
      {
        id: "c1",
        toolCallId: "call-1",
        sourceName: "VAT whitelist (fixture)",
        sourceType: "fixture",
        retrievedAt: "2026-07-05T00:00:00.000Z",
      },
    ],
    disclaimer: "This is a registry summary, not legal or financial advice.",
  };
}

describe("LlmBriefGenerator", () => {
  it("returns the brief when the first attempt is valid", async () => {
    const generateRaw = vi.fn().mockResolvedValue(validBrief());
    const generator = new LlmBriefGenerator(generateRaw);
    const lookup = await registryClient.lookupVatByNip("9512381607");

    const brief = await generator.generate({ nip: "9512381607", lookup });

    expect(brief.verdict).toBe("low_risk");
    expect(generateRaw).toHaveBeenCalledTimes(1);
  });

  it("repairs exactly once when the first attempt is invalid and the second is valid", async () => {
    const generateRaw = vi
      .fn()
      .mockResolvedValueOnce({ not: "a valid brief" })
      .mockResolvedValueOnce(validBrief());
    const generator = new LlmBriefGenerator(generateRaw);
    const lookup = await registryClient.lookupVatByNip("9512381607");

    const brief = await generator.generate({ nip: "9512381607", lookup });

    expect(brief.verdict).toBe("low_risk");
    expect(generateRaw).toHaveBeenCalledTimes(2);
  });

  it("falls back to insufficient_data when both attempts are invalid", async () => {
    const generateRaw = vi.fn().mockResolvedValue({ not: "a valid brief" });
    const generator = new LlmBriefGenerator(generateRaw);
    const lookup = await registryClient.lookupVatByNip("9512381607");

    const brief = await generator.generate({ nip: "9512381607", lookup });

    expect(brief.verdict).toBe("insufficient_data");
    expect(generateRaw).toHaveBeenCalledTimes(2);
  });

  it("treats forbidden wording as a repairable failure, not a schema pass", async () => {
    const wordedBrief = validBrief();
    wordedBrief.summary = "This is definitely a safe company.";
    const generateRaw = vi
      .fn()
      .mockResolvedValueOnce(wordedBrief)
      .mockResolvedValueOnce(validBrief());
    const generator = new LlmBriefGenerator(generateRaw);
    const lookup = await registryClient.lookupVatByNip("9512381607");

    const brief = await generator.generate({ nip: "9512381607", lookup });

    expect(brief.verdict).toBe("low_risk");
    expect(generateRaw).toHaveBeenCalledTimes(2);
  });

  it("does not call the LLM for not_found or error lookups", async () => {
    const generateRaw = vi.fn();
    const generator = new LlmBriefGenerator(generateRaw);

    const notFound = await registryClient.lookupVatByNip("0000000000");
    const errorLookup = await registryClient.lookupVatByNip("5252344078");

    await generator.generate({ nip: "0000000000", lookup: notFound });
    await generator.generate({ nip: "5252344078", lookup: errorLookup });

    expect(generateRaw).not.toHaveBeenCalled();
  });
});

describe("RecordedBriefGenerator", () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("replays a recorded run for a found lookup", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "firmascope-runs-"));
    writeFileSync(path.join(dir, "9512381607.json"), JSON.stringify(validBrief()));
    const generator = new RecordedBriefGenerator(dir);
    const lookup = await registryClient.lookupVatByNip("9512381607");

    const brief = await generator.generate({ nip: "9512381607", lookup });

    expect(brief.verdict).toBe("low_risk");
  });

  it("falls back to insufficient_data when no recording exists", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "firmascope-runs-"));
    const generator = new RecordedBriefGenerator(dir);
    const lookup = await registryClient.lookupVatByNip("9512381607");

    const brief = await generator.generate({ nip: "9512381607", lookup });

    expect(brief.verdict).toBe("insufficient_data");
  });

  it("delegates to the deterministic generator for not_found lookups", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "firmascope-runs-"));
    const generator = new RecordedBriefGenerator(dir);
    const deterministic = new DeterministicBriefGenerator();
    const lookup = await registryClient.lookupVatByNip("0000000000");

    const [recorded, expected] = await Promise.all([
      generator.generate({ nip: "0000000000", lookup }),
      deterministic.generate({ nip: "0000000000", lookup }),
    ]);

    expect(recorded.verdict).toBe(expected.verdict);
    expect(recorded.unknowns).toEqual(expected.unknowns);
  });
});

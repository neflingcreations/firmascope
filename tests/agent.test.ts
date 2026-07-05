import { describe, expect, it, vi } from "vitest";
import { analyzeCompany, runGuards } from "@/lib/firmascope/agent";
import { allClaimCitationsResolve } from "@/lib/firmascope/citations";
import { DeterministicBriefGenerator } from "@/lib/firmascope/generator";
import { FixtureRegistryClient } from "@/lib/firmascope/registry";
import { CompanyBriefSchema } from "@/lib/firmascope/schema";
import type { CompanyBrief } from "@/lib/firmascope/types";

function deps() {
  return {
    registryClient: new FixtureRegistryClient(),
    briefGenerator: new DeterministicBriefGenerator(),
  };
}

describe("analyzeCompany", () => {
  it("produces a schema-valid, cited brief for a known-active company", async () => {
    const { trace, brief } = await analyzeCompany("9512381607", deps());

    expect(CompanyBriefSchema.safeParse(brief).success).toBe(true);
    expect(brief.verdict).toBe("low_risk");
    expect(brief.citations.length).toBeGreaterThan(0);
    expect(allClaimCitationsResolve(brief.registryFacts, brief.citations)).toBe(true);
    expect(trace).toHaveLength(4);
    expect(trace.every((event) => event.status === "ok")).toBe(true);
  });

  it("returns insufficient_data for an unmapped NIP", async () => {
    const { brief } = await analyzeCompany("0000000000", deps());
    expect(brief.verdict).toBe("insufficient_data");
    expect(CompanyBriefSchema.safeParse(brief).success).toBe(true);
  });

  it("returns a graceful insufficient_data brief for a malformed registry response", async () => {
    const { trace, brief } = await analyzeCompany("5252344078", deps());
    expect(brief.verdict).toBe("insufficient_data");
    expect(CompanyBriefSchema.safeParse(brief).success).toBe(true);
    const lookupEvent = trace.find((event) => event.label === "Registry lookup");
    expect(lookupEvent?.status).toBe("error");
  });

  it("rejects invalid input before making any registry call", async () => {
    const registryClient = {
      lookupVatByNip: vi.fn(),
    };
    const { trace, brief } = await analyzeCompany("not-a-nip", {
      registryClient,
      briefGenerator: new DeterministicBriefGenerator(),
    });

    expect(registryClient.lookupVatByNip).not.toHaveBeenCalled();
    expect(trace).toHaveLength(1);
    expect(trace[0].status).toBe("error");
    expect(brief.verdict).toBe("insufficient_data");
  });

  it("falls back to insufficient_data when a generator output fails guards", async () => {
    const brokenBrief: CompanyBrief = {
      input: { nip: "9512381607" },
      verdict: "low_risk",
      summary: "This company is definitely safe.",
      registryFacts: [{ text: "Uncited claim.", citationIds: ["missing"] }],
      riskSignals: [],
      unknowns: [],
      citations: [],
      disclaimer: "Not advice.",
    };

    const { brief } = await analyzeCompany("9512381607", {
      registryClient: new FixtureRegistryClient(),
      briefGenerator: { generate: async () => brokenBrief },
    });

    expect(brief.verdict).toBe("insufficient_data");
  });

  it("never leaks the forbidden phrase itself into the fallback brief", async () => {
    const forbiddenBrief: CompanyBrief = {
      input: { nip: "9512381607" },
      verdict: "low_risk",
      summary: "This is definitely a safe company.",
      registryFacts: [],
      riskSignals: [],
      unknowns: [],
      citations: [],
      disclaimer: "Not advice.",
    };

    const { brief } = await analyzeCompany("9512381607", {
      registryClient: new FixtureRegistryClient(),
      briefGenerator: { generate: async () => forbiddenBrief },
    });

    expect(brief.verdict).toBe("insufficient_data");
    const rendered = [brief.summary, ...brief.unknowns, ...brief.riskSignals.map((s) => s.text)]
      .join(" ")
      .toLowerCase();
    expect(rendered).not.toContain("safe company");
    expect(rendered).not.toContain("definitely");
  });
});

describe("runGuards", () => {
  it("rejects forbidden wording", () => {
    const brief: CompanyBrief = {
      input: { nip: "9512381607" },
      verdict: "low_risk",
      summary: "This is a safe company, guaranteed.",
      registryFacts: [],
      riskSignals: [],
      unknowns: [],
      citations: [],
      disclaimer: "Not advice.",
    };
    const result = runGuards(brief);
    expect(result.ok).toBe(false);
  });

  it("accepts a well-formed brief with cautious wording", () => {
    const brief: CompanyBrief = {
      input: { nip: "9512381607" },
      verdict: "low_risk",
      summary: "No immediate issue found in available VAT whitelist data.",
      registryFacts: [{ text: "Active VAT payer.", citationIds: ["c1"] }],
      riskSignals: [],
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
    expect(runGuards(brief).ok).toBe(true);
  });
});

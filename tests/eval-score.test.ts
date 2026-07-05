import { describe, expect, it } from "vitest";
import type { GoldenCase } from "@/lib/evals/golden-cases";
import { scoreBrief } from "@/lib/evals/score";
import type { CompanyBrief } from "@/lib/firmascope/types";

function goldenCase(overrides: Partial<GoldenCase> = {}): GoldenCase {
  return {
    id: "test-case",
    description: "A test golden case.",
    nip: "9512381607",
    expectMissingData: false,
    expectedVerdicts: ["low_risk"],
    ...overrides,
  };
}

function validBrief(overrides: Partial<CompanyBrief> = {}): CompanyBrief {
  return {
    input: { nip: "9512381607" },
    verdict: "low_risk",
    summary: "No immediate issue found in available VAT whitelist data.",
    registryFacts: [{ text: "Registered as an active VAT payer.", citationIds: ["c1"] }],
    riskSignals: [{ level: "info", text: "Active VAT status.", citationIds: ["c1"] }],
    unknowns: [],
    citations: [
      {
        id: "c1",
        toolCallId: "call-1",
        sourceName: "VAT whitelist",
        sourceType: "fixture",
        retrievedAt: "2026-07-05T00:00:00.000Z",
      },
    ],
    disclaimer: "This is a registry summary, not legal or financial advice.",
    ...overrides,
  };
}

describe("scoreBrief", () => {
  it("passes every metric for a clean, matching brief", () => {
    const score = scoreBrief(goldenCase(), validBrief());
    expect(score.pass).toBe(true);
    expect(score.metrics).toEqual({
      schema_valid: true,
      all_factual_claims_cited: true,
      unknowns_present_when_data_missing: true,
      disclaimer_present: true,
      no_forbidden_advice_language: true,
      verdict_reasonable: true,
    });
  });

  it("fails everything for a schema-invalid raw object", () => {
    const score = scoreBrief(goldenCase(), { not: "a brief" });
    expect(score.pass).toBe(false);
    expect(score.metrics.schema_valid).toBe(false);
    expect(Object.values(score.metrics).every((v) => v === false)).toBe(true);
  });

  it("flags a registry fact citing an unresolved citation id", () => {
    const brief = validBrief({
      registryFacts: [{ text: "Uncited-in-practice claim.", citationIds: ["c-missing"] }],
    });
    const score = scoreBrief(goldenCase(), brief);
    expect(score.metrics.all_factual_claims_cited).toBe(false);
    expect(score.pass).toBe(false);
  });

  it("flags a risk signal citing an unresolved citation id", () => {
    const brief = validBrief({
      riskSignals: [{ level: "warning", text: "Some risk.", citationIds: ["c-missing"] }],
    });
    const score = scoreBrief(goldenCase(), brief);
    expect(score.metrics.all_factual_claims_cited).toBe(false);
  });

  it("flags a blank disclaimer", () => {
    const brief = validBrief({ disclaimer: "   " });
    const score = scoreBrief(goldenCase(), brief);
    expect(score.metrics.disclaimer_present).toBe(false);
    expect(score.pass).toBe(false);
  });

  it("flags forbidden wording in the summary", () => {
    const brief = validBrief({ summary: "This is a safe company, guaranteed." });
    const score = scoreBrief(goldenCase(), brief);
    expect(score.metrics.no_forbidden_advice_language).toBe(false);
    expect(score.pass).toBe(false);
  });

  it("requires unknowns when the case expects missing data", () => {
    const brief = validBrief({ unknowns: [] });
    const score = scoreBrief(goldenCase({ expectMissingData: true }), brief);
    expect(score.metrics.unknowns_present_when_data_missing).toBe(false);
    expect(score.pass).toBe(false);
  });

  it("does not penalize empty unknowns when the case doesn't expect missing data", () => {
    const brief = validBrief({ unknowns: [] });
    const score = scoreBrief(goldenCase({ expectMissingData: false }), brief);
    expect(score.metrics.unknowns_present_when_data_missing).toBe(true);
  });

  it("flags a verdict outside the case's reasonable set", () => {
    const brief = validBrief({ verdict: "needs_manual_review" });
    const score = scoreBrief(goldenCase({ expectedVerdicts: ["low_risk"] }), brief);
    expect(score.metrics.verdict_reasonable).toBe(false);
    expect(score.pass).toBe(false);
  });
});

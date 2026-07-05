import { describe, expect, it } from "vitest";
import { CompanyBriefSchema } from "@/lib/firmascope/schema";
import type { CompanyBrief } from "@/lib/firmascope/types";

function validBrief(): CompanyBrief {
  return {
    input: { nip: "5260250274" },
    verdict: "low_risk",
    summary: "No immediate issue found in available VAT whitelist data.",
    registryFacts: [
      { text: "Registered as an active VAT payer.", citationIds: ["c1"] },
    ],
    riskSignals: [],
    unknowns: ["No KRS data available for this NIP."],
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
  };
}

describe("CompanyBriefSchema", () => {
  it("parses a valid brief", () => {
    const result = CompanyBriefSchema.safeParse(validBrief());
    expect(result.success).toBe(true);
  });

  it("rejects a registry fact without a citation", () => {
    const brief = validBrief();
    brief.registryFacts = [{ text: "Uncited claim.", citationIds: [] }];
    const result = CompanyBriefSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid verdict", () => {
    const brief = validBrief() as unknown as Record<string, unknown>;
    brief.verdict = "definitely_safe";
    const result = CompanyBriefSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("rejects a missing disclaimer", () => {
    const brief = validBrief() as unknown as Record<string, unknown>;
    delete brief.disclaimer;
    const result = CompanyBriefSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it("allows unknowns without citations", () => {
    const brief = validBrief();
    brief.unknowns = ["No REGON data available."];
    const result = CompanyBriefSchema.safeParse(brief);
    expect(result.success).toBe(true);
  });
});

import { buildCitationFromLookup } from "./citations";
import type { Claim, CompanyBrief, RegistryLookupResult, RiskSignal } from "./types";

export const DISCLAIMER =
  "This is an automated registry summary based on available public VAT whitelist data " +
  "— not legal, financial, or accounting advice. Verify independently and consult a " +
  "professional before making decisions.";

export interface BriefGeneratorInput {
  nip: string;
  lookup: RegistryLookupResult;
}

export interface BriefGenerator {
  generate(input: BriefGeneratorInput): Promise<CompanyBrief>;
}

export function buildFallbackBrief(nip: string, reason: string): CompanyBrief {
  return {
    input: { nip },
    verdict: "insufficient_data",
    summary: "Insufficient data to produce a registry summary.",
    registryFacts: [],
    riskSignals: [{ level: "unknown", text: reason, citationIds: [] }],
    unknowns: [reason],
    citations: [],
    disclaimer: DISCLAIMER,
  };
}

export class DeterministicBriefGenerator implements BriefGenerator {
  async generate({ nip, lookup }: BriefGeneratorInput): Promise<CompanyBrief> {
    const citationId = "c1";

    if (lookup.status === "not_found") {
      return {
        input: { nip },
        verdict: "insufficient_data",
        summary:
          "No VAT whitelist entry found for this NIP; limited to available registry data.",
        registryFacts: [],
        riskSignals: [
          {
            level: "unknown",
            text: "No registry record found for this NIP.",
            citationIds: [citationId],
          },
        ],
        unknowns: ["No VAT whitelist entry found for this NIP."],
        citations: [buildCitationFromLookup(citationId, lookup)],
        disclaimer: DISCLAIMER,
      };
    }

    if (lookup.status === "error") {
      return {
        input: { nip },
        verdict: "insufficient_data",
        summary: "Registry lookup could not be completed; limited to available registry data.",
        registryFacts: [],
        riskSignals: [
          {
            level: "unknown",
            text: `Registry lookup failed: ${lookup.message}`,
            citationIds: [citationId],
          },
        ],
        unknowns: [`Registry lookup failed: ${lookup.message}`],
        citations: [buildCitationFromLookup(citationId, lookup)],
        disclaimer: DISCLAIMER,
      };
    }

    const { subject } = lookup;
    const citation = buildCitationFromLookup(citationId, lookup);

    const registryFacts: Claim[] = [
      { text: `Registered name: ${subject.name}.`, citationIds: [citationId] },
      { text: `VAT status: ${subject.statusVat}.`, citationIds: [citationId] },
    ];
    const unknowns: string[] = [];

    if (subject.regon) {
      registryFacts.push({ text: `REGON: ${subject.regon}.`, citationIds: [citationId] });
    } else {
      unknowns.push("REGON not available in registry data.");
    }

    const address = subject.workingAddress ?? subject.residenceAddress;
    if (address) {
      registryFacts.push({ text: `Registered address: ${address}.`, citationIds: [citationId] });
    } else {
      unknowns.push("No registered address available in registry data.");
    }

    if (subject.registrationLegalDate) {
      registryFacts.push({
        text: `Legal registration date: ${subject.registrationLegalDate}.`,
        citationIds: [citationId],
      });
    } else {
      unknowns.push("Legal registration date not available in registry data.");
    }

    if (subject.accountNumbers.length > 0) {
      registryFacts.push({
        text: `${subject.accountNumbers.length} bank account number(s) on record in the VAT whitelist.`,
        citationIds: [citationId],
      });
    } else {
      unknowns.push("No bank account numbers on record in the VAT whitelist.");
    }

    const riskSignals: RiskSignal[] = [];
    let verdict: CompanyBrief["verdict"];

    if (subject.statusVat === "Czynny") {
      verdict = "low_risk";
      riskSignals.push({
        level: "info",
        text: "Registered as an active VAT payer in the whitelist.",
        citationIds: [citationId],
      });
    } else {
      verdict = "needs_manual_review";
      riskSignals.push({
        level: "warning",
        text: `VAT status is "${subject.statusVat}", not confirmed active — manual review recommended.`,
        citationIds: [citationId],
      });
    }

    if (subject.removalDate || subject.registrationDenialDate) {
      verdict = "needs_manual_review";
      riskSignals.push({
        level: "warning",
        text: "Registry record shows a denial or removal event — manual review recommended.",
        citationIds: [citationId],
      });
    }

    return {
      input: { nip },
      verdict,
      summary: `Registry summary limited to available VAT whitelist data for NIP ${nip}.`,
      registryFacts,
      riskSignals,
      unknowns,
      citations: [citation],
      disclaimer: DISCLAIMER,
    };
  }
}

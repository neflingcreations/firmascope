import { readFileSync } from "node:fs";
import path from "node:path";
import type { LanguageModel } from "ai";
import { generateObject } from "ai";
import { allClaimCitationsResolve, buildCitationFromLookup } from "./citations";
import { renderCompanyBriefPrompt, renderRepairPrompt } from "./prompts";
import { CompanyBriefSchema } from "./schema";
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

// Section 12 wording rules: enforced here in code, not just via prompt.
// Lives in generator.ts (not agent.ts) so LlmBriefGenerator's own
// repair-retry loop can use it without a circular import — agent.ts's
// runGuards imports this instead of defining its own copy.
export const FORBIDDEN_PHRASES = [
  "safe company",
  "unsafe",
  "fraud detector",
  "fraudulent",
  "approved",
  "rejected",
  "guaranteed",
  "definitely",
  "you should sign",
  "credit score",
];

export function findForbiddenWording(brief: CompanyBrief): string[] {
  const haystack = [
    brief.summary,
    brief.disclaimer,
    ...brief.registryFacts.map((fact) => fact.text),
    ...brief.riskSignals.map((signal) => signal.text),
    ...brief.unknowns,
  ]
    .join(" \n ")
    .toLowerCase();

  return FORBIDDEN_PHRASES.filter((phrase) => haystack.includes(phrase));
}

function describeSemanticIssues(brief: CompanyBrief): string | null {
  if (!allClaimCitationsResolve(brief.registryFacts, brief.citations)) {
    return "a registry fact cites an unresolved citation id";
  }
  if (!allClaimCitationsResolve(brief.riskSignals, brief.citations)) {
    return "a risk signal cites an unresolved citation id";
  }
  if (!brief.disclaimer.trim()) {
    return "the disclaimer is missing";
  }
  if (findForbiddenWording(brief).length > 0) {
    return "forbidden wording was used";
  }
  return null;
}

/** Produces a raw (unvalidated) object from a prompt — the LLM call itself. */
export type ObjectGenerator = (prompt: string) => Promise<unknown>;

type Attempt = { ok: true; brief: CompanyBrief } | { ok: false; issue: string };

/**
 * OpenRouter-backed brief generator via the Vercel AI SDK's structured
 * output. Only called for `lookup.status === "found"` — the not_found/error
 * paths carry no data for an LLM to narrate, so they're delegated to
 * DeterministicBriefGenerator's existing (tested, guard-safe) handling
 * instead of spending an API call on them.
 *
 * Validates the raw model output against CompanyBriefSchema itself (rather
 * than trusting the SDK's structured-output guarantee), so repair-retry
 * behaves identically whether ObjectGenerator is the real OpenRouter call
 * or a test double returning arbitrary JSON.
 */
export class LlmBriefGenerator implements BriefGenerator {
  constructor(private readonly generateRaw: ObjectGenerator) {}

  async generate({ nip, lookup }: BriefGeneratorInput): Promise<CompanyBrief> {
    if (lookup.status !== "found") {
      return new DeterministicBriefGenerator().generate({ nip, lookup });
    }

    const citationId = "c1";
    const promptInput = { nip, citationId, lookup };

    const first = await this.attempt(renderCompanyBriefPrompt(promptInput));
    if (first.ok) return first.brief;

    const second = await this.attempt(renderRepairPrompt({ ...promptInput, issue: first.issue }));
    if (second.ok) return second.brief;

    return buildFallbackBrief(
      nip,
      `LLM brief generation failed validation after one repair attempt: ${second.issue}.`,
    );
  }

  private async attempt(prompt: string): Promise<Attempt> {
    let raw: unknown;
    try {
      raw = await this.generateRaw(prompt);
    } catch (err) {
      return { ok: false, issue: err instanceof Error ? err.message : String(err) };
    }

    const parsed = CompanyBriefSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, issue: parsed.error.message };
    }

    const semanticIssue = describeSemanticIssues(parsed.data);
    if (semanticIssue) {
      return { ok: false, issue: semanticIssue };
    }

    return { ok: true, brief: parsed.data };
  }
}

/** Wires LlmBriefGenerator to a real OpenRouter model via generateObject. */
export function createOpenRouterObjectGenerator(model: LanguageModel): ObjectGenerator {
  return async (prompt: string) => {
    const { object } = await generateObject({ model, schema: CompanyBriefSchema, prompt });
    return object;
  };
}

/**
 * Replays a real, previously-recorded LLM run for a given NIP
 * (`fixtures/runs/{nip}.json`) — this is what powers the key-free demo.
 * Falls back to a safe insufficient_data brief if no recording exists or
 * it fails validation; never renders unvalidated content.
 */
export class RecordedBriefGenerator implements BriefGenerator {
  constructor(
    private readonly runsDir: string = path.join(process.cwd(), "fixtures", "runs"),
  ) {}

  async generate({ nip, lookup }: BriefGeneratorInput): Promise<CompanyBrief> {
    if (lookup.status !== "found") {
      return new DeterministicBriefGenerator().generate({ nip, lookup });
    }

    try {
      const raw = JSON.parse(readFileSync(path.join(this.runsDir, `${nip}.json`), "utf-8"));
      const parsed = CompanyBriefSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch {
      // No recording for this NIP, or it's corrupt — fall through.
    }

    return buildFallbackBrief(nip, `No recorded run available for NIP ${nip}.`);
  }
}

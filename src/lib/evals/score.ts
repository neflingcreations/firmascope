import { allClaimCitationsResolve } from "@/lib/firmascope/citations";
import { findForbiddenWording } from "@/lib/firmascope/generator";
import { CompanyBriefSchema } from "@/lib/firmascope/schema";
import type { GoldenCase } from "./golden-cases";

export interface MetricResults {
  schema_valid: boolean;
  all_factual_claims_cited: boolean;
  unknowns_present_when_data_missing: boolean;
  disclaimer_present: boolean;
  no_forbidden_advice_language: boolean;
  verdict_reasonable: boolean;
}

export interface CaseScore {
  id: string;
  description: string;
  pass: boolean;
  metrics: MetricResults;
}

const METRIC_KEYS = [
  "schema_valid",
  "all_factual_claims_cited",
  "unknowns_present_when_data_missing",
  "disclaimer_present",
  "no_forbidden_advice_language",
  "verdict_reasonable",
] as const satisfies readonly (keyof MetricResults)[];

export function scoreBrief(goldenCase: GoldenCase, rawBrief: unknown): CaseScore {
  const parsed = CompanyBriefSchema.safeParse(rawBrief);

  if (!parsed.success) {
    const metrics: MetricResults = {
      schema_valid: false,
      all_factual_claims_cited: false,
      unknowns_present_when_data_missing: false,
      disclaimer_present: false,
      no_forbidden_advice_language: false,
      verdict_reasonable: false,
    };
    return { id: goldenCase.id, description: goldenCase.description, pass: false, metrics };
  }

  const brief = parsed.data;
  const metrics: MetricResults = {
    schema_valid: true,
    all_factual_claims_cited:
      allClaimCitationsResolve(brief.registryFacts, brief.citations) &&
      allClaimCitationsResolve(brief.riskSignals, brief.citations),
    unknowns_present_when_data_missing: !goldenCase.expectMissingData || brief.unknowns.length > 0,
    disclaimer_present: brief.disclaimer.trim().length > 0,
    no_forbidden_advice_language: findForbiddenWording(brief).length === 0,
    verdict_reasonable: goldenCase.expectedVerdicts.includes(brief.verdict),
  };

  const pass = METRIC_KEYS.every((key) => metrics[key]);

  return { id: goldenCase.id, description: goldenCase.description, pass, metrics };
}

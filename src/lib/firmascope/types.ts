import type { z } from "zod";
import type {
  CitationSchema,
  ClaimSchema,
  RiskSignalSchema,
  CompanyBriefSchema,
  TraceEventSchema,
} from "./schema";

export type Citation = z.infer<typeof CitationSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type RiskSignal = z.infer<typeof RiskSignalSchema>;
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;

/**
 * Mirrors the real `result.subject` shape returned by PBI-MCP's
 * `lookup_company_json`, straight from the MF VAT whitelist API
 * (see docs/integration-notes.md) — richer than the brief actually
 * surfaces, but RegistryClient must not silently drop fields.
 */
export interface RegistrySubject {
  name: string;
  nip: string;
  statusVat: string;
  regon: string | null;
  pesel: string | null;
  krs: string | null;
  residenceAddress: string | null;
  workingAddress: string | null;
  representatives: unknown[];
  authorizedClerks: unknown[];
  partners: unknown[];
  registrationLegalDate: string | null;
  registrationDenialBasis: string | null;
  registrationDenialDate: string | null;
  restorationBasis: string | null;
  restorationDate: string | null;
  removalBasis: string | null;
  removalDate: string | null;
  exemptionSmeDate: string | null;
  accountNumbers: string[];
  hasVirtualAccounts: boolean;
}

export interface RegistryLookupMeta {
  toolCallId: string;
  sourceName: string;
  sourceType: "mcp_tool" | "fixture";
  retrievedAt: string;
  rawPath?: string;
}

export type RegistryLookupResult =
  | ({ status: "found"; subject: RegistrySubject } & RegistryLookupMeta)
  | ({ status: "not_found"; nip: string; message: string } & RegistryLookupMeta)
  | ({
      status: "error";
      reason: "invalid_nip" | "api_unavailable" | "malformed_response";
      message: string;
    } & RegistryLookupMeta);

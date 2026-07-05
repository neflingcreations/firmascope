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

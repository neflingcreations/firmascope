import { z } from "zod";

export const CitationSchema = z.object({
  id: z.string(),
  toolCallId: z.string(),
  sourceName: z.string(),
  sourceType: z.enum(["mcp_tool", "fixture"]),
  retrievedAt: z.string(),
  rawPath: z.string().optional(),
});

export const ClaimSchema = z.object({
  text: z.string(),
  citationIds: z.array(z.string()).min(1), // factual claims MUST cite
});

export const RiskSignalSchema = z.object({
  level: z.enum(["info", "warning", "unknown"]),
  text: z.string(),
  citationIds: z.array(z.string()).default([]),
});

export const CompanyBriefSchema = z.object({
  input: z.object({ nip: z.string() }),
  verdict: z.enum(["low_risk", "needs_manual_review", "insufficient_data"]),
  summary: z.string(),
  registryFacts: z.array(ClaimSchema),
  riskSignals: z.array(RiskSignalSchema),
  unknowns: z.array(z.string()), // no citations required
  citations: z.array(CitationSchema),
  disclaimer: z.string(), // must be present
});

export const TraceEventSchema = z.object({
  step: z.number(),
  label: z.string(),
  toolCallId: z.string().optional(),
  status: z.enum(["ok", "warning", "error"]),
  timestamp: z.string(),
});

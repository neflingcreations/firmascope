import { allClaimCitationsResolve } from "./citations";
import { buildFallbackBrief, findForbiddenWording } from "./generator";
import type { BriefGenerator } from "./generator";
import { validateNip } from "./nip";
import type { RegistryClient } from "./registry";
import { CompanyBriefSchema } from "./schema";
import type { CompanyBrief, TraceEvent } from "./types";

interface GuardResult {
  ok: boolean;
  reason?: string;
}

// Section 8.5 post-validation guards, run against every brief before it
// reaches the UI — deterministic or LLM-generated alike. FORBIDDEN_PHRASES
// and findForbiddenWording live in generator.ts (not here) so
// LlmBriefGenerator's own repair-retry loop can reuse them without a
// circular import between agent.ts and generator.ts.
export function runGuards(brief: CompanyBrief): GuardResult {
  const schemaResult = CompanyBriefSchema.safeParse(brief);
  if (!schemaResult.success) {
    return { ok: false, reason: "Brief failed schema validation." };
  }
  if (!allClaimCitationsResolve(brief.registryFacts, brief.citations)) {
    return { ok: false, reason: "A registry fact cites an unresolved citation id." };
  }
  if (!allClaimCitationsResolve(brief.riskSignals, brief.citations)) {
    return { ok: false, reason: "A risk signal cites an unresolved citation id." };
  }
  if (!brief.disclaimer.trim()) {
    return { ok: false, reason: "Brief is missing its disclaimer." };
  }
  const forbidden = findForbiddenWording(brief);
  if (forbidden.length > 0) {
    // Deliberately does not echo the matched phrases back — this reason
    // string ends up rendered in the fallback brief, and the guard exists
    // to keep that exact wording out of anything shown to the user.
    return { ok: false, reason: "Brief failed the content-safety wording guard." };
  }
  return { ok: true };
}

export interface AgentDependencies {
  registryClient: RegistryClient;
  briefGenerator: BriefGenerator;
}

export interface AgentResult {
  trace: TraceEvent[];
  brief: CompanyBrief;
}

function nowIso(): string {
  return new Date().toISOString();
}

// maxSteps = 4: validate NIP -> registry lookup -> generate -> validate/guard.
export async function analyzeCompany(
  nip: string,
  deps: AgentDependencies,
): Promise<AgentResult> {
  const trace: TraceEvent[] = [];

  const nipValidation = validateNip(nip);
  trace.push({
    step: 1,
    label: "Validate NIP",
    status: nipValidation.valid ? "ok" : "error",
    timestamp: nowIso(),
  });

  if (!nipValidation.valid) {
    return { trace, brief: buildFallbackBrief(nip, `Invalid NIP: ${nipValidation.error}.`) };
  }

  const validatedNip = nipValidation.nip;
  const lookup = await deps.registryClient.lookupVatByNip(validatedNip);
  trace.push({
    step: 2,
    label: "Registry lookup",
    toolCallId: lookup.toolCallId,
    status: lookup.status === "found" ? "ok" : lookup.status === "not_found" ? "warning" : "error",
    timestamp: nowIso(),
  });

  let brief: CompanyBrief;
  try {
    brief = await deps.briefGenerator.generate({ nip: validatedNip, lookup });
    trace.push({ step: 3, label: "Generate brief", status: "ok", timestamp: nowIso() });
  } catch {
    trace.push({ step: 3, label: "Generate brief", status: "error", timestamp: nowIso() });
    return { trace, brief: buildFallbackBrief(validatedNip, "Brief generation failed.") };
  }

  const guard = runGuards(brief);
  trace.push({
    step: 4,
    label: "Validate guards",
    status: guard.ok ? "ok" : "error",
    timestamp: nowIso(),
  });

  if (!guard.ok) {
    return {
      trace,
      brief: buildFallbackBrief(validatedNip, guard.reason ?? "Guard check failed."),
    };
  }

  return { trace, brief };
}

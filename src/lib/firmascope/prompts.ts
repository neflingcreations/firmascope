import { readFileSync } from "node:fs";
import path from "node:path";
import { buildCitationFromLookup } from "./citations";
import type { RegistryLookupResult } from "./types";

const PROMPT_PATH = path.join(process.cwd(), "prompts", "company-brief.v1.md");

export function loadCompanyBriefPromptTemplate(): string {
  return readFileSync(PROMPT_PATH, "utf-8");
}

export interface RenderPromptInput {
  nip: string;
  citationId: string;
  lookup: Extract<RegistryLookupResult, { status: "found" }>;
}

export function renderCompanyBriefPrompt({ nip, citationId, lookup }: RenderPromptInput): string {
  const citation = buildCitationFromLookup(citationId, lookup);
  return loadCompanyBriefPromptTemplate()
    .split("{{NIP}}")
    .join(nip)
    .split("{{CITATION_ID}}")
    .join(citationId)
    .split("{{REGISTRY_JSON}}")
    .join(JSON.stringify(lookup.subject, null, 2))
    .split("{{CITATION_METADATA}}")
    .join(JSON.stringify(citation, null, 2));
}

export function renderRepairPrompt(input: RenderPromptInput & { issue: string }): string {
  const base = renderCompanyBriefPrompt(input);
  return (
    `${base}\n\n---\n\nYour previous attempt was invalid: ${input.issue}\n\n` +
    "Fix the issue and return a corrected JSON object that matches the schema exactly."
  );
}

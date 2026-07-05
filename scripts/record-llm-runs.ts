import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenRouterObjectGenerator, LlmBriefGenerator } from "../src/lib/firmascope/generator";
import { FixtureRegistryClient } from "../src/lib/firmascope/registry";
import { CompanyBriefSchema } from "../src/lib/firmascope/schema";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

// The two "found"-status demo NIPs (see fixtures/vat-whitelist/). not_found
// and malformed lookups never reach the LLM (LlmBriefGenerator delegates
// those to DeterministicBriefGenerator), so there's nothing to record for them.
const GOLDEN_NIPS = ["9512381607", "3210049379"];

async function main() {
  loadEnvLocal();

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    console.error("OPENROUTER_API_KEY and OPENROUTER_MODEL must be set (.env.local).");
    process.exit(1);
  }

  const openrouter = createOpenRouter({ apiKey });
  const languageModel = openrouter.chat(model);
  const generator = new LlmBriefGenerator(createOpenRouterObjectGenerator(languageModel));
  const registryClient = new FixtureRegistryClient();

  const runsDir = path.join(process.cwd(), "fixtures", "runs");
  mkdirSync(runsDir, { recursive: true });

  for (const nip of GOLDEN_NIPS) {
    console.log(`Recording live run for NIP ${nip} via ${model}...`);
    const lookup = await registryClient.lookupVatByNip(nip);
    if (lookup.status !== "found") {
      console.error(`  Skipped: lookup status was "${lookup.status}", expected "found".`);
      continue;
    }

    const brief = await generator.generate({ nip, lookup });
    const parsed = CompanyBriefSchema.safeParse(brief);
    if (!parsed.success) {
      console.error(`  Recorded brief failed schema validation:`, parsed.error.message);
      continue;
    }

    const outPath = path.join(runsDir, `${nip}.json`);
    writeFileSync(outPath, JSON.stringify(parsed.data, null, 2));
    console.log(`  Wrote ${outPath} (verdict: ${parsed.data.verdict})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

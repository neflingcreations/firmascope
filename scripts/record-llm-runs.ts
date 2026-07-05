import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { loadEnvLocal } from "../src/lib/env-local";
import { createOpenRouterObjectGenerator, LlmBriefGenerator } from "../src/lib/firmascope/generator";
import { FixtureRegistryClient } from "../src/lib/firmascope/registry";
import { CompanyBriefSchema } from "../src/lib/firmascope/schema";

// The "found"-status demo/golden NIPs (see fixtures/vat-whitelist/). not_found
// and malformed lookups never reach the LLM (LlmBriefGenerator delegates
// those to DeterministicBriefGenerator), so there's nothing to record for them.
const GOLDEN_NIPS = ["9512381607", "3210049379", "6555208280", "3005590982", "5631410744"];

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

  // Pass NIPs as CLI args to re-record a subset (e.g. after adding one new
  // golden fixture) without re-spending API calls on the whole set.
  const nips = process.argv.slice(2).length > 0 ? process.argv.slice(2) : GOLDEN_NIPS;

  for (const nip of nips) {
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

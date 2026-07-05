# Limitations

## Not legal, financial, or accounting advice

FirmaScope is a **registry-summary due-diligence assistant**, limited to available public VAT whitelist data. Every brief carries a disclaimer to this effect, and this wording is enforced by a code guard (`findForbiddenWording`) and by the eval harness, not just prompt instructions — see [architecture.md](./architecture.md#guard-layer-the-one-rule-that-matters). Nothing FirmaScope outputs should be read as "safe to sign," a credit assessment, or a substitute for professional/legal advice.

## The public demo only resolves 9 specific NIPs

The deployed demo runs in `fixture` + `recorded` mode by design (see the mode-switch table in [architecture.md](./architecture.md)) — **zero live registry or LLM calls**, so it works with zero API keys. It has real fixture data + a genuinely recorded LLM brief for exactly 9 NIPs (4 shown as sample buttons on the homepage, 5 more used only by the eval harness). Any other NIP — including a real company's actual NIP — correctly resolves to "no VAT whitelist entry found," because there is no live registry connection in this deployment. This is not a bug; it's the tradeoff that makes the demo reviewable without provisioning secrets for every visitor. Wiring up genuinely live lookups is on the roadmap (see below).

## Registry scope: VAT whitelist only

v0.1 wraps a single PBI-MCP tool, `lookup_company_json` (VAT whitelist / NIP lookup). KRS, CEIDG, and REGON registries are not queried, even though PBI-MCP exposes some related tools (`verify_contractor`, `check_vat_eu`) — those are scoped out for v0.1, not because they don't work, but to keep the shipped surface area matched to what's actually tested end-to-end.

## Live MCP mode is not wired up

`McpRegistryClient` (`src/lib/firmascope/registry.ts`) is an explicit stub that throws rather than silently faking data. PBI-MCP only exposes a **stdio** transport (`mcp.run()`), which means a live connection requires the Next.js process to spawn and hold open a persistent child process — not just make an HTTP call. The app is deployed on Dokploy (a long-running Docker container), so unlike a classic serverless-functions host, that constraint is no longer a hard blocker the way it would have been on the platform this project originally targeted. Wiring it up for real (installing Python/uv in the image, spawning `polish-business-mcp`, handling the MCP handshake, per-process caching against the Ministry of Finance API's daily query limits) is real, non-trivial work that's deliberately out of v0.1 scope — a roadmap item, not an oversight.

## Eval metrics mostly guard the guard layer, not the model directly

The eval harness (`src/lib/evals/`) scores 6 metrics per golden case. Worth understanding precisely what they check: `analyzeCompany` already runs every brief through `runGuards()` before returning it, and on any guard failure substitutes a clean, schema-valid `insufficient_data` fallback. That means `schema_valid`, `all_factual_claims_cited`, `disclaimer_present`, and `no_forbidden_advice_language` are structurally very hard to fail end-to-end — a bad LLM output gets caught and replaced *before* the eval ever scores it. This was confirmed empirically during development: injecting forbidden wording into a recorded run still flipped the case to FAIL, but through `verdict_reasonable` (because the fallback's `insufficient_data` verdict didn't match the case's expected verdict), not through `no_forbidden_advice_language` (because by the time scoring ran, the offending text was already gone). The eval genuinely catches badness — just one layer further out than the metric names suggest. `verdict_reasonable` is the metric doing the most real work, which is why a 9th golden case (`restored-after-removal`) was added specifically to exercise the `needs_manual_review` branch that the spec's original 8 cases never reached.

## Recorded runs are frozen at record time

`fixtures/runs/*.json` are real LLM outputs captured once via `scripts/record-llm-runs.ts` against a specific model (`z-ai/glm-5.2` as of this writing) and prompt version (`prompts/company-brief.v1.md` v1). They will not reflect future prompt or model changes until someone re-runs the recording script and commits the update. `EVAL_LIVE=1 npm run eval` exercises the real model fresh (no caching), so it's the source of truth for "does this still work," while the recorded fixtures are the source of truth for "what does the deployed demo actually show."

## No streaming

The API returns the complete trace array in one response; the UI animates it client-side. Server-sent events / streaming is a stretch goal, not in v0.1.

## Roadmap

- Wire up live MCP mode (see above).
- KRS / CEIDG / REGON registries as additional MCP tools.
- Model comparison: score multiple LLMs against the same golden cases.
- Monitoring: periodic re-checks of a saved NIP (e.g. via an n8n webhook).
- SSE streaming of the trace.
- Grounded follow-up questions against an already-generated brief.

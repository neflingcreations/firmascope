# Demo script (2 minutes)

Live demo: see the README for the current Dokploy URL. No login, no API keys.

## 1. Set up the ask (15s)

"You're a freelancer or small business about to invoice a new Polish client. Before you sign anything, you want a quick, sourced sanity check on their VAT registration — not a black-box yes/no, something you can actually verify. That's FirmaScope."

## 2. Show the demo notice (10s)

Point at the banner: *"Demo mode — committed fixture data and pre-recorded model output, zero live calls."* This deployment is intentionally key-free — it replays real registry data and a real, previously-generated LLM brief, so anyone can review it without provisioning secrets.

## 3. Run the active-company case (30s)

Click the **"Active VAT payer"** sample (`9512381607`). Narrate the trace panel as it animates: validate NIP → registry lookup → generate brief → validate guards. Land on the brief:
- **LOW RISK** stamp
- Registry facts, each with a `[1]` citation superscript
- Click a citation to open the source ledger — the exact fixture file and timestamp it came from

"Every factual claim is cited. This isn't the model's opinion floating free — it's tied to a specific tool call."

## 4. Run the partial-data case (25s)

Click **"Partial registry record"** (`3210049379`). The model itself judged this `insufficient_data` given how much was missing — a legitimate outcome, not a bug. Point out the `unknowns` list: missing fields become explicit unknowns, never invented facts.

## 5. Show a guard catching something (20s)

Mention (don't necessarily click through): the deterministic generator and the LLM path both run through the same post-validation guard — schema validity, citation resolution, disclaimer presence, forbidden wording (no "safe company," no "guaranteed," no credit-score language). If either path produces something that fails the guard, the user sees a clean `insufficient_data` fallback instead, never the broken or unsafe output. "This is enforced in code, not just prompted for — and there's an eval suite and unit tests specifically for this guard."

## 6. Eval results (15s)

Point at the README's eval table (or `docs/eval-results.md`): 9 golden cases, 6 metrics each, scored against a genuinely fresh live LLM run. "This isn't a demo I eyeballed once — it's a repeatable check I can re-run any time I change the prompt."

## 7. Close (15s)

"It's built on PBI-MCP — an MCP server for Polish business registry data I also built. This app is the client side: structured outputs, per-claim citations, and automated evals, agentic tool-calling flow end to end."

## If asked "does it work for my actual NIP?"

Be upfront: the public demo only has real data for these specific sample NIPs (fixture + recorded mode, by design — see `docs/limitations.md`). Live registry wiring is on the roadmap; it's a deliberate scope boundary for this version, not a limitation anyone's tried to hide.

# FirmaScope — conventions

Full spec lives in `private/FIRMASCOPE-DEV-PLAN.md` (git-ignored, not part of the public repo).

## The one rule that matters

**Never render unvalidated LLM output.** Every `CompanyBrief` must pass Zod validation (`src/lib/firmascope/schema.ts`) and the citation/wording guards before it reaches the UI. On validation failure: one repair retry, then a deterministic `insufficient_data` fallback. No exceptions.

## Two independent mode switches (env, not request body)

- `REGISTRY_SOURCE=fixture|mcp`
- `BRIEF_GENERATOR=deterministic|llm|recorded`
- Default (no env set): `fixture` + `recorded` — the app must run with zero API keys.

## Phases

Each phase: implement → `npm run test` green → commit with the message below. Never commit with failing tests.

0. PBI-MCP integration notes — `docs: PBI-MCP integration notes`
1. Next.js scaffold — `chore: scaffold FirmaScope app`
2. NIP validation (`src/lib/firmascope/nip.ts`) — `feat: add NIP validation`
3. Zod schema (`src/lib/firmascope/schema.ts`, `types.ts`) — `feat: define company brief schema`
4. Registry client + fixtures — `feat: add registry client abstraction and fixtures`
5. Deterministic orchestrator + citations + trace — `feat: deterministic analysis orchestrator with citations`
6. LLM brief generator + repair-retry — `feat: LLM structured-output brief generator with repair retry`
7. `POST /api/analyze-company` — `feat: add company analysis API route`
8. UI — `feat: build FirmaScope demo UI`
9. Eval harness — `feat: add eval harness with golden cases`
10. CI + Vercel deploy — `ci: add GitHub Actions pipeline`
11. Docs + final verification — `docs: architecture, evals, limitations, demo script`

## Scripts

`npm run dev|build|lint|typecheck|test|test:watch|eval`

## Safety wording (enforced by code guard + eval, not just prompt)

Use: registry summary, due-diligence assistant, risk signals, manual review recommended, insufficient data, unknown, limited to available registry data.

Forbidden: "safe company", "unsafe", "fraud detector", "fraudulent", "approved", "rejected", "guaranteed", "definitely", "you should sign", legal/financial advice phrasing, "credit score".

# PBI-MCP Integration Notes (Phase 0)

Source: `github.com/neflingcreations/PBI-MCP`, local clone at
`C:\Users\nefli\Desktop\Developer\pbi-mcp` (lowercase folder; repo name `PBI-MCP`).
Verified by reading the server source directly and by a live call against the
real Ministry of Finance API (see "Real sample output" below).

## Stack

Python 3.11+, managed by `uv`, **FastMCP**, `httpx`. Package `polish_business_mcp`,
console script `polish-business-mcp`.

## Transport: stdio only

The server runs via `mcp.run()` (stdio transport). There is no HTTP/SSE mode.

**Consequence:** live MCP access requires the Next.js process to spawn/talk to
the PBI-MCP process locally as a persistent stdio subprocess — it does not work
on classic serverless functions (e.g. AWS Lambda-style FaaS), which can't hold
that subprocess open across requests. The v0.1 deploy target is **Dokploy**
(self-hosted, Docker-container based — a long-running Node server, not
serverless functions), so the stdio constraint is not a hard blocker there the
way it would be on a serverless platform. **Still out of scope for v0.1** per
the locked Phase 0 decision below — wiring `McpRegistryClient` for real is a
roadmap item, not something this deploy-target change unlocks by itself. The
deployed demo therefore runs in `fixture` + `recorded` mode; live MCP mode is
local-only for now. This is documented again in `docs/limitations.md`
(Phase 11) and is a scope decision, not a bug.

**Running live locally:** `uv run polish-business-mcp` with
`cwd = C:\Users\nefli\Desktop\Developer\pbi-mcp` (requires Python + uv). The
Next.js side needs a **stdio** MCP client (`@modelcontextprotocol/sdk`'s
`StdioClientTransport`, or the Vercel AI SDK's `experimental_createMCPClient`
pointed at a stdio transport) — this repo does not use the AI SDK's built-in
HTTP/SSE MCP transport since PBI-MCP doesn't expose one. ("Vercel AI SDK" here
names the `ai` npm package, not the hosting platform.)

## Tools that exist (7 total)

| Tool | Inputs | Output | Reliable for v0.1? |
| --- | --- | --- | --- |
| **`lookup_company`** | `nip: str` | Plain text — name, NIP, REGON, VAT status, address, legal reg date, bank accounts | Yes, but plain text (see wrinkle below) |
| **`lookup_company_json`** *(new, added in Stage A)* | `nip: str` | JSON string — see below | Yes — this is the tool `RegistryClient` wraps |
| **`check_vat_status`** | `nip: str` | Plain text — YES (Czynny) / NO / EXEMPT (Zwolniony) + name | Yes, but out of scope (we need structured facts, not a yes/no) |
| `verify_contractor` | `nip: str` | Plain text — reconciled PL whitelist + EU VIES verdict | Roadmap (v0.1 is PL VAT whitelist only per dev-plan §3) |
| `check_vat_eu` | `country_code`, `vat_number` | Plain text — VIES VALID/INVALID + name/address | Roadmap (non-PL, out of v0.1 scope) |
| `get_all_rates` / `get_currency_rate` / `convert_currency` | currency/date | NBP FX data | Out of scope for v0.1 (no FX in the brief) |

**Decision: `lookup_company_json` is the tool `RegistryClient` wraps.** It was
added to PBI-MCP in this stage specifically so FirmaScope never has to parse
prose (see "The plain-text wrinkle" below).

## The plain-text wrinkle and its resolution

All of PBI-MCP's original tools return **human-readable text, never JSON** —
by design, so a conversational AI agent can read them directly. But FirmaScope
needs **structured fields** for its Zod schema and per-claim citations, and
parsing prose with regex is fragile and a poor interview story.

**Resolution:** added a new tool, `lookup_company_json(nip)`, directly to the
PBI-MCP server (`src/polish_business_mcp/server.py`), committed on branch
`feat/cross-border-due-diligence` (pushed to origin). Contract:

- **Success:** returns `json.dumps(subject)` where `subject` is the registry's
  own `result.subject` object, verbatim, from
  `https://wl-api.mf.gov.pl/api/search/nip/{nip}?date=YYYY-MM-DD`.
- **Failure:** returns a JSON envelope instead —
  `{"error": "invalid_nip" | "not_found" | "api_unavailable", "message": str, "nip": str}`.
  `McpRegistryClient` must check for the `"error"` key before treating the
  parsed object as a company record.

`McpRegistryClient` then does `JSON.parse(toolOutput)` — a clean contract, no
text scraping.

## Real sample output (live-verified)

Called `lookup_company_json("9512381607")` (Booksy International's real,
checksum-valid NIP — already used as the project's running example in
PBI-MCP's own tests) against the live Ministry of Finance API on 2026-07-05:

```json
{
  "name": "BOOKSY INTERNATIONAL SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ",
  "nip": "9512381607",
  "statusVat": "Czynny",
  "regon": "147315920",
  "pesel": null,
  "krs": "0000515914",
  "residenceAddress": null,
  "workingAddress": "PROSTA 67, 00-838 WARSZAWA",
  "representatives": [],
  "authorizedClerks": [],
  "partners": [],
  "registrationLegalDate": "2014-07-31",
  "registrationDenialBasis": null,
  "registrationDenialDate": null,
  "restorationBasis": null,
  "restorationDate": null,
  "removalBasis": null,
  "removalDate": null,
  "exemptionSmeDate": null,
  "accountNumbers": ["82249000050000460038099095", "...9 more"],
  "hasVirtualAccounts": true
}
```

**Note vs. the dev plan's assumed shape:** the real `result.subject` object is
richer than dev-plan §7's summary (`name`, `nip`, `regon`, `statusVat`,
`workingAddress`/`residenceAddress`, `registrationLegalDate`,
`accountNumbers[]`). It also includes `pesel`, `krs`, `representatives[]`,
`authorizedClerks[]`, `partners[]`, denial/restoration/removal fields, and
`hasVirtualAccounts`. FirmaScope's registry types (Phase 4) should model the
full shape (or at least not choke on the extra fields) even though the brief
generator only surfaces the subset relevant to due diligence.

**Not-found case:** an unregistered/invalid-for-VAT NIP returns HTTP 404 from
the upstream API, which `lookup_company_json` turns into
`{"error": "not_found", "message": "...", "nip": "..."}`.

## NIP checksum

PBI-MCP's `vat.py` validates NIPs with weights `6,5,7,2,3,4,5,6,7`, summed
mod 11, rejecting a checksum of 10 — identical to dev-plan Phase 2's spec.
FirmaScope re-implements this in TypeScript (`src/lib/firmascope/nip.ts`); it
does not import the Python implementation.

## What fixtures must mock (Phase 4)

The four `fixtures/vat-whitelist/*.json` files mirror the **real
`result.subject` shape** shown above (not a simplified version), so that
citations and the eval harness are checked against realistic data:

- `known-active-company.json` — `statusVat: "Czynny"`, full address/accounts (base this on the Booksy sample above, redacted/adjusted as needed).
- `unknown-nip.json` — represents the `{"error": "not_found", ...}` envelope.
- `partial-response.json` — a subject with some fields null/missing (e.g. `residenceAddress` only, no `workingAddress`, empty `accountNumbers`).
- `malformed-response.json` — a response that doesn't match the expected shape at all, to exercise `RegistryClient`'s safe typed-error path.

## Decision output (Phase 0 deliverable)

- **Tool `RegistryClient` wraps:** `lookup_company_json(nip)`.
- **Transport:** stdio via `@modelcontextprotocol/sdk`'s `StdioClientTransport`
  (not the Vercel AI SDK's experimental MCP client, since there's no HTTP/SSE
  endpoint to point it at) — wrapped behind the `RegistryClient` interface
  either way, per dev-plan §4's risk note.
- **Live MCP mode:** local-only. Deployed demo runs `fixture` + `recorded`.

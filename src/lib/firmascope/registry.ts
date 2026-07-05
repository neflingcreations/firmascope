import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { RegistryLookupMeta, RegistryLookupResult, RegistrySubject } from "./types";

export interface RegistryClient {
  lookupVatByNip(nip: string): Promise<RegistryLookupResult>;
}

const FIXTURES_ROOT = path.join(process.cwd(), "fixtures", "vat-whitelist");

const FIXTURE_BY_NIP: Record<string, string> = {
  "9512381607": "known-active-company.json",
  "3210049379": "partial-response.json",
  "5252344078": "malformed-response.json",
};

const UNKNOWN_FIXTURE = "unknown-nip.json";

function isRegistrySubject(value: unknown): value is RegistrySubject {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.nip === "string" &&
    typeof v.statusVat === "string" &&
    Array.isArray(v.accountNumbers)
  );
}

function isErrorEnvelope(
  value: unknown,
): value is { error: string; message: string; nip: string } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.error === "string" && typeof v.message === "string";
}

export class FixtureRegistryClient implements RegistryClient {
  async lookupVatByNip(nip: string): Promise<RegistryLookupResult> {
    const fixtureFile = FIXTURE_BY_NIP[nip] ?? UNKNOWN_FIXTURE;
    const meta: RegistryLookupMeta = {
      toolCallId: `fixture-${randomUUID()}`,
      sourceName: "VAT whitelist (fixture)",
      sourceType: "fixture",
      retrievedAt: new Date().toISOString(),
      rawPath: `fixtures/vat-whitelist/${fixtureFile}`,
    };

    let parsed: unknown;
    try {
      const raw = readFileSync(path.join(FIXTURES_ROOT, fixtureFile), "utf-8");
      parsed = JSON.parse(raw);
    } catch {
      return {
        status: "error",
        reason: "api_unavailable",
        message: `Failed to load fixture ${fixtureFile}`,
        ...meta,
      };
    }

    if (isErrorEnvelope(parsed)) {
      if (parsed.error === "not_found") {
        return { status: "not_found", nip: parsed.nip, message: parsed.message, ...meta };
      }
      return {
        status: "error",
        reason: parsed.error === "invalid_nip" ? "invalid_nip" : "api_unavailable",
        message: parsed.message,
        ...meta,
      };
    }

    if (isRegistrySubject(parsed)) {
      return { status: "found", subject: parsed, ...meta };
    }

    return {
      status: "error",
      reason: "malformed_response",
      message: `Fixture ${fixtureFile} does not match the expected registry subject shape`,
      ...meta,
    };
  }
}

/**
 * Stub for the live PBI-MCP path: spawns `lookup_company_json` over the
 * stdio transport per docs/integration-notes.md. Not wired yet — the
 * fixture path (used by demo mode and the eval harness) must not depend
 * on this. Live wiring lands in a later pass.
 */
export class McpRegistryClient implements RegistryClient {
  constructor(private readonly command: string) {}

  async lookupVatByNip(nip: string): Promise<RegistryLookupResult> {
    throw new Error(
      `McpRegistryClient is not wired yet (command: ${this.command}, nip: ${nip}) — live MCP mode lands in a later phase.`,
    );
  }
}

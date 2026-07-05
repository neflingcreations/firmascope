import { describe, expect, it } from "vitest";
import { FixtureRegistryClient, McpRegistryClient } from "@/lib/firmascope/registry";

describe("FixtureRegistryClient", () => {
  const client = new FixtureRegistryClient();

  it("returns the known-active fixture for a mapped NIP", async () => {
    const result = await client.lookupVatByNip("9512381607");
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.subject.name).toContain("BOOKSY");
      expect(result.subject.statusVat).toBe("Czynny");
    }
    expect(result.sourceType).toBe("fixture");
  });

  it("falls back to the unknown fixture for an unmapped NIP", async () => {
    const result = await client.lookupVatByNip("0000000000");
    expect(result.status).toBe("not_found");
  });

  it("returns the partial-response fixture with missing fields intact", async () => {
    const result = await client.lookupVatByNip("3210049379");
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.subject.workingAddress).toBeNull();
      expect(result.subject.accountNumbers).toEqual([]);
    }
  });

  it("returns a safe typed error for a malformed fixture", async () => {
    const result = await client.lookupVatByNip("5252344078");
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.reason).toBe("malformed_response");
    }
  });
});

describe("McpRegistryClient", () => {
  it("is an explicit stub that throws rather than silently returning fake data", async () => {
    const client = new McpRegistryClient("uv run polish-business-mcp");
    await expect(client.lookupVatByNip("9512381607")).rejects.toThrow(/not wired yet/);
  });
});

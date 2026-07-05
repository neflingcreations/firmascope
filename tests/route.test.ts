import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze-company/route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze-company", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/analyze-company", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 200 with a brief for a known-active NIP in default (fixture+recorded) mode", async () => {
    const response = await POST(postRequest({ nip: "9512381607" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.brief.verdict).toBe("low_risk");
    expect(json.trace).toHaveLength(4);
  });

  it("returns 200 with insufficient_data for an unmapped NIP", async () => {
    const response = await POST(postRequest({ nip: "0000000000" }));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.brief.verdict).toBe("insufficient_data");
  });

  it("returns 400 for an invalid NIP", async () => {
    const response = await POST(postRequest({ nip: "123" }));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/invalid nip/i);
  });

  it("returns 400 when the nip field is missing", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-JSON body", async () => {
    const response = await POST(postRequest("not json"));
    expect(response.status).toBe(400);
  });

  it("returns 500 sanitized when BRIEF_GENERATOR=llm is misconfigured", async () => {
    vi.stubEnv("BRIEF_GENERATOR", "llm");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENROUTER_MODEL", "");

    const response = await POST(postRequest({ nip: "9512381607" }));

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal error while analyzing company.");
  });

  it("ignores client-provided mode overrides in the request body", async () => {
    const response = await POST(
      postRequest({ nip: "9512381607", registrySource: "mcp", briefGenerator: "llm" }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.brief.verdict).toBe("low_risk");
  });
});

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { NextResponse } from "next/server";
import { analyzeCompany } from "@/lib/firmascope/agent";
import type { AgentDependencies } from "@/lib/firmascope/agent";
import {
  createOpenRouterObjectGenerator,
  DeterministicBriefGenerator,
  LlmBriefGenerator,
  RecordedBriefGenerator,
} from "@/lib/firmascope/generator";
import { validateNip } from "@/lib/firmascope/nip";
import { FixtureRegistryClient, McpRegistryClient } from "@/lib/firmascope/registry";
import type { RegistryClient } from "@/lib/firmascope/registry";
import type { BriefGenerator } from "@/lib/firmascope/generator";

function resolveRegistryClient(): RegistryClient {
  if (process.env.REGISTRY_SOURCE === "mcp") {
    return new McpRegistryClient(process.env.PBI_MCP_COMMAND ?? "");
  }
  return new FixtureRegistryClient();
}

function resolveBriefGenerator(): BriefGenerator {
  const mode = process.env.BRIEF_GENERATOR ?? "recorded";

  if (mode === "deterministic") {
    return new DeterministicBriefGenerator();
  }

  if (mode === "llm") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    if (!apiKey || !model) {
      throw new Error(
        "OPENROUTER_API_KEY and OPENROUTER_MODEL must be set when BRIEF_GENERATOR=llm.",
      );
    }
    const openrouter = createOpenRouter({ apiKey });
    return new LlmBriefGenerator(createOpenRouterObjectGenerator(openrouter.chat(model)));
  }

  return new RecordedBriefGenerator();
}

// Modes come from server-side env only — the client can never force a
// live registry call or a live LLM call via the request body.
function resolveDependencies(): AgentDependencies {
  return {
    registryClient: resolveRegistryClient(),
    briefGenerator: resolveBriefGenerator(),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const nip = (body as { nip?: unknown } | null)?.nip;
  if (typeof nip !== "string") {
    return NextResponse.json({ error: "Request body must include a 'nip' string." }, {
      status: 400,
    });
  }

  const nipValidation = validateNip(nip);
  if (!nipValidation.valid) {
    return NextResponse.json(
      { error: `Invalid NIP: ${nipValidation.error}.` },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeCompany(nipValidation.nip, resolveDependencies());
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[analyze-company] unexpected failure", err);
    return NextResponse.json({ error: "Internal error while analyzing company." }, {
      status: 500,
    });
  }
}

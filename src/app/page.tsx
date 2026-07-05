"use client";

import { useState } from "react";
import { BriefView } from "@/components/firmascope/BriefView";
import { DemoNotice } from "@/components/firmascope/DemoNotice";
import { Hero } from "@/components/firmascope/Hero";
import { NipForm } from "@/components/firmascope/NipForm";
import { TracePanel } from "@/components/firmascope/TracePanel";
import type { CompanyBrief, TraceEvent } from "@/lib/firmascope/types";

interface AnalyzeState {
  status: "idle" | "loading" | "error" | "done";
  error?: string;
  trace?: TraceEvent[];
  brief?: CompanyBrief;
}

export default function Home() {
  const [state, setState] = useState<AnalyzeState>({ status: "idle" });

  async function analyze(nip: string) {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/analyze-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip }),
      });
      const body = await res.json();
      if (!res.ok) {
        setState({ status: "error", error: body?.error ?? "Request failed." });
        return;
      }
      setState({ status: "done", trace: body.trace, brief: body.brief });
    } catch {
      setState({ status: "error", error: "Could not reach the analysis service." });
    }
  }

  return (
    <div className="relative z-10 flex flex-1 justify-center bg-paper">
      <main className="w-full max-w-4xl px-5 py-12 sm:px-8">
        <Hero />
        <div className="mt-6">
          <DemoNotice />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,320px)_1fr]">
          <NipForm onSubmit={analyze} disabled={state.status === "loading"} />

          <div className="space-y-6">
            <TracePanel trace={state.trace} pending={state.status === "loading"} />

            {state.status === "error" && (
              <p className="animate-rise-in border border-oxblood/40 bg-oxblood/[0.06] p-4 font-mono text-[13px] text-oxblood">
                {state.error}
              </p>
            )}

            {state.status === "done" && state.brief && <BriefView brief={state.brief} />}

            {state.status === "idle" && (
              <p className="font-mono text-[12px] text-ink-faint">
                No case file open yet — enter a NIP or pick a sample.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

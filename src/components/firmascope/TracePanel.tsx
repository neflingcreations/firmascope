import type { TraceEvent } from "@/lib/firmascope/types";

const PENDING_STEPS = ["Validate NIP", "Registry lookup", "Generate brief", "Validate guards"];

const STATUS_ICON: Record<TraceEvent["status"], string> = {
  ok: "✓",
  warning: "△",
  error: "✕",
};

const STATUS_COLOR: Record<TraceEvent["status"], string> = {
  ok: "text-forest border-forest/40",
  warning: "text-gold border-gold/40",
  error: "text-oxblood border-oxblood/40",
};

export function TracePanel({ trace, pending }: { trace?: TraceEvent[]; pending: boolean }) {
  if (!pending && !trace) return null;

  return (
    <div className="border border-paper-line bg-ink/[0.03] p-4 font-mono text-[12px]">
      <p className="mb-3 uppercase tracking-[0.2em] text-ink-faint">Audit trail</p>
      <ol className="space-y-2">
        {pending
          ? PENDING_STEPS.map((label, i) => (
              <li
                key={label}
                className="animate-scan-pulse flex items-center gap-3 border-l-2 border-ink-faint/40 pl-3"
                style={{ animationDelay: `${i * 180}ms` }}
              >
                <span className="text-ink-faint">…</span>
                <span className="text-ink-soft">{label}</span>
                <span className="animate-caret-blink text-ink-faint">▊</span>
              </li>
            ))
          : trace!.map((event, i) => (
              <li
                key={event.step}
                className={`animate-rise-in flex items-center gap-3 border-l-2 pl-3 ${STATUS_COLOR[event.status]}`}
                style={{ animationDelay: `${i * 110}ms` }}
              >
                <span>{STATUS_ICON[event.status]}</span>
                <span className="text-ink-soft">{event.label}</span>
                {event.toolCallId && (
                  <span className="truncate text-ink-faint">{event.toolCallId}</span>
                )}
              </li>
            ))}
      </ol>
    </div>
  );
}

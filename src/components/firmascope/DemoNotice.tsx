export function DemoNotice() {
  return (
    <div className="flex items-center gap-3 border-y border-dashed border-paper-line py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
      <span aria-hidden>✂</span>
      <span>
        Demo mode — committed fixture data and pre-recorded model output, zero live calls.
      </span>
    </div>
  );
}

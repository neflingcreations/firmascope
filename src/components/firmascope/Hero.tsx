export function Hero() {
  return (
    <header className="relative border-b border-paper-line pb-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h1 className="font-display text-[2.75rem] font-black leading-none tracking-tight text-ink sm:text-[3.5rem]">
          FirmaScope
        </h1>
        <span className="-rotate-2 border-2 border-oxblood px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-oxblood">
          Case file open
        </span>
      </div>
      <p className="mt-4 max-w-2xl font-body text-lg leading-relaxed text-ink-soft">
        A due-diligence assistant for Polish companies. Enter a NIP and it assembles a
        registry summary and risk signals from VAT whitelist data — every claim cited,
        manual review recommended where the record is thin.
      </p>
      <a
        href="https://github.com/neflingcreations/PBI-MCP"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block font-mono text-[12px] text-ink-faint underline decoration-dotted underline-offset-4 hover:text-oxblood"
      >
        Built on the PBI-MCP registry integration →
      </a>
    </header>
  );
}

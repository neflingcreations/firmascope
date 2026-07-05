import type { Claim, CompanyBrief, RiskSignal } from "@/lib/firmascope/types";
import { CitationPanel, citationNumberMap } from "./CitationPanel";
import { VerdictStamp } from "./VerdictStamp";

function CitationMarks({
  citationIds,
  numberOf,
}: {
  citationIds: string[];
  numberOf: Map<string, number>;
}) {
  if (citationIds.length === 0) return null;
  return (
    <sup className="ml-0.5 space-x-0.5 font-mono text-[10px] text-oxblood">
      {citationIds.map((id) => (
        <a key={id} href={`#citation-${id}`} className="hover:underline">
          [{numberOf.get(id) ?? "?"}]
        </a>
      ))}
    </sup>
  );
}

const RISK_ICON: Record<RiskSignal["level"], string> = {
  info: "●",
  warning: "▲",
  unknown: "?",
};

const RISK_COLOR: Record<RiskSignal["level"], string> = {
  info: "text-forest",
  warning: "text-oxblood",
  unknown: "text-charcoal",
};

export function BriefView({ brief }: { brief: CompanyBrief }) {
  const numberOf = citationNumberMap(brief.citations);

  return (
    <article className="animate-rise-in rounded-sm border border-paper-line bg-paper-raised/60 p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-line pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Case file · NIP {brief.input.nip}
          </p>
          <p className="mt-2 max-w-xl font-body text-lg italic leading-relaxed text-ink-soft">
            &ldquo;{brief.summary}&rdquo;
          </p>
        </div>
        <VerdictStamp verdict={brief.verdict} />
      </header>

      {brief.registryFacts.length > 0 && (
        <section className="mt-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Registry facts
          </h3>
          <dl className="rule-line mt-2">
            {brief.registryFacts.map((fact: Claim, i) => (
              <div key={i} className="flex gap-3 py-[6px] text-[14px] leading-[27px]">
                <span aria-hidden className="text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  {fact.text}
                  <CitationMarks citationIds={fact.citationIds} numberOf={numberOf} />
                </span>
              </div>
            ))}
          </dl>
        </section>
      )}

      {brief.riskSignals.length > 0 && (
        <section className="mt-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Risk signals
          </h3>
          <ul className="mt-2 space-y-2">
            {brief.riskSignals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed">
                <span aria-hidden className={`mt-[3px] font-mono text-[11px] ${RISK_COLOR[signal.level]}`}>
                  {RISK_ICON[signal.level]}
                </span>
                <span>
                  {signal.text}
                  <CitationMarks citationIds={signal.citationIds} numberOf={numberOf} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief.unknowns.length > 0 && (
        <section className="mt-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Unknown / not on file
          </h3>
          <ul className="mt-2 space-y-1.5">
            {brief.unknowns.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-ink-soft">
                <span
                  aria-hidden
                  className="mt-[7px] h-[3px] w-4 shrink-0 rounded-sm bg-ink-faint/60"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 border-t border-dashed border-paper-line pt-4 text-[12px] leading-relaxed text-ink-faint">
        {brief.disclaimer}
      </p>

      <div className="mt-6">
        <CitationPanel citations={brief.citations} />
      </div>
    </article>
  );
}

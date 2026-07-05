import type { Citation } from "@/lib/firmascope/types";

export function citationNumberMap(citations: Citation[]): Map<string, number> {
  return new Map(citations.map((citation, index) => [citation.id, index + 1]));
}

export function CitationPanel({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  const numberOf = citationNumberMap(citations);

  return (
    <section className="animate-rise-in border-t border-dashed border-paper-line pt-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        Source ledger
      </h3>
      <ol className="mt-3 space-y-2">
        {citations.map((citation) => (
          <li
            key={citation.id}
            id={`citation-${citation.id}`}
            className="scroll-mt-8 font-mono text-[12px] leading-relaxed text-ink-soft"
          >
            <span className="text-ink">[{numberOf.get(citation.id)}]</span>{" "}
            {citation.sourceName}
            {citation.sourceType === "fixture" && (
              <span className="ml-1 rounded-sm bg-paper-raised px-1 py-0.5 text-[10px] text-charcoal">
                fixture
              </span>
            )}
            <span className="text-ink-faint">
              {" "}
              — retrieved {new Date(citation.retrievedAt).toISOString().slice(0, 19)}Z
            </span>
            {citation.rawPath && (
              <>
                <br />
                <span className="text-ink-faint">{citation.rawPath}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

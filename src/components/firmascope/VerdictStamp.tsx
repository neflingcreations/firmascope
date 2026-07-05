import type { CompanyBrief } from "@/lib/firmascope/types";

const VERDICT_COPY: Record<CompanyBrief["verdict"], { label: string; colorVar: string }> = {
  low_risk: { label: "Low Risk", colorVar: "var(--forest)" },
  needs_manual_review: { label: "Manual Review Recommended", colorVar: "var(--oxblood)" },
  insufficient_data: { label: "Insufficient Data", colorVar: "var(--charcoal)" },
};

export function VerdictStamp({ verdict }: { verdict: CompanyBrief["verdict"] }) {
  const { label, colorVar } = VERDICT_COPY[verdict];

  return (
    <div
      className="animate-stamp-in inline-flex shrink-0 -rotate-6 select-none items-center gap-2 rounded-sm border-[3px] px-4 py-2 font-display text-sm font-bold uppercase tracking-[0.12em]"
      style={{ borderColor: colorVar, color: colorVar }}
    >
      <span aria-hidden className="text-lg leading-none">
        ⬥
      </span>
      {label}
    </div>
  );
}

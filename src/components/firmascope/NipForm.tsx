"use client";

import { useState } from "react";
import { validateNip } from "@/lib/firmascope/nip";

interface Sample {
  nip: string;
  label: string;
  outcome: string;
  dot: string;
}

const SAMPLES: Sample[] = [
  { nip: "9512381607", label: "Active VAT payer", outcome: "low risk", dot: "bg-forest" },
  { nip: "3210049379", label: "Partial registry record", outcome: "insufficient data", dot: "bg-gold" },
  { nip: "5252344078", label: "Malformed registry response", outcome: "insufficient data", dot: "bg-charcoal" },
  { nip: "5260250274", label: "Not on the whitelist", outcome: "insufficient data", dot: "bg-ink-faint" },
];

export function NipForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (nip: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  const validation = validateNip(value);
  const showError = touched && value.length > 0 && !validation.valid;

  function submit(nip: string) {
    const result = validateNip(nip);
    if (!result.valid) {
      setTouched(true);
      return;
    }
    onSubmit(result.nip);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="space-y-2"
      >
        <label htmlFor="nip" className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          NIP (10 digits)
        </label>
        <div className="flex gap-2">
          <input
            id="nip"
            name="nip"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="000-000-00-00"
            className="w-full min-w-0 border border-paper-line bg-paper px-3 py-2 font-mono text-sm text-ink outline-none focus:border-oxblood disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || value.length === 0}
            className="shrink-0 border-[3px] border-ink px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            Open file
          </button>
        </div>
        {showError && (
          <p className="font-mono text-[12px] text-oxblood">
            {validation.valid ? "" : nipErrorCopy(validation.error)}
          </p>
        )}
      </form>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Sample case files
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample.nip}
              type="button"
              disabled={disabled}
              onClick={() => {
                setValue(sample.nip);
                setTouched(true);
                submit(sample.nip);
              }}
              className="group flex items-center gap-2 border border-paper-line bg-paper px-3 py-2 text-left transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${sample.dot}`} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-ink">{sample.label}</span>
                <span className="block font-mono text-[11px] text-ink-faint">
                  {sample.nip} · {sample.outcome}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function nipErrorCopy(error: "empty" | "invalid_length" | "invalid_characters" | "invalid_checksum") {
  switch (error) {
    case "empty":
      return "Enter a NIP to open a case file.";
    case "invalid_length":
      return "A NIP is 10 digits.";
    case "invalid_characters":
      return "A NIP contains digits only.";
    case "invalid_checksum":
      return "That NIP fails the checksum — check for a typo.";
  }
}

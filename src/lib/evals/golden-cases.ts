import type { CompanyBrief } from "@/lib/firmascope/types";

export interface GoldenCase {
  id: string;
  description: string;
  /** Raw NIP input, exactly as a user might type it. */
  nip: string;
  /** True when the case's registry data is genuinely incomplete or absent — the brief must surface `unknowns`. */
  expectMissingData: boolean;
  /** Verdicts considered a reasonable outcome for this case's data. */
  expectedVerdicts: CompanyBrief["verdict"][];
}

// Dev-plan Phase 9 asks for >=8: active company, not found, partial, malformed,
// 2 invalid inputs, 2 more realistic actives. A 9th case is added on top of the
// spec floor — every other case only ever resolves to "low_risk" or
// "insufficient_data", so `verdict_reasonable` never exercised the third verdict
// branch, "needs_manual_review". NIPs match fixtures/vat-whitelist/.
export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: "active-known",
    description: "Known active company with rich registry data (Booksy fixture).",
    nip: "9512381607",
    expectMissingData: false,
    expectedVerdicts: ["low_risk"],
  },
  {
    id: "active-limited-company",
    description: "Realistic active limited company (sp. z o.o.) with a representative on record.",
    nip: "6555208280",
    expectMissingData: false,
    expectedVerdicts: ["low_risk"],
  },
  {
    id: "active-sole-trader",
    description: "Realistic active sole trader (JDG), no KRS by design.",
    nip: "3005590982",
    expectMissingData: false,
    expectedVerdicts: ["low_risk"],
  },
  {
    id: "restored-after-removal",
    description: "Active VAT status but registry shows a past removal/restoration event.",
    nip: "5631410744",
    expectMissingData: false,
    expectedVerdicts: ["needs_manual_review"],
  },
  {
    id: "partial-data",
    description: "Active VAT status but multiple registry fields missing.",
    nip: "3210049379",
    expectMissingData: true,
    expectedVerdicts: ["insufficient_data", "needs_manual_review"],
  },
  {
    id: "not-found",
    description: "NIP with no VAT whitelist entry.",
    nip: "5260250274",
    expectMissingData: true,
    expectedVerdicts: ["insufficient_data"],
  },
  {
    id: "malformed-registry-response",
    description: "Registry returns a response that doesn't match the expected shape.",
    nip: "5252344078",
    expectMissingData: true,
    expectedVerdicts: ["insufficient_data"],
  },
  {
    id: "invalid-checksum",
    description: "Syntactically valid NIP with an incorrect checksum digit.",
    nip: "1234567890",
    expectMissingData: true,
    expectedVerdicts: ["insufficient_data"],
  },
  {
    id: "invalid-format",
    description: "Non-numeric input that fails NIP format validation.",
    nip: "ABCDEFGHIJ",
    expectMissingData: true,
    expectedVerdicts: ["insufficient_data"],
  },
];

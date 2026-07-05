const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

export type NipValidationError =
  | "empty"
  | "invalid_length"
  | "invalid_characters"
  | "invalid_checksum";

export type NipValidationResult =
  | { valid: true; nip: string }
  | { valid: false; error: NipValidationError };

function stripFormatting(input: string): string {
  return input.replace(/[\s-]/g, "");
}

function computeChecksumDigit(digits: number[]): number {
  const sum = NIP_WEIGHTS.reduce((acc, weight, i) => acc + weight * digits[i], 0);
  return sum % 11;
}

export function validateNip(input: string): NipValidationResult {
  const stripped = stripFormatting(input ?? "");

  if (stripped.length === 0) {
    return { valid: false, error: "empty" };
  }

  if (stripped.length !== 10) {
    return { valid: false, error: "invalid_length" };
  }

  if (!/^\d{10}$/.test(stripped)) {
    return { valid: false, error: "invalid_characters" };
  }

  const digits = stripped.split("").map(Number);
  const checksum = computeChecksumDigit(digits);

  if (checksum === 10 || checksum !== digits[9]) {
    return { valid: false, error: "invalid_checksum" };
  }

  return { valid: true, nip: stripped };
}

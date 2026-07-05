import { describe, expect, it } from "vitest";
import { validateNip } from "@/lib/firmascope/nip";

describe("validateNip", () => {
  it("accepts a valid NIP", () => {
    expect(validateNip("5260250274")).toEqual({ valid: true, nip: "5260250274" });
  });

  it("normalizes a dashed NIP", () => {
    expect(validateNip("526-025-02-74")).toEqual({ valid: true, nip: "5260250274" });
  });

  it("normalizes a spaced NIP", () => {
    expect(validateNip("526 025 02 74")).toEqual({ valid: true, nip: "5260250274" });
  });

  it("rejects empty input", () => {
    expect(validateNip("")).toEqual({ valid: false, error: "empty" });
  });

  it("rejects the wrong length", () => {
    expect(validateNip("123456789")).toEqual({ valid: false, error: "invalid_length" });
    expect(validateNip("12345678901")).toEqual({ valid: false, error: "invalid_length" });
  });

  it("rejects non-digit characters", () => {
    expect(validateNip("52602502AB")).toEqual({ valid: false, error: "invalid_characters" });
  });

  it("rejects a bad checksum", () => {
    expect(validateNip("1234567890")).toEqual({ valid: false, error: "invalid_checksum" });
  });
});

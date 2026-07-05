import { describe, expect, it } from "vitest";
import { allClaimCitationsResolve, buildCitationFromLookup } from "@/lib/firmascope/citations";
import type { RegistryLookupResult } from "@/lib/firmascope/types";

const foundLookup: RegistryLookupResult = {
  status: "found",
  subject: {
    name: "TEST SP. Z O.O.",
    nip: "9512381607",
    statusVat: "Czynny",
    regon: null,
    pesel: null,
    krs: null,
    residenceAddress: null,
    workingAddress: null,
    representatives: [],
    authorizedClerks: [],
    partners: [],
    registrationLegalDate: null,
    registrationDenialBasis: null,
    registrationDenialDate: null,
    restorationBasis: null,
    restorationDate: null,
    removalBasis: null,
    removalDate: null,
    exemptionSmeDate: null,
    accountNumbers: [],
    hasVirtualAccounts: false,
  },
  toolCallId: "call-1",
  sourceName: "VAT whitelist (fixture)",
  sourceType: "fixture",
  retrievedAt: "2026-07-05T00:00:00.000Z",
  rawPath: "fixtures/vat-whitelist/known-active-company.json",
};

describe("buildCitationFromLookup", () => {
  it("carries the lookup metadata onto the citation", () => {
    const citation = buildCitationFromLookup("c1", foundLookup);
    expect(citation).toEqual({
      id: "c1",
      toolCallId: "call-1",
      sourceName: "VAT whitelist (fixture)",
      sourceType: "fixture",
      retrievedAt: "2026-07-05T00:00:00.000Z",
      rawPath: "fixtures/vat-whitelist/known-active-company.json",
    });
  });
});

describe("allClaimCitationsResolve", () => {
  const citations = [buildCitationFromLookup("c1", foundLookup)];

  it("is true when every claim's citationIds exist in citations", () => {
    expect(allClaimCitationsResolve([{ text: "fact", citationIds: ["c1"] }], citations)).toBe(
      true,
    );
  });

  it("is false when a claim cites an unknown id", () => {
    expect(allClaimCitationsResolve([{ text: "fact", citationIds: ["c2"] }], citations)).toBe(
      false,
    );
  });

  it("is true for an empty claim list", () => {
    expect(allClaimCitationsResolve([], citations)).toBe(true);
  });
});

import type { Citation, Claim, RegistryLookupResult } from "./types";

export function buildCitationFromLookup(
  citationId: string,
  lookup: RegistryLookupResult,
): Citation {
  return {
    id: citationId,
    toolCallId: lookup.toolCallId,
    sourceName: lookup.sourceName,
    sourceType: lookup.sourceType,
    retrievedAt: lookup.retrievedAt,
    rawPath: lookup.rawPath,
  };
}

export function allClaimCitationsResolve(claims: Claim[], citations: Citation[]): boolean {
  const knownIds = new Set(citations.map((citation) => citation.id));
  return claims.every((claim) => claim.citationIds.every((id) => knownIds.has(id)));
}

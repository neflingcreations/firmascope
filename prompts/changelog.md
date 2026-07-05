# Prompt changelog

## v1 (`company-brief.v1.md`) — 2026-07-05

First version. Establishes the grounding rules (only the provided registry
JSON, one citation id per fact/risk signal, unknowns for missing fields, no
invented facts), the forbidden/preferred wording lists from dev-plan §12,
the exact output shape (field names matching `CompanyBriefSchema` verbatim),
and one few-shot example (an active, fully-populated company) to anchor
the model's tone and JSON structure before any live runs.

Not yet iterated against real model output — first live run is the test
for this version.

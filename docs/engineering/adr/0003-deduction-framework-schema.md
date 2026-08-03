# ADR 0003 — Deduction Framework: Evidence Connection, Not Multiple Choice

Status: Approved (Phase 1).

## Decision

The core investigation mechanic is **evidence connection**: the player
selects two or more collected evidence items and submits them; the
`DeductionFramework` checks the selection against a `DeductionDefinition`
(`src/engine/types.ts`):

```ts
interface DeductionDefinition {
  requiredEvidenceIds: string[];        // must all be present
  optionalSupportingEvidenceIds: string[]; // allowed, not required
  conclusionText: string;               // shown on success
  hintStages: { stage: number; text: string }[]; // escalating hints on failure
  successActions: {
    setFlags?, journalUpdates?, unlockSceneIds?
  };
  failureFeedbackText: string;
  unlockConditions?: UnlockCondition[]; // when the deduction becomes available at all
}
```

A submission succeeds when every `requiredEvidenceIds` entry is present,
no evidence outside `required`/`optional` is included, and at least two
items were selected. See `DeductionFramework.attempt()`.

## Rationale

This directly implements the approved design decision: "the player
selects two or more evidence items that support a conclusion," not a
multiple-choice list of conclusions. Modeling `requiredEvidenceIds` /
`optionalSupportingEvidenceIds` separately (rather than one flat list)
lets content authors mark some evidence as flavor/reinforcement without
making it mandatory for success.

## Failure is never a fail state

`DeductionFramework.attempt()` never blocks retrying. A failed attempt:

1. Increments a per-deduction hint stage in `GameState`
   (`recordDeductionAttempt`).
2. Returns the hint text for that stage (`hintStages[hintStage]`,
   falling back to `failureFeedbackText`).
3. Leaves all collected evidence intact — nothing is lost or reset.

The default/first hint across the vertical slice content is literally
"Interesting. Show me what supports that conclusion." — the
Ashcombe-philosophy line specified in the approved plan — so failure
always reads as an invitation to keep investigating, never a penalty.

## Consequences

- Content authors must list every valid evidence ID (required + optional)
  for a deduction; DeductionFramework treats anything else in the
  selection as an automatic failure. This is intentional — it prevents a
  deduction from "accidentally" succeeding via evidence nobody intended
  to be relevant.
- The "at least two items" rule is enforced in code
  (`selectedEvidenceIds.length >= 2`), not just in content — a
  single-required-evidence deduction is not currently expressible. If a
  future design genuinely needs a one-evidence "aha" moment, that's a
  scope change to this ADR, not a content workaround.

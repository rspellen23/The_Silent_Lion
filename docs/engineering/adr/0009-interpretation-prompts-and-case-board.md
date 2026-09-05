# ADR 0009 — Interpretation Prompts, Case Board, and Pensieve Scenes

Status: Approved. Added while beginning implementation from the full
locked Story Bible
(`docs/Harry_Potter_and_the_Silent_Lion_Complete_Story_Bible_ULTIMATE_FINAL.docx`),
which specifies several mechanics not covered by the Phase 1 vertical
slice's `DeductionFramework`/`FragmentSystem`.

## Problem

The Story Bible uses two mechanically distinct "deduction" moments:

1. **Fragment-connection deductions** (already built): select two or
   more collected fragments that together support a conclusion (e.g. the
   Chapter 39 final accusation). This is `DeductionFramework`.
2. **Interpretation quizzes**: a single-select "what does this mean"
   choice among plausible options — e.g. Chapter 9's "Secrecy / Warning /
   Restraint," Chapter 28's "Attack / Destroy / Warn / Restrain." These
   aren't about connecting evidence; they're about picking the correct
   reading of something already known. Modeling them as a
   `DeductionDefinition` with `requiredFragmentIds` of length 1 wouldn't
   work — `DeductionFramework.attempt()` requires 2+ selections by design
   (per ADR 0003, an intentional rule, not an oversight) and the whole
   selection/toggle UI is the wrong shape for a single pick among options.

Separately, the Story Bible's investigation structure (Ch 19–26, the
Gideon false-solution arc) builds a **persistent, multi-chapter
suspect board** — presence/opportunity/motive/concealment connections
accumulated over many chapters and presented at a confrontation. This is
a different lifetime and shape than a single `DeductionDefinition`.

Finally, Pensieve/memory scenes (Ch 32, Ch 38) are non-interactive
flashback conversations with no hotspots — the existing `SceneManager`
had no way to start a conversation automatically on scene entry.

## Decision

1. **`InterpretationPromptDefinition` + `InterpretationPromptSystem`**
   (`src/engine/interpretation/`): a prompt with `options[]` and a single
   `correctOptionId`. `attempt()` returns success/failure and applies
   `successActions` (flags, journal updates, fragment grants) on a
   correct pick. A wrong pick returns `failureText` and allows retry —
   never a fail state, matching the fair-play principle. New hotspot
   effect `trigger_interpretation_prompt`; new `UnlockCondition` variant
   `interpretation_completed`.
2. **`CaseBoardConnectionDefinition` + `CaseBoardSystem`**
   (`src/engine/caseboard/`): a *pure presentation layer*, not a new
   persisted data model. Each connection has a `subjectId` (the suspect),
   a `category` (`presence`/`opportunity`/`motive`/`concealment`/
   `contradiction`), and `unlockConditions`. `CaseBoardSystem` derives
   which connections are currently visible per subject by evaluating
   `conditionsMet()` against existing `GameState` — the same mechanism
   hotspots and dialogue choices already use. No new save-schema field
   was needed for this piece.
3. **Pensieve/memory scenes**: `SceneDefinition.autoStartConversationId`
   starts a conversation immediately in `SceneManager.goTo()`, and
   `SceneDefinition.isMemory` applies a bluish tint in
   `BackgroundManager.render()` (a `Phaser.GameObjects.Image.setTint()`
   call — purely visual, no new asset dependency).

## Consequences

- `GameStateSnapshot` gained `completedPromptIds: string[]`, bumping
  `SAVE_SCHEMA_VERSION` to 3 with a `migrateV2ToV3` migration (an empty
  list — no prior save ever had prompts to backfill). This is the second
  version bump since ADR 0004 and confirms the migration chain pattern
  scales past one hop.
- The Case Board intentionally stores nothing new — if a future need
  arises to explicitly "collapse" a suspect's board (the Gideon theory
  falling apart is currently just narrated in dialogue, not visually
  removed from the board), that would need a real design decision, not
  just another `unlockConditions` clause. Flagged for later, not solved
  here.
- Many other Story Bible "minigames" (Peeves' rhyme completion, Rowena's
  three-books test, fact/assumption sorting, evidence comparison) do
  **not** get dedicated systems — they're implemented as ordinary
  `DialogueChoice` sequences or hotspot content. This was a deliberate
  scope decision to avoid building bespoke UI for content that the
  existing dialogue/hotspot model already expresses faithfully.

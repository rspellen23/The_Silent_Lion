# Content Schema Reference

The authoritative schema is `src/engine/types.ts` — this file is a map to
it, not a duplicate. If this document and `types.ts` ever disagree,
`types.ts` wins (it's what the engine actually validates against via
TypeScript).

| Content file(s) | Type | Notes |
|---|---|---|
| `characters.json` | `CharacterDefinition[]` | One entry per character; `expressions[]` maps expression IDs to portrait asset IDs. |
| `scenes.json` | `SceneDefinition[]` | Each scene has one or more `visualStates` (background + hotspots that vary, e.g. "before/after a mural is damaged") and a `hotspots[]` list. |
| `dialogue/*.json` | `ConversationDefinition` (one file per conversation) | `lines[]` form a graph via `nextLineId`/`choices[].nextLineId`, not necessarily a flat sequence. |
| `evidence.json` | `EvidenceDefinition[]` | Referenced by ID from hotspot effects, dialogue rewards, and deductions. |
| `journalEntries.json` | `JournalEntryDefinition[]` | `stages[]` must include authored text for every stage (`0`/`1`/`2`) a piece of content will ever unlock — `InsightJournal.advanceStage()` throws if asked to unlock a stage with no text. |
| `deductions.json` | `DeductionDefinition[]` | See `docs/engineering/adr/0003-deduction-framework-schema.md`. |
| `placeholderAssets.json` | `PlaceholderTextureSpec[]` (Phase 1 only) | Maps an asset ID to a generated placeholder texture's size/color/label. Not part of the story-content schema — this is scaffolding, replaced entirely when final art arrives (see ADR 0005). |

## Hotspot effects

`Hotspot.effects: HotspotEffect[]` — a hotspot can fire multiple effects
in order. `HotspotEffectType` values and what `targetId` means for each:

| type | `targetId` means | notes |
|---|---|---|
| `reveal_observation` | (unused) | uses `effect.text` instead |
| `add_evidence` | an `EvidenceDefinition.id` | |
| `start_conversation` | a `ConversationDefinition.id` | |
| `update_journal` | a `JournalEntryDefinition.id` | also requires `effect.journalStage` |
| `unlock_scene` | a `SceneDefinition.id` | |
| `change_visual_state` | a `SceneVisualState.id` (within the current scene) | |
| `trigger_deduction` | a `DeductionDefinition.id` | opens the deduction UI; does not require evidence to already be selected |

## Unlock conditions

`UnlockCondition` (used by hotspots, dialogue choices, and deductions) is
a discriminated union — `flag`, `evidence_collected`, `journal_stage`
(passes once *any* unlocked stage is `>=` the given minimum), or
`deduction_completed`. A condition list is always AND'd together
(`conditionsMet()` in `src/engine/conditions.ts`); there is no OR — model
alternative unlock paths as separate hotspots/choices if needed.

## Placeholder labeling convention

Every content definition type has a `placeholder: boolean` field. Phase 1
vertical-slice content sets it to `true` everywhere and prefixes all
player-visible text with `[PLACEHOLDER ...]` tags (e.g.
`[PLACEHOLDER DIALOGUE]`, `[PLACEHOLDER OBSERVATION]`). DOM UI components
render a visible "Placeholder" badge whenever `placeholder: true`. When
real content replaces a placeholder entry, set `placeholder: false` and
remove the bracketed tags — the badge disappears automatically.

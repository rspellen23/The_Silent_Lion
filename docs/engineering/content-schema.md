# Content Schema Reference

The authoritative schema is `src/engine/types.ts` — this file is a map to
it, not a duplicate. If this document and `types.ts` ever disagree,
`types.ts` wins (it's what the engine actually validates against via
TypeScript).

| Content path | Type | Notes |
|---|---|---|
| `characters.json` | `CharacterDefinition[]` | One entry per character; `expressions[]` maps expression IDs to portrait asset IDs. |
| `scenes/*.json` | `SceneDefinition` (one file per scene) | Auto-loaded (see `adr/0008`). Each scene has one or more `visualStates` (background + hotspots that vary, e.g. "before/after a mural is damaged") and a `hotspots[]` list. |
| `dialogue/*.json` | `ConversationDefinition` (one file per conversation) | `lines[]` form a graph via `nextLineId`/`choices[].nextLineId`, not necessarily a flat sequence. |
| `fragments.json` | `FragmentDefinition[]` | Player-facing name: Fragment (formerly "Evidence" — see `adr/0006`). Referenced by ID from hotspot effects, dialogue rewards, and deductions. |
| `journalEntries.json` | `JournalEntryDefinition[]` | `stages[]` must include authored text for every stage (`0`/`1`/`2`) a piece of content will ever unlock — `InsightJournal.advanceStage()` throws if asked to unlock a stage with no text. |
| `deductions.json` | `DeductionDefinition[]` | See `adr/0003-deduction-framework-schema.md` for the mechanic; field names there are historical — current fields are `requiredFragmentIds`/`optionalSupportingFragmentIds` per `adr/0006`. |
| `interpretationPrompts.json` | `InterpretationPromptDefinition[]` | Single-select "what does this mean" quizzes, distinct from `deductions.json`'s fragment-connection mechanic. See `adr/0009`. |
| `caseBoardConnections.json` | `CaseBoardConnectionDefinition[]` | Per-suspect (`subjectId`) presence/opportunity/motive/concealment/contradiction entries, gated by `unlockConditions`. Pure presentation over existing state — see `adr/0009`. |
| `gameConfig.json` | `{ startSceneId: string }` | The scene "New Game" opens. See `adr/0007`. |
| `placeholderAssets.json` | `PlaceholderTextureSpec[]` (Phase 1 only) | Maps an asset ID to a generated placeholder texture's size/color/label. Not part of the story-content schema — this is scaffolding, replaced entirely when final art arrives (see `adr/0005`). |

## Fragments (`adr/0006-fragment-system.md`)

`FragmentDefinition.presentation` (`card` / `document` / `photograph` /
`artifact` / `testimony` / `behavioral`) determines how
`FragmentInventoryUI`/`read_fragment` display it. Only
`presentation: 'document'` uses `documentBody` (Markdown, rendered by
`DocumentReaderUI`'s minimal renderer — headings, paragraphs,
bold/italic, line breaks only). `category` (`physical` / `testimonial` /
`historical` / `behavioral` / `reflective`) is a separate, optional,
narrative classification field — don't conflate the two.

## Hotspot effects

`Hotspot.effects: HotspotEffect[]` — a hotspot can fire multiple effects
in order. `HotspotEffectType` values and what `targetId` means for each:

| type | `targetId` means | notes |
|---|---|---|
| `reveal_observation` | (unused) | uses `effect.text` instead |
| `add_fragment` | a `FragmentDefinition.id` | silent collection, no presentation UI opens |
| `read_fragment` | a `FragmentDefinition.id` | collects (if needed) **and** opens the presentation UI immediately |
| `start_conversation` | a `ConversationDefinition.id` | |
| `update_journal` | a `JournalEntryDefinition.id` | also requires `effect.journalStage` |
| `unlock_scene` | a `SceneDefinition.id` | marks reachable; does not navigate there |
| `travel_to_scene` | a `SceneDefinition.id` | unlocks (if needed) **and** navigates there immediately |
| `change_visual_state` | a `SceneVisualState.id` (within the current scene) | |
| `trigger_deduction` | a `DeductionDefinition.id` | opens the deduction UI; does not require fragments to already be selected |
| `trigger_interpretation_prompt` | an `InterpretationPromptDefinition.id` | opens the single-select interpretation quiz UI |
| `set_flag` | (unused) | uses `effect.flag` + `effect.value` instead — parity with the flag-setting already available on dialogue/deduction/prompt effects |

`SceneDefinition.autoStartConversationId` (not a hotspot effect) starts a
conversation immediately when the scene loads — used for Pensieve/memory
scenes, which have no hotspots. `SceneDefinition.isMemory: true` applies
a bluish flashback tint to the background.

## Unlock conditions

`UnlockCondition` (used by hotspots, dialogue choices, deductions, and
interpretation prompts) is a discriminated union — `flag`,
`fragment_collected`, `journal_stage` (passes once *any* unlocked stage is
`>=` the given minimum), `deduction_completed`, or
`interpretation_completed`. A condition list is always AND'd together
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

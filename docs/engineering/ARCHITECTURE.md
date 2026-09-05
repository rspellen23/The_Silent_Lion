# The Silent Lion — Phase 1 Architecture

Status: implemented (vertical slice). Engineering documentation only — no
story, lore, or character content lives here. See `/docs/CLAUDE.md` for
the engineering charter this implements.

## Stack

| Layer | Choice |
|---|---|
| Language | TypeScript (strict) |
| Scene/world rendering | Phaser 3 — backgrounds, hotspots, transitions, sprite (portrait) placement |
| UI | DOM + CSS overlay — dialogue, fragments, journal, deduction, menus, settings |
| Build | Vite |
| Content | JSON (structure) + Markdown (long-form document bodies) under `/src/content`, auto-loaded via `import.meta.glob` |
| Tests | Vitest |
| Persistence | Versioned `localStorage` saves |
| Deployment | Static hosting via Vercel |

Rationale for each choice is recorded in `adr/0001-tech-stack.md`.

## Layer split: Phaser vs. DOM

Phaser owns anything that is "world" — the background image, hotspot hit
areas, scene transitions, and character portrait sprites (portraits are
sprite placement, per the approved stack). The DOM owns anything that is
"UI chrome" — dialogue text/choices, the Insight Journal, the deduction
screen, settings, and the title screen. Neither layer reaches into the
other's DOM/canvas directly; they only communicate through the EventBus
and by one side calling a plain method/callback on the other (e.g.
`DialogueBoxUI` tells `PortraitRenderer` which asset ID to show — it never
touches Phaser).

## Core building blocks

- **EventBus** (`src/engine/EventBus.ts`) — typed pub/sub. Every manager
  communicates through this instead of holding references to each other.
- **GameState** (`src/engine/GameState.ts`) — the single serializable
  source of truth for a playthrough (flags, collected/read fragments,
  journal progress, deduction progress, scene/visual-state, active
  conversation). Pure data; no events, no logic beyond simple invariants
  (e.g. "don't add the same fragment twice").
- **conditions.ts** — evaluates `UnlockCondition[]` (flag / fragment /
  journal-stage / deduction-completed) against `GameState`. Shared by
  hotspot visibility, dialogue choice visibility, and deduction
  availability so "is this unlocked" has one implementation.

## Systems (Phase 1 build list from `docs/CLAUDE.md`)

| System | File | Depends on |
|---|---|---|
| SceneManager | `engine/scene/SceneManager.ts` | GameState, EventBus, BackgroundManager, AudioManager, FragmentSystem, InsightJournal, DeductionFramework, DialogueSystem |
| BackgroundManager | `engine/background/BackgroundManager.ts` | Phaser.Scene only |
| DialogueSystem | `engine/dialogue/DialogueSystem.ts` | GameState, EventBus, FragmentSystem, InsightJournal |
| PortraitManager | `engine/portrait/PortraitManager.ts` | none (pure lookup) |
| PortraitRenderer | `engine/portrait/PortraitRenderer.ts` | Phaser.Scene only |
| AudioManager | `engine/audio/AudioManager.ts` | Phaser.Scene, SettingsManager, EventBus |
| FragmentSystem | `engine/fragment/FragmentSystem.ts` | GameState, EventBus |
| InsightJournal | `engine/journal/InsightJournal.ts` | GameState, EventBus |
| DeductionFramework | `engine/deduction/DeductionFramework.ts` | GameState, EventBus, FragmentSystem, InsightJournal |
| InterpretationPromptSystem | `engine/interpretation/InterpretationPromptSystem.ts` | GameState, EventBus, FragmentSystem, InsightJournal |
| CaseBoardSystem | `engine/caseboard/CaseBoardSystem.ts` | GameState only (pure derived view, no new persisted state) |
| SaveManager | `engine/save/SaveManager.ts` | GameState, EventBus, SettingsManager |
| SettingsManager | `engine/settings/SettingsManager.ts` | EventBus |

See `adr/0006-fragment-system.md` for what a Fragment is and why the
system was renamed from "Evidence." See `adr/0007-scene-navigation.md`
for how `SceneManager.goTo()` gets called beyond the initial scene. See
`adr/0009-interpretation-prompts-and-case-board.md` for why
`InterpretationPromptSystem` is a separate mechanic from
`DeductionFramework`, and for Pensieve/memory scene support
(`SceneDefinition.autoStartConversationId` / `.isMemory`).

**Narrative source of truth**: the full locked script lives in
`docs/Harry_Potter_and_the_Silent_Lion_Complete_Story_Bible_ULTIMATE_FINAL.docx`
— see `docs/CLAUDE.md`'s Source of Truth section. This architecture doc
covers engineering only and is intentionally silent on plot.

SceneManager is the only system that depends on nearly everything else —
it is the orchestrator that routes a hotspot's effects (see
`HotspotEffectType` in `types.ts`) to the right system. Every other system
is independently constructible and independently unit-tested (see
`/tests`).

## Content pipeline

All story data lives under `/src/content`, typed against the interfaces
in `src/engine/types.ts` (`SceneDefinition`, `ConversationDefinition`,
`FragmentDefinition`, `JournalEntryDefinition`, `DeductionDefinition`,
`CharacterDefinition`). `src/content/index.ts` auto-loads everything via
`import.meta.glob` (see `adr/0008-content-auto-loading.md`) — adding a
scene or conversation means adding a JSON file under
`content/scenes/`/`content/dialogue/`, never editing engine or index
code. A document-presentation Fragment's body is Markdown, either inline
in its JSON (`documentBody`) or, for longer pieces, worth considering a
`.md` file loaded the same way if that becomes unwieldy. See
`content-schema.md` for field-by-field notes on each shape.

## Placeholder assets (Phase 1 only)

Per the Phase 1 constraint that Claude must not generate art or final
audio, all Phase 1 assets are generated programmatically at runtime:

- `engine/placeholder/PlaceholderTextureFactory.ts` draws a flat-color
  panel with a dashed border and a baked-in "PLACEHOLDER" + label banner
  onto a Phaser canvas texture, keyed by asset ID.
- `engine/placeholder/PlaceholderAudioFactory.ts` synthesizes a short
  sine-wave beep as a WAV data URI, used only for interface SFX.
- `engine/placeholder/PlaceholderAssetLoader.ts` registers every spec in
  `/src/content/placeholderAssets.json` as a Phaser texture keyed by asset
  ID.

Every engine module (SceneManager, PortraitManager, FragmentSystem, …)
only ever references assets by ID. Swapping placeholder art for final art
means replacing the loader that resolves an asset ID to pixels — nothing
in engine code or content JSON changes. See `adr/0005`.

## Known Phase 1 limitations (deliberate, not oversights)

- No manual bundle splitting yet — Phaser pushes the production bundle
  over Vite's 500kB chunk-size warning threshold. Acceptable for a Phase 1
  vertical slice; revisit in Phase 3 polish if load time becomes a concern.
- Placeholder audio is SFX-only (a single synthesized beep). Music/ambient
  loops are wired in `AudioManager`/`SceneManager` but no placeholder loop
  asset is shipped, to avoid an unpleasant looping tone during
  development; this needs real (or better placeholder) audio before
  Phase 2 content leans on music/ambience.

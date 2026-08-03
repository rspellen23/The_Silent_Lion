# ADR 0002 — Event-Driven, Data-Driven Core

Status: Approved (Phase 1).

## Decision

Every engine manager (SceneManager, DialogueSystem, EvidenceSystem,
InsightJournal, DeductionFramework, SaveManager, SettingsManager,
AudioManager) communicates through a single typed `EventBus`
(`src/engine/EventBus.ts`) instead of holding direct references to one
another. The one exception is `SceneManager`, which is the designated
orchestrator and is allowed to call directly into the other systems'
public methods (e.g. `evidence.collect(id)`), because hotspot effects
require it to actively route data, not just react to it.

`GameState` (`src/engine/GameState.ts`) is a plain, serializable data
store with no event emission and no business logic. It is the only thing
`SaveManager` needs to read/write wholesale.

## Rationale

`docs/CLAUDE.md`'s engineering principles require "modular systems over
hardcoded logic" and content that is entirely external to the engine. An
event bus plus a plain state object gives us:

- Each system is independently unit-testable (see `/tests`) without
  standing up the rest of the engine or Phaser.
- Adding a new reaction to something (e.g. "play a sound when evidence is
  collected") means adding a new listener, not editing `EvidenceSystem`.
- `GameState` being pure data means `SaveManager` never needs to know
  what evidence, journal, or deduction logic looks like — it only
  serializes/deserializes a snapshot.

## Consequences

- Adding a new event requires extending `GameEventMap` in `EventBus.ts`
  (a compile error otherwise) — this is intentional friction to keep the
  event vocabulary typed and discoverable.
- Because `SceneManager` is allowed to call other systems directly, it is
  the one class with broad dependencies (see the table in
  `ARCHITECTURE.md`). Do not add similar direct-call orchestration
  elsewhere — route through events instead, or this ADR needs revisiting.

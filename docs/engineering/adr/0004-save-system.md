# ADR 0004 — Save System

Status: Approved (Phase 1).

## Decision

`SaveManager` (`src/engine/save/SaveManager.ts`) persists a versioned
`SaveGame` object to `localStorage`:

```ts
interface SaveGame {
  schemaVersion: number;      // SAVE_SCHEMA_VERSION, currently 2
  slotId: 'autosave' | 'slot1' | 'slot2' | 'slot3';
  savedAtIso: string;
  sceneTitleAtSave: string;
  state: GameStateSnapshot;   // from GameState.getSnapshot()
  settings: GameSettings;
}
```

- One autosave slot, triggered on `scene:loaded` and `deduction:success`
  (wired in `main.ts`).
- Three manual save slots (`slot1`–`slot3`), triggered from the HUD.
- `getMostRecentSave()` scans all four slots by `savedAtIso` for the
  title screen's Resume option.
- `resetAllProgress()` clears all four slots (the Settings panel's
  "Reset progress" action). Settings themselves are stored separately
  (`SettingsManager`, key `silentLion:settings`) and are **not** cleared
  by a progress reset — a player's accessibility/audio preferences should
  survive starting over.

## Schema versioning

`load()` (and `getMostRecentSave()`) run every parsed save through
`migrateSaveGame()` (`src/engine/save/migrations.ts`) before touching
`GameState`. `migrateSaveGame` walks a chain of per-version migration
functions (keyed by the version they migrate *from*) up to
`SAVE_SCHEMA_VERSION`, and returns `null` — refuse to load, log a warning
— only if a save's version has no registered migration (too old to have
one, or newer than this build understands). This superseded the original
Phase 1 plan of refusing on any mismatch once the first real schema
change (v1→v2, the Fragment rename in `adr/0006`) actually happened.

**Adding a migration**: when `GameStateSnapshot` changes shape, bump
`SAVE_SCHEMA_VERSION` and add a `MIGRATIONS[oldVersion] = migrateOldToNew`
entry in `migrations.ts` — do not edit `SaveManager.load()` itself.

## Consequences

- Every schema bump requires a migration function to preserve backward
  compatibility; skipping one means saves from that version become
  unloadable (a safe failure — refusal, not corruption — but still a
  worse experience than migrating). This will keep coming up as Phase 2
  content adds new state shapes.
- Save data is plain `JSON.stringify`d GameState — there is no
  compression or encryption. Given saves are local-only and contain no
  sensitive data, this is an intentional simplicity choice, not an
  oversight.

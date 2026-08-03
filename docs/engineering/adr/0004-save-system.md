# ADR 0004 — Save System

Status: Approved (Phase 1).

## Decision

`SaveManager` (`src/engine/save/SaveManager.ts`) persists a versioned
`SaveGame` object to `localStorage`:

```ts
interface SaveGame {
  schemaVersion: number;      // SAVE_SCHEMA_VERSION, currently 1
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

`load()` compares `SaveGame.schemaVersion` against the current
`SAVE_SCHEMA_VERSION` constant and refuses to load (returns `null`,
logs a warning) on a mismatch, rather than attempting to coerce
mismatched data into `GameState`. Phase 1 ships a single schema version,
so there is no migration path yet — that is a known gap, not an oversight.

## Consequences

- **When `GameStateSnapshot`'s shape changes** (new fields, renamed
  fields, changed semantics), `SAVE_SCHEMA_VERSION` must be bumped and a
  migration step added to `SaveManager.load()` before merging, or players
  with an old save will silently lose it (safe failure, but still a bad
  experience). This will very likely be needed once Phase 2 content adds
  new state shapes.
- Save data is plain `JSON.stringify`d GameState — there is no
  compression or encryption. Given saves are local-only and contain no
  sensitive data, this is an intentional simplicity choice, not an
  oversight.

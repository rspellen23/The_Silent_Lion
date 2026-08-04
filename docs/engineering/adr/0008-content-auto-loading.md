# ADR 0008 — Content Auto-Loading and Per-Scene Files

Status: Approved.

## Problem

`docs/CLAUDE.md`'s workflow (merged from the update package) is explicit:
"implement scenes incrementally," content should be droppable "one scene
at a time" without waiting for the full design. The Phase 1 vertical
slice didn't actually support that:

- `scenes.json` was a single array — every scene lived in one growing
  file.
- `src/content/index.ts` hand-imported each dialogue file individually
  (`import convTestIntroJson from './dialogue/conv_test_intro.json'`)
  and hand-assembled the `conversations` array. Adding a scene's
  conversation meant editing this shared file, which is exactly the kind
  of shared-wiring edit the workflow rule is trying to avoid, and which
  gets more collision-prone as more scenes are authored in parallel.

## Decision

- **Scenes split one-per-file** under `src/content/scenes/*.json`
  (e.g. `018_the_covenant.json` — filenames are not meaningful to the
  engine, just to humans; the scene's `id` field is authoritative).
- **`src/content/index.ts` uses Vite's `import.meta.glob(..., { eager: true })`**
  to auto-load every file under `scenes/`, `dialogue/`, `fragments/` (see
  ADR 0006), and the other content directories, instead of listing each
  file by hand. Adding a new scene or conversation file is now sufficient
  by itself — no other file needs to change.
- Fragments, journal entries, deductions, and characters remain flat
  arrays in single files (`fragments.json`, `journalEntries.json`,
  `deductions.json`, `characters.json`) for now — they're catalogs of
  small objects, not scene-sized documents, so the collision/size
  pressure that motivated splitting scenes doesn't apply yet. Revisit
  (split into a directory + glob, same pattern) if any of these grow
  unwieldy.

## Consequences

- `import.meta.glob` resolves at build time; there is no runtime
  file-system scan, so this has no bundle-size or performance cost beyond
  what manually listing the same files would have cost.
- Glob results are not guaranteed to be in a meaningful order — this is
  exactly why ADR 0007 introduced an explicit `startSceneId` instead of
  relying on array position.
- A malformed content file now fails at build/type-check time the same
  way it did before (TypeScript still validates every loaded module
  against the content types) — auto-loading doesn't weaken validation.

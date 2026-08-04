# ADR 0007 — Scene Navigation and Transition Wiring

Status: Approved. Fixes a real gap found while reviewing the update
package: the vertical slice only ever showed one scene, and nothing
actually moved the player between scenes.

## Problem

Two gaps existed in the Phase 1 vertical slice:

1. `DialogueSystem.advance()` already computed a
   `{ ended: true, transitionToSceneId }` result when a conversation's
   final line carried `transitionToSceneId`, but no caller ever read it —
   `DialogueBoxUI` called `dialogue.advance()` and discarded the return
   value. A conversation could never end a scene.
2. `unlock_scene` (a hotspot/deduction effect) only adds a scene ID to
   `GameState.unlockedSceneIds` — it does not navigate there. There was
   no other mechanism to move from one scene to the next.

Both block any multi-scene content (e.g. a linear 018→019→020→021→022
sequence), which the update package's scene outline confirmed is coming.

## Decision

1. **Consume `transitionToSceneId`.** `main.ts` now passes an
   `onSceneTransition(sceneId)` callback into `DialogueBoxUI`, which
   calls it whenever `DialogueSystem.advance()` returns
   `{ ended: true, transitionToSceneId }`. The callback calls
   `sceneManager.goTo(sceneId)`.
2. **New hotspot effect `travel_to_scene`**, distinct from
   `unlock_scene`. `unlock_scene` marks a scene reachable without moving
   the player (e.g. "the door is now unlocked, but you haven't walked
   through it"); `travel_to_scene` unlocks (if not already) **and**
   immediately calls `sceneManager.goTo(targetId)`. A hotspot can combine
   both when appropriate (e.g. an `unlock_scene` earlier in the graph,
   then a `travel_to_scene` "door" hotspot the player actively clicks).
3. **Explicit start scene**, not array order. `src/content/gameConfig.json`
   now holds `{ "startSceneId": "..." }`; `main.ts` reads it instead of
   `scenes[0].id`. This was a latent footgun — adding a new scene at the
   front of the content, or reordering `import.meta.glob` results (see
   ADR 0008), would have silently changed which scene "New Game" opens.

## Consequences

- Content authors must explicitly choose when a scene changes (dialogue
  ending, or a `travel_to_scene` hotspot) — the engine will never
  auto-advance on its own.
- `gameConfig.json` is the first piece of "meta" content (not a scene,
  not a character) — if more global config accumulates, it stays in this
  one file rather than spreading across new top-level content files.

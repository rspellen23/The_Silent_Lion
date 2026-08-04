# The Silent Lion — Project Status

Last updated: 2026-08-03, after the Fragment-system refactor (design update
package: `docs/scenes/SCENES_018_022.md` beat outline + narrative rule
updates now merged into canonical docs).

> **How to use this file**: this is the project dashboard, not a changelog.
> Update it in place at the end of each major milestone (a new
> system landing, a batch of scenes going in, a schema change) — don't
> create a dated copy. Keep it short enough to scan in under a minute.

---

## Engine progress: ~80%

All Phase 1 systems from `docs/CLAUDE.md`'s build order are implemented,
wired end-to-end, unit-tested, and verified in a real browser (see
`docs/engineering/ARCHITECTURE.md`):

- ✅ Scene manager (background + hotspots + visual states)
- ✅ Dialogue system (branching lines/choices, conditions, effects)
- ✅ Scene navigation (`travel_to_scene`, `transitionToSceneId` from
  dialogue) — added this round, was a real gap before
- ✅ Save/load system (versioned, autosave + 3 manual slots, resume,
  reset, **now with a migration chain** so schema bumps don't strand
  saves)
- ✅ Character portrait manager (Phaser sprite layer)
- ✅ Background manager (1920×1080, responsive scale, mouse+touch hotspots)
- ⚠️ Audio manager — built and wired, but only a synthesized placeholder
  SFX beep exists; no music/ambient placeholder loops yet
- ✅ Fragment system (renamed from "Evidence" this round — physical /
  testimonial / historical / behavioral / reflective categories; card /
  document / photograph / artifact / testimony / behavioral
  presentations; read/unread tracking; document reader with a minimal
  Markdown renderer)
- ✅ Insight Journal (Observation → Interpretation → Realization,
  history preserved)
- ✅ Deduction framework (fragment-connection mechanic, escalating
  hints, never a fail state)
- ✅ Settings (text size/speed, high contrast, reduced motion, per-channel
  volume, mute, reset progress)
- ✅ Content pipeline: JSON (+ Markdown for document bodies), one file
  per scene/conversation, auto-loaded via `import.meta.glob` — dropping
  in a new scene file needs no other edits

**What's not done**: presentation types other than `document` all render
identically (a generic card) — `photograph`/`artifact`/`testimony`/
`behavioral` have no distinct visual treatment yet. Bundle isn't
code-split (Phaser pushes it over Vite's 500kB warning). No accessibility
audit beyond the controls existing and being keyboard/screen-reader
reachable.

## Story/narrative progress: ~5%

- Design docs `00`–`05` have real content for the first time (vision,
  director's manifesto, core experience loop, story-bible facts, character
  bible) but are still short — most are a handful of lines per file.
- `docs/scenes/SCENES_018_022.md` is a **beat outline only** for the
  game's ending (scenes 018–022) — not production-ready, explicitly not
  to be implemented yet per the update package's instructions.
- Scenes 001–017 do not exist yet in any form, not even as an outline.

## Scenes implemented: 1 / ~10–12 (target scale)

Only `scene_test_room` — the Phase 1 vertical-slice test scene, entirely
placeholder content (`[PLACEHOLDER]`-tagged, `placeholder: true`
everywhere). Zero production scenes exist.

## Art completed: 0%

All visuals are programmatically generated placeholder textures (flat
color + dashed border + "PLACEHOLDER" label baked in) — per the explicit
Phase 1 constraint that Claude must not generate art. No final art has
been supplied yet.

## Music completed: 0%

No music or ambient audio exists, not even placeholder loops (a looping
placeholder tone was deliberately skipped — see `ARCHITECTURE.md`'s
"Known limitations"). One synthesized SFX beep is the only audio in the
build, used for hotspot-click feedback.

## Outstanding TODOs

- Scenes 001–017 have no content or outline yet — the game's first two
  thirds are entirely unblocked, but unwritten.
- Founders "identified through breadcrumbs, not introductions"
  (`docs/05_CharacterBible.md`) has no engine mechanism yet — flagged as
  an open question during the last review, not yet resolved either way.
- Placeholder audio is SFX-only; music/ambient placeholder loops needed
  before any scene that leans on mood/atmosphere.
- Presentation-specific UI treatment for `photograph`/`artifact`/
  `testimony`/`behavioral` fragments (currently all render as a generic
  card, same as `card` presentation).
- Bundle code-splitting (Phase 3 polish item, not urgent).

## Known technical debt

- Single flat catalog files (`fragments.json`, `journalEntries.json`,
  `deductions.json`, `characters.json`) will need the same
  split-into-directory + glob treatment scenes already got if/when they
  grow large (see `adr/0008`).
- Save migration chain currently only proves itself for v1→v2 (the
  Fragment rename); it hasn't been exercised across a longer chain yet.
- No integration/UI-level automated tests exist — all 53 Vitest tests are
  engine-logic unit tests. Browser verification has been manual
  (Playwright-driven, ad hoc) each round, not part of CI.

## Next recommended task

Get production-ready content for the first scene(s) (likely scene 001,
not 018 — the game needs to be playable from the start, and 018–022 is
the ending). Until that arrives, the highest-value engine work left is
deciding the Founders breadcrumb-identity question, since it's the one
open item likely to affect data structures (would need a design decision
+ probably a small `CharacterDefinition` change) rather than just content
authoring.

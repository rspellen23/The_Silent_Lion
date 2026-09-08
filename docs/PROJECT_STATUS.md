# The Silent Lion — Project Status

Last updated: 2026-09-06, after restyling the title screen around supplied
key art and adding its first real audio (title theme + menu-navigation
SFX). Previous milestone: Act II (Chapters 7–12), which fixed two real
engine bugs uncovered by giving `InterpretationPromptSystem` and
`CaseBoardSystem` their first real content workout.

> **How to use this file**: this is the project dashboard, not a changelog.
> Update it in place at the end of each major milestone (a new
> system landing, a batch of scenes going in, a schema change) — don't
> create a dated copy. Keep it short enough to scan in under a minute.

---

## Engine progress: ~90%

All Phase 1 systems are implemented, wired end-to-end, unit-tested, and
verified in a real browser (see `docs/engineering/ARCHITECTURE.md`):

- ✅ Scene manager, Dialogue system, Fragment system, Insight Journal,
  Deduction framework, Save/load (versioned + migration chain now proven
  across two hops, v1→v2→v3), Settings, Portrait manager/renderer,
  Background manager, Audio manager (SFX only — see below)
- ✅ Interpretation prompts and Case Board — added last round for the full
  Story Bible (`adr/0009`); **Act II is their first real content usage**
  (Chapter 9's library puzzles, the Peeves rhyme, Gideon/Benedict's
  case-board connections), which is what surfaced the hotspot-refresh bug
  below.
- ✅ Pensieve/flashback scene support (`autoStartConversationId`,
  `isMemory` tint) and letter/photograph "present in conversation"
  handoffs (`DialogueLine.presentsFragmentId`)
- ✅ **Fixed two real bugs this round** (both found via a full real-browser
  Playwright playthrough of Prologue → Chapter 12 — the first time that
  full path had ever actually been exercised):
  1. **Hotspots never re-rendered after a flag/fragment/journal/deduction/
     prompt change unless the scene reloaded or the SAME hotspot fired
     the change itself.** `SceneManager.refresh()` existed with a doc
     comment saying to call it after any such change, but nothing ever
     called it. Concretely: after Chapter 2's attendant conversation sets
     `ch2_attendant_done` (a dialogue-line effect, not a hotspot's own
     effect), the "Path to the Castle" hotspot it unlocks never appeared
     on screen — the game was softlocked at Hogsmeade Station for any
     player, not just the test script. Same root cause would have hit
     every flag-gated Act II hotspot sooner or later (the library's
     puzzle-unlock chain, Ashcombe office's revisit hotspots). Fixed by
     wiring `sceneManager.refresh()` in `main.ts` to `flag:set`,
     `fragment:added`, `journal:updated`, `deduction:success`, and
     `prompt:success`.
  2. **`UnlockCondition` flag-equality has no way to express "flag is not
     yet true"** — `GameState.getFlag()` returns `undefined` for an unset
     flag, and `undefined === false` is `false`, so a hotspot gated on
     `{ flag: X, equals: false }` is invisible until X is explicitly set
     to `false` somewhere, which never happens by default. This broke
     Ashcombe office's exit door the moment its `equals: false` gate
     (added this round, to hide the door once the Chapter 11 revisit
     hotspots take over) shipped. Fixed by explicitly initializing that
     one flag to `false` on the Prologue's first line — a pure bookkeeping
     default, no narrative content touched. Only one condition in the
     content currently relies on `equals: false`; worth remembering this
     pattern needs the same explicit-default treatment if it recurs.
- Both were caught and fixed in this round, not shipped — see "Known
  technical debt" for what to watch for if this pattern recurs.

**What's not done**: presentation types other than `document` still
render as a generic card. Bundle isn't code-split. No accessibility audit
beyond controls existing and being keyboard/screen-reader reachable.

## Story/narrative progress: canon complete, ~11% implemented

- **`docs/Harry_Potter_and_the_Silent_Lion_Complete_Story_Bible_ULTIMATE_FINAL.docx`
  is the single locked source of truth** — 45 chapters across 7 Acts plus
  a Prologue, Epilogue, and a post-credits sequel hook.
- The Prologue and all of Acts I–II (Chapters 1–12, of 45) are implemented
  as real playable content — see "Scenes implemented" below. ~27% of the
  chapter count; Act II introduced the game's first interpretation-prompt
  puzzles and case-board connections.

## Scenes implemented: 12 (Prologue + Chapters 1–12)

Act I (unchanged from last update): `scene_prologue`, `scene_glorias_home`
(Ch1), `scene_hogsmeade_station` (Ch2), `scene_mcgonagall_office` (Ch3,
revisited Ch6 and again in Ch11), `scene_ashcombe_office` (Ch4, revisited
in Ch11 with three new gated hotspots), `scene_founder_relief` (Ch5–6).

Act II (new this round):
- `scene_restoration_workshop` (Ch7 — Gideon interview)
- `scene_elspeth_study` (Ch8 — Elspeth, hands off `frag_elspeth_tracing`)
- `scene_library` (Ch9 — 7-hotspot gated research chain: heraldry →
  symbol catalog → deduction puzzle → architecture records → final lead →
  leave; two `InterpretationPromptSystem` puzzles)
- `scene_binns_classroom` (Ch10 — Binns' sighting testimony)
- `scene_hogwarts_corridor` (Ch11 — Peeves, the rhyme prompt, sets up the
  Ashcombe-office revisit)
- `scene_st_mungos` (Ch12 — Benedict Hale)

All content here is real, final dialogue transcribed from the locked
script (`placeholder: false` throughout). Only the *art* is
placeholder-quality (flat-color generated textures).

## Art completed: 0% · Music completed: 1 track

Title screen now uses real supplied key art
(`assets/imgs/harry-potter-the-silent-lion-title-screen.jpg`) and a real
title-theme track (`assets/audio/a-window-to-the-past.mp3`, looping,
`TITLE_THEME_MUSIC_KEY`), stopped on New Game/Continue and restarted on
returning to the title screen. No in-scene art or music yet.

A `StartupScreenUI` "press any key" splash now gates first load, shown
once before the title screen. This exists because every browser blocks
audio-with-sound until the page has had at least one user gesture — no
site can override that — so the splash turns the unavoidable first
click/keypress into a deliberate beat (title theme starts on the same
gesture that dismisses it) instead of the theme silently failing to
autoplay. Subsequent returns to the title screen (e.g. Settings → Reset
Progress) skip the splash and go straight to the title screen, since the
page has already been interacted with by then.

The splash carries only the "Click or press any key to begin" prompt —
an earlier pass also repeated the "Harry Potter and the Silent Lion"
wordmark there, but that read as showing the title twice since the key
art right behind it already carries the logo, so it was cut. The two
screens now crossfade (splash fades out, title screen fades in, in
parallel, `title-screen-visible`/`startup-screen-fading` CSS classes)
rather than the hard display:none/flex cut from the first pass —
both respect `data-reduced-motion` (transition suppressed entirely,
not just shortened).

Menu navigation (hover/focus across New Game / Continue / Settings) has a
short synthesized "tick" (`MENU_NAV_SFX_KEY`) — kept as a generated tone
rather than a downloaded "royalty-free" file, since sourcing and
redistributing third-party audio without the user reviewing its actual
license terms isn't a call to make unilaterally. Drop a real SFX file in
`assets/audio/` and it's a one-line swap (same pattern as the title
theme) to replace it.

## Outstanding TODOs

- **Acts III–VII (Chapters 13–45) are unimplemented** — the five Founder
  Path visits, the Gideon false-solution case-board arc, the Pensieve
  memories, and the Reveal/Protect ending. Still the overwhelming
  majority of the game.
- Chapter 9's "Gameplay Phase 1–4" library research was heavily gamified
  in the source (a pixel-level "compare Modern Gryffindor Lion vs Silent
  Lion" beat). Implemented as sequential dialogue observations plus two
  `InterpretationPromptSystem` puzzles rather than inventing a new
  evidence-comparison UI mechanic — flagging in case a dedicated
  comparison tool is wanted later.
- Chapter 10's Interrupt/Wait/Listen branch only has given content for
  "Listen" (its content — corridor naming — is later assumed as
  background knowledge in Act III), so it was implemented linearly with
  no real choice rather than risk the player skipping assumed knowledge.
- Chapter 11's multi-location structure (corridor → stairwell →
  Ashcombe's office → implied McGonagall's office → St. Mungo's) was
  consolidated into revisits of `scene_ashcombe_office` (three new gated
  hotspots) rather than new single-purpose scenes for each brief beat.
- Founders "identified through breadcrumbs, not introductions" still has
  no engine mechanism — deferred until an actual Founder-identity scene
  needs it (likely Act III).

## Known technical debt

- **Watch for more `equals: false` (or any "not yet" condition) in future
  content** — it needs an explicit default-flag initialization like the
  Prologue fix above, or it silently never unlocks. Consider adding a
  `not_equals`/`unset` `UnlockCondition` variant if this pattern recurs
  more than once or twice more, rather than hand-initializing defaults
  each time.
- Progress gating leans on `fragment_collected` as a proxy condition in a
  couple of Act I places (predates `set_flag` existing) — could be
  tidied to explicit flags now that the capability exists.
- Single flat catalog files (`fragments.json`, `journalEntries.json`,
  `deductions.json`, `interpretationPrompts.json`,
  `caseBoardConnections.json`, `characters.json`) will need the same
  split-into-directory + glob treatment scenes already got once any of
  them grow large (see `adr/0008`).
- No integration/UI-level automated tests exist — all 64 Vitest tests are
  engine-logic unit tests. Browser verification is manual
  (Playwright-driven, ad hoc) each round, not part of CI. This round's
  two engine bugs were both the kind unit tests wouldn't have caught
  (cross-system wiring gaps, not logic errors) — a scripted end-to-end
  smoke test covering at least one full act would catch this class of
  regression earlier than "walk it by hand before committing."

## Next recommended task

Continue into Act III in story order (the first Founder Path visit).
Before starting new content, skim this file's "known technical debt"
entry on `equals: false` conditions if Act III introduces similar
"active-until-flagged" hotspot gating — initialize the flag's default up
front rather than discovering the softlock during verification again.

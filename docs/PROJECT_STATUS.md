# The Silent Lion — Project Status

Last updated: 2026-08-16, after resolving the two Chapter 2 content gaps
(ambient hotspots + the optional-questions branch) and fixing a second
real engine bug found while doing it.

> **How to use this file**: this is the project dashboard, not a changelog.
> Update it in place at the end of each major milestone (a new
> system landing, a batch of scenes going in, a schema change) — don't
> create a dated copy. Keep it short enough to scan in under a minute.

---

## Engine progress: ~85%

All Phase 1 systems are implemented, wired end-to-end, unit-tested, and
verified in a real browser (see `docs/engineering/ARCHITECTURE.md`):

- ✅ Scene manager, Dialogue system, Fragment system, Insight Journal,
  Deduction framework, Save/load (versioned + migration chain now proven
  across two hops, v1→v2→v3), Settings, Portrait manager/renderer,
  Background manager, Audio manager (SFX only — see below)
- ✅ Interpretation prompts (single-select "what does this mean" quizzes)
  and a Case Board (per-suspect presence/opportunity/motive/concealment
  view, derived from existing state) — added to cover mechanics the full
  Story Bible needed that Phase 1's vertical slice hadn't (`adr/0009`)
- ✅ Pensieve/flashback scene support (`autoStartConversationId`,
  `isMemory` tint) and letter/photograph "present in conversation"
  handoffs (`DialogueLine.presentsFragmentId`)
- ✅ **Fixed two real bugs this round**:
  1. Character portraits could be silently hidden behind a re-rendered
     background whenever a non-repeatable hotspot triggered dialogue
     (Phaser draws by insertion order; `BackgroundManager` recreates its
     background image on every `render()` call). Fixed with explicit
     depth values (background 0 / hotspot outlines 1 / portrait 10).
     Didn't surface in the vertical slice only because its one
     dialogue-triggering hotspot happened to be `repeatable: true`.
  2. A hotspot click landing outside the dialogue box while a
     conversation was already active (e.g. an ambient hotspot clicked
     mid-conversation) would call `DialogueSystem.start()` a second time
     and silently clobber the conversation in progress.
     `SceneManager.activateHotspot()` now ignores hotspot clicks entirely
     while a conversation is on screen. Caught while wiring up Chapter
     2's ambient hotspots, which sit in the same scene as an
     auto-started, choice-bearing conversation.

**What's not done**: presentation types other than `document` still
render as a generic card. Bundle isn't code-split. No accessibility audit
beyond controls existing and being keyboard/screen-reader reachable.

## Story/narrative progress: canon complete, ~5% implemented

- **`docs/Harry_Potter_and_the_Silent_Lion_Complete_Story_Bible_ULTIMATE_FINAL.docx`
  is now the single locked source of truth** — 45 chapters across 7 Acts
  plus a Prologue, Epilogue, and a post-credits sequel hook. Full
  dialogue, every deduction, every environmental puzzle, and a canonical
  Evidence Register. `docs/CLAUDE.md` and `docs/04_StoryBible.md` point to
  it directly; the old compressed placeholder summaries in `00`–`05` are
  either superseded or corrected to match.
- The Prologue and all of Act I (Chapters 1–6, of 45) are implemented as
  real playable content — see "Scenes implemented" below. That's roughly
  6/45 chapters, so ~13% of the chapter count, though chapters vary a lot
  in length and Act I is on the shorter/simpler side (no Founder Path
  visits, no multi-chapter case-board arcs yet).

## Scenes implemented: 6 (Prologue + Chapters 1–6)

- `scene_prologue` — cold open, Ashcombe and the unidentified visitor
- `scene_glorias_home` (Ch1), `scene_hogsmeade_station` (Ch2),
  `scene_mcgonagall_office` (Ch3, revisited later in Ch6),
  `scene_ashcombe_office` (Ch4 — 7 investigation hotspots),
  `scene_founder_relief` (Ch5–6 — 4 investigation hotspots, Harry
  Potter's review, and the photograph-naming scene with McGonagall)

All content here is real, final dialogue transcribed from the locked
script (not placeholder) — `placeholder: false` throughout. Only the
*art* is placeholder-quality (flat-color generated textures); the
`[PLACEHOLDER]` badge convention is reserved for fake test content and
correctly does not appear anywhere in Act I.

The vertical-slice test content (`scene_test_room` and friends) has been
retired now that real content exists in its place.

## Art completed: 0%

Still all programmatically generated placeholder textures. No final art
supplied yet.

## Music completed: 0%

Unchanged — SFX-only placeholder audio (one synthesized beep).

## Outstanding TODOs

- **Acts II–VII (Chapters 7–45) are unimplemented** — Gideon, Elspeth,
  the Silent Lion library research, Peeves, Benedict, the five Founder
  Path visits (Godric/Helga/Rowena/Salazar/Covenant Hall), the Gideon
  false-solution case-board arc, the Pensieve memories, and the
  Reveal/Protect ending. This is the overwhelming majority of the game.
- ~~Five ambient flavor hotspots skipped in Chapter 2~~ **Resolved**: all
  five (station sign, luggage trolley, owl perch, distant Hogwarts view,
  repaired stonework) now have a one-line Gloria reaction, drafted in her
  established voice and reviewed by the user. Implementing them surfaced
  a real design gap — the attendant's conversation used to transition
  straight to McGonagall's office on its last line, leaving no window to
  ever click them — so that transition now waits behind an explicit
  "Path to the Castle" hotspot (same pattern as Ashcombe's office door)
  instead of firing automatically.
- ~~Chapter 2's "optional questions" branch~~ **Resolved**: now a real
  choice (`Who was Ashcombe?` / `Why me?` / `Where are the Aurors?` /
  `Let's keep walking.`) on the attendant's line. Two of the three
  answers are verbatim from the Bible; "Why me?" needed two drafted
  lines from the attendant, written to deliberately not know the real
  answer (which isn't revealed until Ch33) rather than invent one early.
- Founders "identified through breadcrumbs, not introductions" still has
  no engine mechanism — deferred until an actual Founder-identity scene
  needs it (likely Act III).
- A few scene-to-scene handoffs with no dialogue given in the source
  (e.g., McGonagall walking Gloria to the relief) were implemented as
  silent transitions rather than invented banter — flagging in case that
  reads as too abrupt once real art/pacing is in place.

## Known technical debt

- Progress gating leans on `fragment_collected` as a proxy condition in
  a couple of places (e.g., "have you finished investigating the relief"
  is gated on having picked up the clasp, not a dedicated flag) because
  hotspots only just gained `set_flag` this round — some of these could
  be tidied to use explicit flags now that the capability exists.
- Single flat catalog files (`fragments.json`, `journalEntries.json`,
  `deductions.json`, `interpretationPrompts.json`,
  `caseBoardConnections.json`, `characters.json`) will need the same
  split-into-directory + glob treatment scenes already got once any of
  them grow large (see `adr/0008`) — fragments.json in particular will
  grow fast given the Evidence Register spans the whole game.
- No integration/UI-level automated tests exist — all 64 Vitest tests are
  engine-logic unit tests. Browser verification is manual
  (Playwright-driven, ad hoc) each round, not part of CI.

## Next recommended task

Continue into Act II (Chapter 7, Gideon at the Restoration Workshop) in
story order. The "Bible names a branch but doesn't supply every answer"
pattern is now resolved once as a house style (draft the missing lines
in-voice, flag them clearly, get them reviewed) — apply the same
approach if it recurs rather than re-deciding it each time.

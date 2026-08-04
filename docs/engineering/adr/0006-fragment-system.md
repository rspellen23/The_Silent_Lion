# ADR 0006 — Fragment System (renamed from Evidence)

Status: Approved, supersedes the "Evidence" naming in ADR 0003 and the
original architecture proposal.

## Decision

The system originally called "Evidence" (`EvidenceSystem`,
`EvidenceDefinition`, `evidence.json`, hotspot effect `add_evidence`,
`DeductionDefinition.requiredEvidenceIds`) is renamed throughout the
codebase, content, and UI to **Fragment**:

- `EvidenceSystem` → `FragmentSystem` (`src/engine/fragment/FragmentSystem.ts`)
- `EvidenceDefinition` → `FragmentDefinition`
- `src/content/evidence.json` → `src/content/fragments.json`
- `add_evidence` hotspot effect → `add_fragment`
- `DeductionDefinition.requiredEvidenceIds` → `requiredFragmentIds`,
  `optionalSupportingEvidenceIds` → `optionalSupportingFragmentIds`
- `UnlockCondition` type `evidence_collected` → `fragment_collected`
- EventBus events `evidence:added` → `fragment:added` (plus new
  `fragment:read`)

This is a rename, not a re-architecture — the underlying mechanics
(collect into `GameState`, connect two-or-more in `DeductionFramework`,
reference by ID everywhere) are unchanged.

## Fragment kinds

A Fragment has two independent classification fields, not one:

- **`category`** (optional, narrative classification): `physical` |
  `testimonial` | `historical` | `behavioral` | `reflective` — what kind
  of clue this is, in story terms.
- **`presentation`** (required, drives UI rendering): `card` | `document`
  | `photograph` | `artifact` | `testimony` | `behavioral` — how the
  player experiences it when opened.

These overlap in name (`behavioral` appears in both) but answer different
questions — `category` is for content authors/future filtering,
`presentation` is what `FragmentInventoryUI`/hotspot `read_fragment`
actually renders. Readable documents (a letter, the Covenant, a notebook
page) are **not** a separate gameplay system — they are Fragments with
`presentation: 'document'` and a `documentBody` (Markdown).

## New fields on FragmentDefinition

```ts
interface FragmentDefinition {
  id: string;
  name: string;
  description: string;
  category?: 'physical' | 'testimonial' | 'historical' | 'behavioral' | 'reflective';
  presentation: 'card' | 'document' | 'photograph' | 'artifact' | 'testimony' | 'behavioral';
  imageAssetId: AssetId;
  documentBody?: string;              // Markdown; presentation: 'document' only
  relatedJournalEntryIds?: string[];
  relatedFragmentIds?: string[];
  deductionUnlockIds?: string[];      // informational cross-links only —
                                       // actual unlocking is still driven by
                                       // DeductionDefinition.unlockConditions
  placeholder: boolean;
}
```

## Read/unread state

`GameState` gains `readFragmentIds: string[]`, alongside the existing
`fragmentsCollected: string[]` (renamed from `evidenceCollected`).
Collecting a fragment does not mark it read; only opening a
`presentation: 'document'` fragment through the reader (via `read_fragment`
or re-opening it from the Fragment inventory) does. Non-document
presentations are considered read immediately on collection, since there
is no separate "open" action for a card/photograph/artifact.

## New UI

- **`DocumentReaderUI`** — a full-panel reader for `documentBody`,
  rendered through a small hand-written Markdown-subset renderer
  (headings, paragraphs, bold/italic, line breaks). A dependency on a
  full Markdown library was considered and rejected for Phase 1 per
  "minimize dependencies where practical" — letters/documents don't need
  tables, code blocks, or nested lists. Revisit if content complexity
  outgrows the subset.
- **`FragmentInventoryUI`** — a browsable list of all collected
  fragments (HUD button "Fragments"), showing read/unread state for
  document-presentation fragments and opening the right presentation on
  click. This replaces the evidence list that previously only existed
  inside the deduction screen — `DeductionUI` still has its own
  selection list (toggle-to-select for a deduction attempt), but players
  can now also browse fragments outside of an active deduction.

## New hotspot effect: `read_fragment`

Distinct from `add_fragment` (silent collection, e.g. a small physical
clue found via an observation). `read_fragment` collects the fragment (if
not already collected) **and** immediately opens its presentation —
this is how a scene delivers a "moment" like discovering a letter, not
just a quiet pickup.

## Consequences

- Every reference to "evidence" in engine code, content JSON, tests, and
  prior ADRs (0003) is now stale terminology and was updated in this
  refactor. `docs/engineering/adr/0003-deduction-framework-schema.md`'s
  field names should be read as historical — the current field names are
  `requiredFragmentIds`/`optionalSupportingFragmentIds`.
- Content authors now choose a `presentation` for every fragment; there
  is no default, to force a deliberate choice about how it's shown.

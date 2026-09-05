/**
 * Shared type definitions for The Silent Lion engine.
 * These types define the CONTRACT between engine code and /src/content data.
 * Story content must conform to these shapes; the engine must not hardcode story content.
 */

// ---------------------------------------------------------------------------
// Assets — referenced by ID everywhere. Never hardcode file paths outside
// the asset manifest that resolves IDs to placeholder/final asset paths.
// ---------------------------------------------------------------------------

export type AssetId = string;

export interface AssetManifestEntry {
  id: AssetId;
  /** Path relative to /public or bundled asset root. */
  path: string;
  /** True while this entry points at Phase 1 placeholder art, not final art. */
  placeholder: boolean;
}

// ---------------------------------------------------------------------------
// Scenes & Hotspots
// ---------------------------------------------------------------------------

export type HotspotEffectType =
  | 'reveal_observation'
  | 'add_fragment'
  | 'read_fragment'
  | 'start_conversation'
  | 'update_journal'
  | 'unlock_scene'
  | 'travel_to_scene'
  | 'change_visual_state'
  | 'trigger_deduction'
  | 'trigger_interpretation_prompt'
  | 'set_flag';

export interface HotspotEffect {
  type: HotspotEffectType;
  /** Target ID whose meaning depends on `type` (fragmentId, conversationId, journalEntryId, sceneId, deductionId, visualStateId). */
  targetId?: string;
  /** Free text shown for reveal_observation effects. */
  text?: string;
  /** Required alongside targetId for update_journal effects. */
  journalStage?: JournalStage;
  /** Required alongside `value` for set_flag effects. */
  flag?: string;
  value?: boolean | string | number;
}

export interface Hotspot {
  id: string;
  label: string;
  /** Normalized rectangle (0..1) so hotspots scale with responsive background sizing. */
  region: { x: number; y: number; width: number; height: number };
  /** Conditions required (flags/fragments/journal stages) for this hotspot to be active/visible. */
  unlockConditions?: UnlockCondition[];
  effects: HotspotEffect[];
  /** Whether the hotspot remains interactive after first use. */
  repeatable: boolean;
  /** Visual state ID this hotspot is only active in (for scenes with change_visual_state). */
  activeInVisualState?: string;
}

export interface SceneVisualState {
  id: string;
  backgroundAssetId: AssetId;
  description: string;
}

export interface SceneDefinition {
  id: string;
  title: string;
  /** Placeholder flag — true until real art/content replaces this scene. */
  placeholder: boolean;
  defaultVisualStateId: string;
  visualStates: SceneVisualState[];
  hotspots: Hotspot[];
  unlockConditions?: UnlockCondition[];
  musicAssetId?: AssetId;
  ambientAssetId?: AssetId;
  /** Pensieve/flashback scenes: starts this conversation immediately on entry, no hotspot needed. Fired once per goTo(). */
  autoStartConversationId?: string;
  /** Applies a bluish memory tint to the background — for Pensieve/flashback scenes. Purely visual. */
  isMemory?: boolean;
}

/** The scene "New Game" opens — see /src/content/gameConfig.json and adr/0007. */
export interface GameConfig {
  startSceneId: string;
}

// ---------------------------------------------------------------------------
// Conditions & Flags
// ---------------------------------------------------------------------------

export type UnlockCondition =
  | { type: 'flag'; flag: string; equals: boolean | string | number }
  | { type: 'fragment_collected'; fragmentId: string }
  | { type: 'journal_stage'; entryId: string; minStage: JournalStage }
  | { type: 'deduction_completed'; deductionId: string }
  | { type: 'interpretation_completed'; promptId: string };

// ---------------------------------------------------------------------------
// Characters & Portraits
// ---------------------------------------------------------------------------

export interface CharacterExpression {
  id: string;
  portraitAssetId: AssetId;
}

export interface CharacterDefinition {
  id: string;
  displayName: string;
  placeholder: boolean;
  expressions: CharacterExpression[];
  defaultExpressionId: string;
}

// ---------------------------------------------------------------------------
// Dialogue
// ---------------------------------------------------------------------------

export interface DialogueChoice {
  id: string;
  text: string;
  conditions?: UnlockCondition[];
  /** Effects applied when this choice is picked. */
  setFlags?: Record<string, boolean | string | number>;
  grantsFragmentIds?: string[];
  /** Collects (if needed) and immediately opens this fragment's presentation UI — for in-conversation handoffs (a letter, a photograph) rather than silent collection. */
  presentsFragmentId?: string;
  journalUpdates?: { entryId: string; stage: JournalStage }[];
  /** Line ID to jump to next; if omitted, continues sequentially. */
  nextLineId?: string;
}

export interface DialogueLine {
  id: string;
  speakerId: string;
  expressionId?: string;
  text: string;
  conditions?: UnlockCondition[];
  setFlags?: Record<string, boolean | string | number>;
  grantsFragmentIds?: string[];
  /** Collects (if needed) and immediately opens this fragment's presentation UI — for in-conversation handoffs (a letter, a photograph) rather than silent collection. */
  presentsFragmentId?: string;
  journalUpdates?: { entryId: string; stage: JournalStage }[];
  choices?: DialogueChoice[];
  /** Explicit next line; if omitted, engine advances to the next array entry. */
  nextLineId?: string | null;
  /** Optional scene to transition to once this line resolves (used on terminal lines). */
  transitionToSceneId?: string;
}

export interface ConversationDefinition {
  id: string;
  title: string;
  placeholder: boolean;
  startLineId: string;
  lines: DialogueLine[];
}

// ---------------------------------------------------------------------------
// Fragments — player-facing name for collectible clues (formerly "Evidence").
// See docs/engineering/adr/0006-fragment-system.md.
// ---------------------------------------------------------------------------

/** Narrative classification — what kind of clue this is. Optional; for content authoring/filtering. */
export type FragmentCategory = 'physical' | 'testimonial' | 'historical' | 'behavioral' | 'reflective';

/** Presentation mode — how the player experiences it when opened. Drives which UI renders it. */
export type FragmentPresentation = 'card' | 'document' | 'photograph' | 'artifact' | 'testimony' | 'behavioral';

export interface FragmentDefinition {
  id: string;
  name: string;
  description: string;
  category?: FragmentCategory;
  presentation: FragmentPresentation;
  imageAssetId: AssetId;
  /** Markdown body — only meaningful when presentation === 'document'. */
  documentBody?: string;
  relatedJournalEntryIds?: string[];
  relatedFragmentIds?: string[];
  /** Informational cross-links only — actual unlocking is driven by DeductionDefinition.unlockConditions. */
  deductionUnlockIds?: string[];
  placeholder: boolean;
}

// ---------------------------------------------------------------------------
// Insight Journal — three evolving states per entry, all preserved.
// ---------------------------------------------------------------------------

export type JournalStage = 0 | 1 | 2; // 0 = Observation, 1 = Interpretation, 2 = Realization

export const JOURNAL_STAGE_NAMES: Record<JournalStage, string> = {
  0: 'Observation',
  1: 'Interpretation',
  2: 'Realization'
};

export interface JournalEntryStageText {
  stage: JournalStage;
  text: string;
}

export interface JournalEntryDefinition {
  id: string;
  title: string;
  placeholder: boolean;
  relatedFragmentIds: string[];
  /** All three stages of text, authored up front; engine reveals them progressively. */
  stages: JournalEntryStageText[];
}

// ---------------------------------------------------------------------------
// Deduction Framework — fragment connection, not multiple choice.
// ---------------------------------------------------------------------------

export interface DeductionHintStage {
  stage: number;
  text: string;
}

export interface DeductionDefinition {
  id: string;
  title: string;
  placeholder: boolean;
  prompt: string;
  requiredFragmentIds: string[];
  optionalSupportingFragmentIds: string[];
  conclusionText: string;
  hintStages: DeductionHintStage[];
  successActions: {
    setFlags?: Record<string, boolean | string | number>;
    journalUpdates?: { entryId: string; stage: JournalStage }[];
    unlockSceneIds?: string[];
  };
  /** Shown when the player submits fragments that do not satisfy the requirement. */
  failureFeedbackText: string;
  unlockConditions?: UnlockCondition[];
}

// ---------------------------------------------------------------------------
// Interpretation Prompts — single-select "what does this mean" quizzes,
// distinct from DeductionFramework's fragment-connection mechanic. Used
// for moments like "was the spell Attack/Warn/Restrain?" — one correct
// reading among plausible options, retried gently on a wrong pick, never
// a fail state. See docs/engineering/adr/0009-interpretation-prompts.md.
// ---------------------------------------------------------------------------

export interface InterpretationPromptOption {
  id: string;
  text: string;
}

export interface InterpretationPromptDefinition {
  id: string;
  placeholder: boolean;
  prompt: string;
  options: InterpretationPromptOption[];
  correctOptionId: string;
  /** Gloria's reaction line(s) shown on a correct pick. */
  successText: string;
  /** Gentle nudge shown on an incorrect pick — never a fail state. */
  failureText: string;
  successActions: {
    setFlags?: Record<string, boolean | string | number>;
    journalUpdates?: { entryId: string; stage: JournalStage }[];
    grantsFragmentIds?: string[];
  };
}

// ---------------------------------------------------------------------------
// Case Board — a presentation layer over Fragments, grouping the
// connections a suspect accumulates (presence/opportunity/motive/
// concealment/contradiction) across many chapters. Purely derived from
// existing state via unlockConditions; adds no new GameState of its own.
// ---------------------------------------------------------------------------

export type CaseBoardConnectionCategory =
  | 'presence'
  | 'opportunity'
  | 'motive'
  | 'concealment'
  | 'contradiction';

export interface CaseBoardConnectionDefinition {
  id: string;
  /** Character ID this connection is filed under (e.g. "gideon", "benedict"). */
  subjectId: string;
  category: CaseBoardConnectionCategory;
  summaryText: string;
  relatedFragmentIds?: string[];
  /** Visible on the board once these are satisfied — typically fragment_collected / flag / journal_stage. */
  unlockConditions?: UnlockCondition[];
  placeholder: boolean;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface GameSettings {
  textSize: 'small' | 'medium' | 'large';
  textSpeed: 'slow' | 'medium' | 'fast' | 'instant';
  highContrast: boolean;
  reducedMotion: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  ambientVolume: number; // 0..1
  muted: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  textSize: 'medium',
  textSpeed: 'medium',
  highContrast: false,
  reducedMotion: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  ambientVolume: 0.6,
  muted: false
};

// ---------------------------------------------------------------------------
// Save System
// ---------------------------------------------------------------------------

/** Bumped from 2: added completedPromptIds for InterpretationPromptSystem. See adr/0009 and adr/0004. */
export const SAVE_SCHEMA_VERSION = 3;

export interface JournalProgressRecord {
  /** Ordered list of stages unlocked so far, oldest first — history is preserved, not overwritten. */
  unlockedStages: JournalStage[];
}

export interface DeductionAttemptRecord {
  attempts: number;
  hintStage: number;
  completed: boolean;
}

export interface GameStateSnapshot {
  currentSceneId: string;
  currentVisualStateIdByScene: Record<string, string>;
  activeConversationId: string | null;
  activeConversationLineId: string | null;
  flags: Record<string, boolean | string | number>;
  fragmentsCollected: string[];
  readFragmentIds: string[];
  journalProgress: Record<string, JournalProgressRecord>;
  deductionState: Record<string, DeductionAttemptRecord>;
  completedPromptIds: string[];
  visitedSceneIds: string[];
  unlockedSceneIds: string[];
}

export type SaveSlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3';

export interface SaveGame {
  schemaVersion: number;
  slotId: SaveSlotId;
  savedAtIso: string;
  sceneTitleAtSave: string;
  state: GameStateSnapshot;
  settings: GameSettings;
}

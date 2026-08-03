/**
 * Shared type definitions for The Silent Lion engine.
 * These types define the CONTRACT between engine code and /src/content JSON data.
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
  | 'add_evidence'
  | 'start_conversation'
  | 'update_journal'
  | 'unlock_scene'
  | 'change_visual_state'
  | 'trigger_deduction';

export interface HotspotEffect {
  type: HotspotEffectType;
  /** Target ID whose meaning depends on `type` (evidenceId, conversationId, journalEntryId, sceneId, deductionId, visualStateId). */
  targetId?: string;
  /** Free text shown for reveal_observation effects. */
  text?: string;
  /** Required alongside targetId for update_journal effects. */
  journalStage?: JournalStage;
}

export interface Hotspot {
  id: string;
  label: string;
  /** Normalized rectangle (0..1) so hotspots scale with responsive background sizing. */
  region: { x: number; y: number; width: number; height: number };
  /** Conditions required (flags/evidence/journal stages) for this hotspot to be active/visible. */
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
}

// ---------------------------------------------------------------------------
// Conditions & Flags
// ---------------------------------------------------------------------------

export type UnlockCondition =
  | { type: 'flag'; flag: string; equals: boolean | string | number }
  | { type: 'evidence_collected'; evidenceId: string }
  | { type: 'journal_stage'; entryId: string; minStage: JournalStage }
  | { type: 'deduction_completed'; deductionId: string };

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
  grantsEvidenceIds?: string[];
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
  grantsEvidenceIds?: string[];
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
// Evidence
// ---------------------------------------------------------------------------

export interface EvidenceDefinition {
  id: string;
  name: string;
  description: string;
  imageAssetId: AssetId;
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
  relatedEvidenceIds: string[];
  /** All three stages of text, authored up front; engine reveals them progressively. */
  stages: JournalEntryStageText[];
}

// ---------------------------------------------------------------------------
// Deduction Framework — evidence connection, not multiple choice.
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
  requiredEvidenceIds: string[];
  optionalSupportingEvidenceIds: string[];
  conclusionText: string;
  hintStages: DeductionHintStage[];
  successActions: {
    setFlags?: Record<string, boolean | string | number>;
    journalUpdates?: { entryId: string; stage: JournalStage }[];
    unlockSceneIds?: string[];
  };
  /** Shown when the player submits evidence that does not satisfy the requirement. */
  failureFeedbackText: string;
  unlockConditions?: UnlockCondition[];
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

export const SAVE_SCHEMA_VERSION = 1;

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
  evidenceCollected: string[];
  journalProgress: Record<string, JournalProgressRecord>;
  deductionState: Record<string, DeductionAttemptRecord>;
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

import type {
  DeductionAttemptRecord,
  GameStateSnapshot,
  JournalProgressRecord,
  JournalStage
} from './types';

/**
 * Pure in-memory data store for the current playthrough. GameState holds no
 * business logic and emits no events — it is the single serializable source
 * of truth that SaveManager reads/writes and every other manager mutates
 * through small, explicit methods.
 */
export class GameState {
  private snapshot: GameStateSnapshot;

  constructor(initial?: GameStateSnapshot) {
    this.snapshot = initial ?? GameState.createEmpty();
  }

  static createEmpty(): GameStateSnapshot {
    return {
      currentSceneId: '',
      currentVisualStateIdByScene: {},
      activeConversationId: null,
      activeConversationLineId: null,
      flags: {},
      evidenceCollected: [],
      journalProgress: {},
      deductionState: {},
      visitedSceneIds: [],
      unlockedSceneIds: []
    };
  }

  getSnapshot(): GameStateSnapshot {
    // Deep-ish clone so external mutation can't silently corrupt state.
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  loadSnapshot(snapshot: GameStateSnapshot): void {
    this.snapshot = JSON.parse(JSON.stringify(snapshot));
  }

  // --- Scene -----------------------------------------------------------

  getCurrentSceneId(): string {
    return this.snapshot.currentSceneId;
  }

  setCurrentScene(sceneId: string): void {
    this.snapshot.currentSceneId = sceneId;
    if (!this.snapshot.visitedSceneIds.includes(sceneId)) {
      this.snapshot.visitedSceneIds.push(sceneId);
    }
    if (!this.snapshot.unlockedSceneIds.includes(sceneId)) {
      this.snapshot.unlockedSceneIds.push(sceneId);
    }
  }

  unlockScene(sceneId: string): void {
    if (!this.snapshot.unlockedSceneIds.includes(sceneId)) {
      this.snapshot.unlockedSceneIds.push(sceneId);
    }
  }

  isSceneUnlocked(sceneId: string): boolean {
    return this.snapshot.unlockedSceneIds.includes(sceneId);
  }

  getVisualState(sceneId: string): string | undefined {
    return this.snapshot.currentVisualStateIdByScene[sceneId];
  }

  setVisualState(sceneId: string, visualStateId: string): void {
    this.snapshot.currentVisualStateIdByScene[sceneId] = visualStateId;
  }

  // --- Dialogue ----------------------------------------------------------

  setActiveConversation(conversationId: string | null, lineId: string | null): void {
    this.snapshot.activeConversationId = conversationId;
    this.snapshot.activeConversationLineId = lineId;
  }

  getActiveConversationId(): string | null {
    return this.snapshot.activeConversationId;
  }

  // --- Flags ---------------------------------------------------------------

  setFlag(flag: string, value: boolean | string | number): void {
    this.snapshot.flags[flag] = value;
  }

  getFlag(flag: string): boolean | string | number | undefined {
    return this.snapshot.flags[flag];
  }

  // --- Evidence ------------------------------------------------------------

  addEvidence(evidenceId: string): boolean {
    if (this.snapshot.evidenceCollected.includes(evidenceId)) return false;
    this.snapshot.evidenceCollected.push(evidenceId);
    return true;
  }

  hasEvidence(evidenceId: string): boolean {
    return this.snapshot.evidenceCollected.includes(evidenceId);
  }

  getCollectedEvidenceIds(): string[] {
    return [...this.snapshot.evidenceCollected];
  }

  // --- Journal ---------------------------------------------------------------

  getJournalProgress(entryId: string): JournalProgressRecord {
    return this.snapshot.journalProgress[entryId] ?? { unlockedStages: [] };
  }

  advanceJournalStage(entryId: string, stage: JournalStage): boolean {
    const record: JournalProgressRecord = this.snapshot.journalProgress[entryId] ?? {
      unlockedStages: []
    };
    if (record.unlockedStages.includes(stage)) return false;
    record.unlockedStages = [...record.unlockedStages, stage].sort((a, b) => a - b);
    this.snapshot.journalProgress[entryId] = record;
    return true;
  }

  // --- Deduction ---------------------------------------------------------------

  getDeductionState(deductionId: string): DeductionAttemptRecord {
    return (
      this.snapshot.deductionState[deductionId] ?? {
        attempts: 0,
        hintStage: 0,
        completed: false
      }
    );
  }

  recordDeductionAttempt(deductionId: string, succeeded: boolean): DeductionAttemptRecord {
    const record = this.getDeductionState(deductionId);
    record.attempts += 1;
    if (succeeded) {
      record.completed = true;
    } else {
      record.hintStage += 1;
    }
    this.snapshot.deductionState[deductionId] = record;
    return record;
  }
}

import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { InsightJournal } from '../journal/InsightJournal';
import type { FragmentSystem } from '../fragment/FragmentSystem';
import { conditionsMet } from '../conditions';
import type { DeductionDefinition } from '../types';

export interface DeductionAttemptResult {
  success: boolean;
  conclusionText?: string;
  hintText?: string;
  hintStage?: number;
}

const DEFAULT_HINT_TEXT = 'Interesting. Show me what supports that conclusion.';

/**
 * The core investigation mechanic: the player selects two or more
 * fragments that together support a conclusion, rather than choosing
 * from a multiple-choice list. Incorrect attempts are never a fail state —
 * they surface a gentle, escalating hint and let the player try again.
 */
export class DeductionFramework {
  private definitions: Map<string, DeductionDefinition> = new Map();

  constructor(
    private state: GameState,
    private events: EventBus,
    private fragments: FragmentSystem,
    private journal: InsightJournal,
    definitions: DeductionDefinition[]
  ) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  getDefinition(deductionId: string): DeductionDefinition | undefined {
    return this.definitions.get(deductionId);
  }

  isAvailable(deductionId: string): boolean {
    const def = this.definitions.get(deductionId);
    if (!def) return false;
    return conditionsMet(def.unlockConditions, this.state);
  }

  open(deductionId: string): void {
    if (!this.definitions.has(deductionId)) {
      throw new Error(`DeductionFramework: unknown deduction ID "${deductionId}"`);
    }
    this.events.emit('deduction:opened', { deductionId });
  }

  /**
   * Attempts a deduction with the fragment IDs the player selected.
   * Success requires every required fragment ID to be present in the
   * selection (order-independent); optional supporting fragments are not
   * required but do not invalidate a correct attempt.
   */
  attempt(deductionId: string, selectedFragmentIds: string[]): DeductionAttemptResult {
    const def = this.definitions.get(deductionId);
    if (!def) {
      throw new Error(`DeductionFramework: unknown deduction ID "${deductionId}"`);
    }
    this.events.emit('deduction:attempt', { deductionId, selectedFragmentIds });

    const uncollected = selectedFragmentIds.filter((id) => !this.fragments.hasCollected(id));
    if (uncollected.length > 0) {
      throw new Error(
        `DeductionFramework: attempted deduction "${deductionId}" with uncollected fragments: ${uncollected.join(', ')}`
      );
    }

    const selected = new Set(selectedFragmentIds);
    const requiredMet = def.requiredFragmentIds.every((id) => selected.has(id));
    const noExtraneous = selectedFragmentIds.every(
      (id) => def.requiredFragmentIds.includes(id) || def.optionalSupportingFragmentIds.includes(id)
    );
    const success = requiredMet && noExtraneous && selectedFragmentIds.length >= 2;

    const record = this.state.recordDeductionAttempt(deductionId, success);

    if (success) {
      this.applySuccessActions(def);
      this.events.emit('deduction:success', { deductionId });
      return { success: true, conclusionText: def.conclusionText };
    }

    const hintStage = Math.min(record.hintStage - 1, def.hintStages.length - 1);
    const hintText =
      hintStage >= 0 ? def.hintStages[hintStage].text : def.failureFeedbackText || DEFAULT_HINT_TEXT;
    this.events.emit('deduction:failure', { deductionId, hintStage, hintText });
    return { success: false, hintText, hintStage };
  }

  isCompleted(deductionId: string): boolean {
    return this.state.getDeductionState(deductionId).completed;
  }

  private applySuccessActions(def: DeductionDefinition): void {
    const { successActions } = def;
    if (successActions.setFlags) {
      for (const [flag, value] of Object.entries(successActions.setFlags)) {
        this.state.setFlag(flag, value);
        this.events.emit('flag:set', { flag, value });
      }
    }
    if (successActions.journalUpdates) {
      for (const update of successActions.journalUpdates) {
        this.journal.advanceStage(update.entryId, update.stage);
      }
    }
    if (successActions.unlockSceneIds) {
      for (const sceneId of successActions.unlockSceneIds) {
        this.state.unlockScene(sceneId);
      }
    }
  }
}

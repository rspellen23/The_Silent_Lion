import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { InsightJournal } from '../journal/InsightJournal';
import type { FragmentSystem } from '../fragment/FragmentSystem';
import type { InterpretationPromptDefinition } from '../types';

export interface InterpretationAttemptResult {
  success: boolean;
  feedbackText: string;
}

/**
 * Single-select "what does this mean" quizzes — distinct from
 * DeductionFramework's fragment-connection mechanic. Used for moments
 * like "was the spell Attack/Warn/Restrain?": one correct reading among
 * plausible options. A wrong pick is never a fail state — it returns
 * `failureText` and lets the player try again, same fair-play spirit as
 * deductions. See docs/engineering/adr/0009-interpretation-prompts.md.
 */
export class InterpretationPromptSystem {
  private definitions: Map<string, InterpretationPromptDefinition> = new Map();

  constructor(
    private state: GameState,
    private events: EventBus,
    private fragments: FragmentSystem,
    private journal: InsightJournal,
    definitions: InterpretationPromptDefinition[]
  ) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  getDefinition(promptId: string): InterpretationPromptDefinition | undefined {
    return this.definitions.get(promptId);
  }

  open(promptId: string): void {
    if (!this.definitions.has(promptId)) {
      throw new Error(`InterpretationPromptSystem: unknown prompt ID "${promptId}"`);
    }
    this.events.emit('prompt:opened', { promptId });
  }

  attempt(promptId: string, selectedOptionId: string): InterpretationAttemptResult {
    const def = this.definitions.get(promptId);
    if (!def) {
      throw new Error(`InterpretationPromptSystem: unknown prompt ID "${promptId}"`);
    }
    this.events.emit('prompt:attempt', { promptId, selectedOptionId });

    const success = selectedOptionId === def.correctOptionId;
    if (success) {
      this.state.markPromptCompleted(promptId);
      this.applySuccessActions(def);
      this.events.emit('prompt:success', { promptId });
      return { success: true, feedbackText: def.successText };
    }

    this.events.emit('prompt:failure', { promptId, selectedOptionId });
    return { success: false, feedbackText: def.failureText };
  }

  isCompleted(promptId: string): boolean {
    return this.state.isPromptCompleted(promptId);
  }

  private applySuccessActions(def: InterpretationPromptDefinition): void {
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
    if (successActions.grantsFragmentIds) {
      for (const id of successActions.grantsFragmentIds) {
        this.fragments.collect(id);
      }
    }
  }
}

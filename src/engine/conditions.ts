import type { GameState } from './GameState';
import type { UnlockCondition } from './types';

/** Evaluates whether all conditions are satisfied against current GameState. */
export function conditionsMet(
  conditions: UnlockCondition[] | undefined,
  state: GameState
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((condition) => conditionMet(condition, state));
}

function conditionMet(condition: UnlockCondition, state: GameState): boolean {
  switch (condition.type) {
    case 'flag':
      return state.getFlag(condition.flag) === condition.equals;
    case 'fragment_collected':
      return state.hasFragment(condition.fragmentId);
    case 'journal_stage': {
      const unlocked = state.getJournalProgress(condition.entryId).unlockedStages;
      return unlocked.some((stage) => stage >= condition.minStage);
    }
    case 'deduction_completed':
      return state.getDeductionState(condition.deductionId).completed;
    case 'interpretation_completed':
      return state.isPromptCompleted(condition.promptId);
    default:
      return false;
  }
}

import { describe, expect, it } from 'vitest';
import { GameState } from '@engine/GameState';
import { conditionsMet } from '@engine/conditions';
import type { UnlockCondition } from '@engine/types';

describe('conditionsMet', () => {
  it('returns true for an empty/undefined condition list', () => {
    expect(conditionsMet(undefined, new GameState())).toBe(true);
    expect(conditionsMet([], new GameState())).toBe(true);
  });

  it('requires ALL conditions to pass (AND, not OR)', () => {
    const state = new GameState();
    state.setFlag('met_witness', true);
    const conditions: UnlockCondition[] = [
      { type: 'flag', flag: 'met_witness', equals: true },
      { type: 'fragment_collected', fragmentId: 'ev_a' }
    ];

    expect(conditionsMet(conditions, state)).toBe(false);

    state.addFragment('ev_a');
    expect(conditionsMet(conditions, state)).toBe(true);
  });

  it('journal_stage passes once the minimum stage or higher has been unlocked', () => {
    const state = new GameState();
    state.advanceJournalStage('journal_a', 1);

    expect(conditionsMet([{ type: 'journal_stage', entryId: 'journal_a', minStage: 0 }], state)).toBe(true);
    expect(conditionsMet([{ type: 'journal_stage', entryId: 'journal_a', minStage: 2 }], state)).toBe(false);
  });

  it('deduction_completed passes only once that deduction has succeeded', () => {
    const state = new GameState();
    expect(conditionsMet([{ type: 'deduction_completed', deductionId: 'd1' }], state)).toBe(false);

    state.recordDeductionAttempt('d1', true);
    expect(conditionsMet([{ type: 'deduction_completed', deductionId: 'd1' }], state)).toBe(true);
  });
});

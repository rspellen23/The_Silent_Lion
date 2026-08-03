import { describe, expect, it } from 'vitest';
import { GameState } from '@engine/GameState';

describe('GameState', () => {
  it('tracks visited and unlocked scenes when setting the current scene', () => {
    const state = new GameState();
    state.setCurrentScene('scene_a');

    expect(state.getCurrentSceneId()).toBe('scene_a');
    expect(state.isSceneUnlocked('scene_a')).toBe(true);
  });

  it('only adds new evidence once and reports duplicates', () => {
    const state = new GameState();
    expect(state.addEvidence('ev_a')).toBe(true);
    expect(state.addEvidence('ev_a')).toBe(false);
    expect(state.getCollectedEvidenceIds()).toEqual(['ev_a']);
  });

  it('accumulates journal stages in ascending order without duplicates', () => {
    const state = new GameState();
    state.advanceJournalStage('journal_a', 1);
    state.advanceJournalStage('journal_a', 0);
    const second = state.advanceJournalStage('journal_a', 1);

    expect(state.getJournalProgress('journal_a').unlockedStages).toEqual([0, 1]);
    expect(second).toBe(false); // stage 1 was already unlocked
  });

  it('records deduction attempts and increments the hint stage only on failure', () => {
    const state = new GameState();
    state.recordDeductionAttempt('deduct_a', false);
    state.recordDeductionAttempt('deduct_a', false);
    const record = state.recordDeductionAttempt('deduct_a', true);

    expect(record.attempts).toBe(3);
    expect(record.hintStage).toBe(2);
    expect(record.completed).toBe(true);
  });

  it('round-trips through getSnapshot/loadSnapshot without sharing references', () => {
    const state = new GameState();
    state.addEvidence('ev_a');
    const snapshot = state.getSnapshot();

    const restored = new GameState();
    restored.loadSnapshot(snapshot);

    expect(restored.getCollectedEvidenceIds()).toEqual(['ev_a']);

    // Mutating the original state must not affect the restored copy.
    state.addEvidence('ev_b');
    expect(restored.getCollectedEvidenceIds()).toEqual(['ev_a']);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { InsightJournal } from '@engine/journal/InsightJournal';
import type { JournalEntryDefinition } from '@engine/types';

const DEFS: JournalEntryDefinition[] = [
  {
    id: 'journal_a',
    title: 'Clue A',
    placeholder: true,
    relatedEvidenceIds: [],
    stages: [
      { stage: 0, text: 'observation text' },
      { stage: 1, text: 'interpretation text' },
      { stage: 2, text: 'realization text' }
    ]
  }
];

describe('InsightJournal', () => {
  it('is not visible until at least one stage is unlocked', () => {
    const journal = new InsightJournal(new GameState(), new EventBus(), DEFS);
    expect(journal.getVisibleEntries()).toHaveLength(0);
  });

  it('preserves every previously unlocked stage when a later stage unlocks', () => {
    const journal = new InsightJournal(new GameState(), new EventBus(), DEFS);
    journal.advanceStage('journal_a', 0);
    journal.advanceStage('journal_a', 1);

    const view = journal.getEntryView('journal_a');
    expect(view?.revealedStages.map((s) => s.label)).toEqual(['Observation', 'Interpretation']);
    expect(view?.revealedStages[0].text).toBe('observation text');
  });

  it('allows stages to unlock out of order but always displays them in stage order', () => {
    const journal = new InsightJournal(new GameState(), new EventBus(), DEFS);
    journal.advanceStage('journal_a', 2);
    journal.advanceStage('journal_a', 0);

    const view = journal.getEntryView('journal_a');
    expect(view?.revealedStages.map((s) => s.stage)).toEqual([0, 2]);
  });

  it('emits journal:updated only when a stage newly unlocks', () => {
    const events = new EventBus();
    const handler = vi.fn();
    events.on('journal:updated', handler);
    const journal = new InsightJournal(new GameState(), events, DEFS);

    journal.advanceStage('journal_a', 1);
    journal.advanceStage('journal_a', 1);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('throws when advancing to a stage with no authored text', () => {
    const noStage2: JournalEntryDefinition[] = [
      { ...DEFS[0], id: 'journal_b', stages: [{ stage: 0, text: 'only observation' }] }
    ];
    const journal = new InsightJournal(new GameState(), new EventBus(), noStage2);
    expect(() => journal.advanceStage('journal_b', 2)).toThrow(/no authored text/i);
  });
});

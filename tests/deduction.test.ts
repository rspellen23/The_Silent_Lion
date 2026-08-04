import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { InsightJournal } from '@engine/journal/InsightJournal';
import { DeductionFramework } from '@engine/deduction/DeductionFramework';
import type { DeductionDefinition, FragmentDefinition, JournalEntryDefinition } from '@engine/types';

const FRAGMENTS: FragmentDefinition[] = [
  { id: 'ev_cups', name: 'Two Tea Cups', description: '', presentation: 'card', imageAssetId: 'img_cups', placeholder: true },
  { id: 'ev_wand', name: 'Broken Wand', description: '', presentation: 'card', imageAssetId: 'img_wand', placeholder: true },
  { id: 'ev_pages', name: 'Missing Pages', description: '', presentation: 'card', imageAssetId: 'img_pages', placeholder: true },
  { id: 'ev_unrelated', name: 'Unrelated Item', description: '', presentation: 'card', imageAssetId: 'img_x', placeholder: true }
];

const JOURNAL: JournalEntryDefinition[] = [
  {
    id: 'journal_a',
    title: 'Clue',
    placeholder: true,
    relatedFragmentIds: [],
    stages: [
      { stage: 0, text: 'obs' },
      { stage: 1, text: 'interp' },
      { stage: 2, text: 'realization' }
    ]
  }
];

const DEDUCTION: DeductionDefinition = {
  id: 'deduct_a',
  title: 'Test Deduction',
  placeholder: true,
  prompt: 'Connect the fragments.',
  requiredFragmentIds: ['ev_cups', 'ev_wand'],
  optionalSupportingFragmentIds: ['ev_pages'],
  conclusionText: 'The conclusion.',
  hintStages: [
    { stage: 0, text: 'Interesting. Show me what supports that conclusion.' },
    { stage: 1, text: 'Consider both pieces together.' }
  ],
  successActions: {
    setFlags: { deduction_a_done: true },
    journalUpdates: [{ entryId: 'journal_a', stage: 2 }]
  },
  failureFeedbackText: 'Interesting. Show me what supports that conclusion.',
  unlockConditions: []
};

function buildFramework() {
  const events = new EventBus();
  const state = new GameState();
  const fragments = new FragmentSystem(state, events, FRAGMENTS);
  const journal = new InsightJournal(state, events, JOURNAL);
  const deduction = new DeductionFramework(state, events, fragments, journal, [DEDUCTION]);
  return { events, state, fragments, journal, deduction };
}

describe('DeductionFramework — fragment connection mechanic', () => {
  it('succeeds when the exact required fragment set is submitted', () => {
    const { fragments, deduction } = buildFramework();
    fragments.collect('ev_cups');
    fragments.collect('ev_wand');

    const result = deduction.attempt('deduct_a', ['ev_cups', 'ev_wand']);

    expect(result.success).toBe(true);
    expect(result.conclusionText).toBe('The conclusion.');
    expect(deduction.isCompleted('deduct_a')).toBe(true);
  });

  it('succeeds when required fragments are submitted alongside optional supporting fragments', () => {
    const { fragments, deduction } = buildFramework();
    fragments.collect('ev_cups');
    fragments.collect('ev_wand');
    fragments.collect('ev_pages');

    const result = deduction.attempt('deduct_a', ['ev_cups', 'ev_wand', 'ev_pages']);

    expect(result.success).toBe(true);
  });

  it('fails and returns a gentle hint (not a permanent failure state) when required fragments are missing', () => {
    const { fragments, deduction } = buildFramework();
    fragments.collect('ev_cups');

    const result = deduction.attempt('deduct_a', ['ev_cups']);

    expect(result.success).toBe(false);
    expect(result.hintText).toMatch(/interesting/i);
    expect(deduction.isCompleted('deduct_a')).toBe(false);
  });

  it('fails when a fragment outside the required/optional set is included', () => {
    const { fragments, deduction } = buildFramework();
    fragments.collect('ev_cups');
    fragments.collect('ev_wand');
    fragments.collect('ev_unrelated');

    const result = deduction.attempt('deduct_a', ['ev_cups', 'ev_wand', 'ev_unrelated']);

    expect(result.success).toBe(false);
  });

  it('escalates through hint stages on repeated incorrect attempts', () => {
    const { fragments, deduction } = buildFramework();
    fragments.collect('ev_cups');

    const first = deduction.attempt('deduct_a', ['ev_cups']);
    const second = deduction.attempt('deduct_a', ['ev_cups']);

    expect(first.hintStage).toBe(0);
    expect(second.hintStage).toBe(1);
    expect(second.hintText).toBe('Consider both pieces together.');
  });

  it('applies success actions: sets flags and advances the linked journal entry', () => {
    const { fragments, deduction, state, journal } = buildFramework();
    fragments.collect('ev_cups');
    fragments.collect('ev_wand');

    deduction.attempt('deduct_a', ['ev_cups', 'ev_wand']);

    expect(state.getFlag('deduction_a_done')).toBe(true);
    expect(journal.getEntryView('journal_a')?.latestStage).toBe(2);
  });

  it('throws if asked to attempt with fragments the player has not actually collected', () => {
    const { deduction } = buildFramework();
    expect(() => deduction.attempt('deduct_a', ['ev_cups', 'ev_wand'])).toThrow(/uncollected/i);
  });
});

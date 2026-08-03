import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { EvidenceSystem } from '@engine/evidence/EvidenceSystem';
import { InsightJournal } from '@engine/journal/InsightJournal';
import { DeductionFramework } from '@engine/deduction/DeductionFramework';
import type { DeductionDefinition, EvidenceDefinition, JournalEntryDefinition } from '@engine/types';

const EVIDENCE: EvidenceDefinition[] = [
  { id: 'ev_cups', name: 'Two Tea Cups', description: '', imageAssetId: 'img_cups', placeholder: true },
  { id: 'ev_wand', name: 'Broken Wand', description: '', imageAssetId: 'img_wand', placeholder: true },
  { id: 'ev_pages', name: 'Missing Pages', description: '', imageAssetId: 'img_pages', placeholder: true },
  { id: 'ev_unrelated', name: 'Unrelated Item', description: '', imageAssetId: 'img_x', placeholder: true }
];

const JOURNAL: JournalEntryDefinition[] = [
  {
    id: 'journal_a',
    title: 'Clue',
    placeholder: true,
    relatedEvidenceIds: [],
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
  prompt: 'Connect the evidence.',
  requiredEvidenceIds: ['ev_cups', 'ev_wand'],
  optionalSupportingEvidenceIds: ['ev_pages'],
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
  const evidence = new EvidenceSystem(state, events, EVIDENCE);
  const journal = new InsightJournal(state, events, JOURNAL);
  const deduction = new DeductionFramework(state, events, evidence, journal, [DEDUCTION]);
  return { events, state, evidence, journal, deduction };
}

describe('DeductionFramework — evidence connection mechanic', () => {
  it('succeeds when the exact required evidence set is submitted', () => {
    const { evidence, deduction } = buildFramework();
    evidence.collect('ev_cups');
    evidence.collect('ev_wand');

    const result = deduction.attempt('deduct_a', ['ev_cups', 'ev_wand']);

    expect(result.success).toBe(true);
    expect(result.conclusionText).toBe('The conclusion.');
    expect(deduction.isCompleted('deduct_a')).toBe(true);
  });

  it('succeeds when required evidence is submitted alongside optional supporting evidence', () => {
    const { evidence, deduction } = buildFramework();
    evidence.collect('ev_cups');
    evidence.collect('ev_wand');
    evidence.collect('ev_pages');

    const result = deduction.attempt('deduct_a', ['ev_cups', 'ev_wand', 'ev_pages']);

    expect(result.success).toBe(true);
  });

  it('fails and returns a gentle hint (not a permanent failure state) when required evidence is missing', () => {
    const { evidence, deduction } = buildFramework();
    evidence.collect('ev_cups');

    const result = deduction.attempt('deduct_a', ['ev_cups']);

    expect(result.success).toBe(false);
    expect(result.hintText).toMatch(/interesting/i);
    expect(deduction.isCompleted('deduct_a')).toBe(false);
  });

  it('fails when evidence outside the required/optional set is included', () => {
    const { evidence, deduction } = buildFramework();
    evidence.collect('ev_cups');
    evidence.collect('ev_wand');
    evidence.collect('ev_unrelated');

    const result = deduction.attempt('deduct_a', ['ev_cups', 'ev_wand', 'ev_unrelated']);

    expect(result.success).toBe(false);
  });

  it('escalates through hint stages on repeated incorrect attempts', () => {
    const { evidence, deduction } = buildFramework();
    evidence.collect('ev_cups');

    const first = deduction.attempt('deduct_a', ['ev_cups']);
    const second = deduction.attempt('deduct_a', ['ev_cups']);

    expect(first.hintStage).toBe(0);
    expect(second.hintStage).toBe(1);
    expect(second.hintText).toBe('Consider both pieces together.');
  });

  it('applies success actions: sets flags and advances the linked journal entry', () => {
    const { evidence, deduction, state, journal } = buildFramework();
    evidence.collect('ev_cups');
    evidence.collect('ev_wand');

    deduction.attempt('deduct_a', ['ev_cups', 'ev_wand']);

    expect(state.getFlag('deduction_a_done')).toBe(true);
    expect(journal.getEntryView('journal_a')?.latestStage).toBe(2);
  });

  it('throws if asked to attempt with evidence the player has not actually collected', () => {
    const { deduction } = buildFramework();
    expect(() => deduction.attempt('deduct_a', ['ev_cups', 'ev_wand'])).toThrow(/uncollected/i);
  });
});

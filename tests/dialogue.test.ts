import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { EvidenceSystem } from '@engine/evidence/EvidenceSystem';
import { InsightJournal } from '@engine/journal/InsightJournal';
import { DialogueSystem } from '@engine/dialogue/DialogueSystem';
import type { ConversationDefinition, EvidenceDefinition, JournalEntryDefinition } from '@engine/types';

const EVIDENCE: EvidenceDefinition[] = [
  { id: 'ev_a', name: 'A', description: '', imageAssetId: 'img_a', placeholder: true }
];
const JOURNAL: JournalEntryDefinition[] = [
  {
    id: 'journal_a',
    title: 'Clue',
    placeholder: true,
    relatedEvidenceIds: [],
    stages: [{ stage: 0, text: 'obs' }, { stage: 1, text: 'interp' }]
  }
];

const CONVERSATION: ConversationDefinition = {
  id: 'conv_a',
  title: 'Test',
  placeholder: true,
  startLineId: 'l1',
  lines: [
    {
      id: 'l1',
      speakerId: 'char_a',
      text: 'Line one',
      grantsEvidenceIds: ['ev_a'],
      journalUpdates: [{ entryId: 'journal_a', stage: 0 }],
      choices: [
        { id: 'c1', text: 'Ask more', nextLineId: 'l2' },
        { id: 'c2', text: 'Move on', nextLineId: 'l3' }
      ]
    },
    { id: 'l2', speakerId: 'char_a', text: 'Line two', journalUpdates: [{ entryId: 'journal_a', stage: 1 }], nextLineId: 'l3' },
    { id: 'l3', speakerId: 'char_a', text: 'Line three' }
  ]
};

function build() {
  const events = new EventBus();
  const state = new GameState();
  const evidence = new EvidenceSystem(state, events, EVIDENCE);
  const journal = new InsightJournal(state, events, JOURNAL);
  const dialogue = new DialogueSystem(state, events, evidence, journal, [CONVERSATION]);
  return { events, state, evidence, journal, dialogue };
}

describe('DialogueSystem', () => {
  it('applies the start line effects immediately (flags/evidence/journal)', () => {
    const { dialogue, evidence, journal } = build();
    dialogue.start('conv_a');

    expect(evidence.hasCollected('ev_a')).toBe(true);
    expect(journal.getEntryView('journal_a')?.latestStage).toBe(0);
  });

  it('surfaces only currently-valid choices and advances via the chosen branch', () => {
    const { dialogue } = build();
    const startView = dialogue.start('conv_a');
    expect(startView.visibleChoices.map((c) => c.id)).toEqual(['c1', 'c2']);

    const result = dialogue.advance('c1');
    expect(result.ended).toBe(false);
    if (!result.ended) expect(result.view.line.id).toBe('l2');
  });

  it('applies a chosen branch effects and continues to the shared closing line', () => {
    const { dialogue, journal } = build();
    dialogue.start('conv_a');
    dialogue.advance('c1'); // -> l2, unlocks journal stage 1
    expect(journal.getEntryView('journal_a')?.latestStage).toBe(1);

    const result = dialogue.advance();
    expect(result.ended).toBe(false);
    if (!result.ended) expect(result.view.line.id).toBe('l3');
  });

  it('ends the conversation and emits dialogue:ended once the last line is advanced past', () => {
    const { events, dialogue } = build();
    const handler = vi.fn();
    events.on('dialogue:ended', handler);

    dialogue.start('conv_a');
    dialogue.advance('c2'); // -> l3 directly, skipping l2's journal update
    const result = dialogue.advance(); // l3 has no further line -> ends

    expect(result.ended).toBe(true);
    expect(handler).toHaveBeenCalledWith({ conversationId: 'conv_a' });
  });

  it('throws when advancing a choice-bearing line without a choiceId', () => {
    const { dialogue } = build();
    dialogue.start('conv_a');
    expect(() => dialogue.advance()).toThrow(/requires a choiceId/i);
  });
});

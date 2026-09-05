import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { InsightJournal } from '@engine/journal/InsightJournal';
import { InterpretationPromptSystem } from '@engine/interpretation/InterpretationPromptSystem';
import type { FragmentDefinition, InterpretationPromptDefinition, JournalEntryDefinition } from '@engine/types';

const FRAGMENTS: FragmentDefinition[] = [
  { id: 'frag_a', name: 'A', description: '', presentation: 'card', imageAssetId: 'img_a', placeholder: true }
];
const JOURNAL: JournalEntryDefinition[] = [
  {
    id: 'journal_a',
    title: 'Clue',
    placeholder: true,
    relatedFragmentIds: [],
    stages: [{ stage: 0, text: 'obs' }]
  }
];

const PROMPT: InterpretationPromptDefinition = {
  id: 'prompt_a',
  placeholder: true,
  prompt: 'What was the symbol?',
  options: [
    { id: 'opt_secrecy', text: 'Secrecy' },
    { id: 'opt_warning', text: 'Warning' },
    { id: 'opt_restraint', text: 'Restraint' }
  ],
  correctOptionId: 'opt_restraint',
  successText: 'Restraint.',
  failureText: 'Not quite — try again.',
  successActions: {
    setFlags: { symbol_understood: true },
    journalUpdates: [{ entryId: 'journal_a', stage: 0 }],
    grantsFragmentIds: ['frag_a']
  }
};

function build() {
  const events = new EventBus();
  const state = new GameState();
  const fragments = new FragmentSystem(state, events, FRAGMENTS);
  const journal = new InsightJournal(state, events, JOURNAL);
  const prompts = new InterpretationPromptSystem(state, events, fragments, journal, [PROMPT]);
  return { events, state, fragments, journal, prompts };
}

describe('InterpretationPromptSystem', () => {
  it('fails gently on a wrong pick and allows retrying — never a permanent fail state', () => {
    const { prompts } = build();
    const result = prompts.attempt('prompt_a', 'opt_secrecy');

    expect(result.success).toBe(false);
    expect(result.feedbackText).toBe('Not quite — try again.');
    expect(prompts.isCompleted('prompt_a')).toBe(false);

    const retry = prompts.attempt('prompt_a', 'opt_restraint');
    expect(retry.success).toBe(true);
  });

  it('applies success actions on a correct pick: flags, journal, and fragment grant', () => {
    const { prompts, state, journal, fragments } = build();
    const result = prompts.attempt('prompt_a', 'opt_restraint');

    expect(result.success).toBe(true);
    expect(result.feedbackText).toBe('Restraint.');
    expect(state.getFlag('symbol_understood')).toBe(true);
    expect(journal.getEntryView('journal_a')?.latestStage).toBe(0);
    expect(fragments.hasCollected('frag_a')).toBe(true);
    expect(prompts.isCompleted('prompt_a')).toBe(true);
  });

  it('emits prompt:opened, prompt:attempt, and prompt:success/failure', () => {
    const { events, prompts } = build();
    const opened = vi.fn();
    const attempted = vi.fn();
    const succeeded = vi.fn();
    const failed = vi.fn();
    events.on('prompt:opened', opened);
    events.on('prompt:attempt', attempted);
    events.on('prompt:success', succeeded);
    events.on('prompt:failure', failed);

    prompts.open('prompt_a');
    prompts.attempt('prompt_a', 'opt_warning');
    prompts.attempt('prompt_a', 'opt_restraint');

    expect(opened).toHaveBeenCalledWith({ promptId: 'prompt_a' });
    expect(attempted).toHaveBeenCalledTimes(2);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(succeeded).toHaveBeenCalledTimes(1);
  });

  it('throws for an unknown prompt ID', () => {
    const { prompts } = build();
    expect(() => prompts.attempt('nope', 'opt_a')).toThrow(/unknown prompt/i);
    expect(() => prompts.open('nope')).toThrow(/unknown prompt/i);
  });
});

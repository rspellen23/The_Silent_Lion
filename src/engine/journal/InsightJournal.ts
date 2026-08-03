import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { JournalEntryDefinition, JournalStage } from '../types';

export interface JournalEntryView {
  id: string;
  title: string;
  placeholder: boolean;
  /** Stages the player has unlocked so far, in order — history is never dropped. */
  revealedStages: { stage: JournalStage; label: string; text: string }[];
  latestStage: JournalStage | null;
}

const STAGE_LABELS: Record<JournalStage, string> = {
  0: 'Observation',
  1: 'Interpretation',
  2: 'Realization'
};

/**
 * Tracks the evolving three-stage state of each journal entry
 * (Observation -> Interpretation -> Realization). Entries are never
 * replaced — every previously unlocked stage stays visible so the player
 * can see how Gloria's understanding changed over time.
 */
export class InsightJournal {
  private definitions: Map<string, JournalEntryDefinition> = new Map();

  constructor(
    private state: GameState,
    private events: EventBus,
    definitions: JournalEntryDefinition[]
  ) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  getDefinition(entryId: string): JournalEntryDefinition | undefined {
    return this.definitions.get(entryId);
  }

  /** Unlocks a stage for an entry. Stages may be unlocked out of order but are displayed in stage order. */
  advanceStage(entryId: string, stage: JournalStage): boolean {
    const def = this.definitions.get(entryId);
    if (!def) {
      throw new Error(`InsightJournal: unknown journal entry ID "${entryId}"`);
    }
    if (!def.stages.some((s) => s.stage === stage)) {
      throw new Error(
        `InsightJournal: entry "${entryId}" has no authored text for stage ${stage}`
      );
    }
    const didAdvance = this.state.advanceJournalStage(entryId, stage);
    if (didAdvance) {
      this.events.emit('journal:updated', { entryId, stage });
    }
    return didAdvance;
  }

  getEntryView(entryId: string): JournalEntryView | null {
    const def = this.definitions.get(entryId);
    if (!def) return null;
    const progress = this.state.getJournalProgress(entryId);
    const revealedStages = def.stages
      .filter((s) => progress.unlockedStages.includes(s.stage))
      .sort((a, b) => a.stage - b.stage)
      .map((s) => ({ stage: s.stage, label: STAGE_LABELS[s.stage], text: s.text }));
    const latestStage =
      revealedStages.length > 0 ? revealedStages[revealedStages.length - 1].stage : null;
    return {
      id: def.id,
      title: def.title,
      placeholder: def.placeholder,
      revealedStages,
      latestStage
    };
  }

  /** All entries that have at least one unlocked stage — what the player sees in the journal UI. */
  getVisibleEntries(): JournalEntryView[] {
    return Array.from(this.definitions.keys())
      .map((id) => this.getEntryView(id))
      .filter((view): view is JournalEntryView => Boolean(view) && view!.revealedStages.length > 0);
  }
}

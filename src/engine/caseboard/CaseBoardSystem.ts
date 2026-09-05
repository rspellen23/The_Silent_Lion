import type { GameState } from '../GameState';
import { conditionsMet } from '../conditions';
import type { CaseBoardConnectionDefinition } from '../types';

/**
 * Purely derived presentation layer over existing GameState — a
 * connection becomes visible once its unlockConditions are met (usually
 * fragment_collected / flag / journal_stage). No new persisted state of
 * its own; nothing to save beyond what GameState already tracks. See
 * docs/engineering/adr/0009-interpretation-prompts.md.
 */
export class CaseBoardSystem {
  private definitions: CaseBoardConnectionDefinition[];

  constructor(private state: GameState, definitions: CaseBoardConnectionDefinition[]) {
    this.definitions = definitions;
  }

  /** Every subject ID that has at least one connection defined, in first-seen order. */
  getAllSubjectIds(): string[] {
    const seen: string[] = [];
    for (const def of this.definitions) {
      if (!seen.includes(def.subjectId)) seen.push(def.subjectId);
    }
    return seen;
  }

  /** Subjects with at least one currently-visible connection. */
  getVisibleSubjectIds(): string[] {
    return this.getAllSubjectIds().filter((subjectId) => this.getVisibleConnections(subjectId).length > 0);
  }

  getVisibleConnections(subjectId: string): CaseBoardConnectionDefinition[] {
    return this.definitions.filter(
      (def) => def.subjectId === subjectId && conditionsMet(def.unlockConditions, this.state)
    );
  }
}

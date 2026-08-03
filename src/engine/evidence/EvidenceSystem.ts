import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { EvidenceDefinition } from '../types';

/**
 * Owns the evidence catalog (loaded from /content) and records which
 * pieces the player has collected in GameState. Pure data + lookups —
 * no rendering.
 */
export class EvidenceSystem {
  private definitions: Map<string, EvidenceDefinition> = new Map();

  constructor(private state: GameState, private events: EventBus, definitions: EvidenceDefinition[]) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  getDefinition(evidenceId: string): EvidenceDefinition | undefined {
    return this.definitions.get(evidenceId);
  }

  getAllDefinitions(): EvidenceDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Grants a piece of evidence. Returns false if it was already collected (no duplicate event). */
  collect(evidenceId: string): boolean {
    if (!this.definitions.has(evidenceId)) {
      throw new Error(`EvidenceSystem: unknown evidence ID "${evidenceId}"`);
    }
    const isNew = this.state.addEvidence(evidenceId);
    if (isNew) {
      this.events.emit('evidence:added', { evidenceId });
    }
    return isNew;
  }

  hasCollected(evidenceId: string): boolean {
    return this.state.hasEvidence(evidenceId);
  }

  getCollectedDefinitions(): EvidenceDefinition[] {
    return this.state
      .getCollectedEvidenceIds()
      .map((id) => this.definitions.get(id))
      .filter((def): def is EvidenceDefinition => Boolean(def));
  }
}

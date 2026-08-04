import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { FragmentDefinition } from '../types';

/**
 * Owns the fragment catalog (loaded from /content) and records which
 * pieces the player has collected/read in GameState. Pure data + lookups
 * — no rendering. Player-facing name: Fragment (formerly "Evidence" — see
 * docs/engineering/adr/0006-fragment-system.md).
 */
export class FragmentSystem {
  private definitions: Map<string, FragmentDefinition> = new Map();

  constructor(private state: GameState, private events: EventBus, definitions: FragmentDefinition[]) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  getDefinition(fragmentId: string): FragmentDefinition | undefined {
    return this.definitions.get(fragmentId);
  }

  getAllDefinitions(): FragmentDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Collects a fragment. Returns false if it was already collected (no duplicate event). Non-document presentations are considered read immediately, since there is no separate "open" action for them. */
  collect(fragmentId: string): boolean {
    const def = this.definitions.get(fragmentId);
    if (!def) {
      throw new Error(`FragmentSystem: unknown fragment ID "${fragmentId}"`);
    }
    const isNew = this.state.addFragment(fragmentId);
    if (isNew) {
      this.events.emit('fragment:added', { fragmentId });
      if (def.presentation !== 'document') {
        this.markRead(fragmentId);
      }
    }
    return isNew;
  }

  /** Marks a fragment read — the meaningful action for presentation: 'document' fragments (opened via the reader). Collects it first if not already collected. */
  markRead(fragmentId: string): boolean {
    if (!this.definitions.has(fragmentId)) {
      throw new Error(`FragmentSystem: unknown fragment ID "${fragmentId}"`);
    }
    this.state.addFragment(fragmentId);
    const isNewlyRead = this.state.markFragmentRead(fragmentId);
    if (isNewlyRead) {
      this.events.emit('fragment:read', { fragmentId });
    }
    return isNewlyRead;
  }

  hasCollected(fragmentId: string): boolean {
    return this.state.hasFragment(fragmentId);
  }

  hasRead(fragmentId: string): boolean {
    return this.state.hasReadFragment(fragmentId);
  }

  getCollectedDefinitions(): FragmentDefinition[] {
    return this.state
      .getCollectedFragmentIds()
      .map((id) => this.definitions.get(id))
      .filter((def): def is FragmentDefinition => Boolean(def));
  }
}

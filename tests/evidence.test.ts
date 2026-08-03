import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { EvidenceSystem } from '@engine/evidence/EvidenceSystem';
import type { EvidenceDefinition } from '@engine/types';

const DEFS: EvidenceDefinition[] = [
  { id: 'ev_a', name: 'A', description: 'desc a', imageAssetId: 'img_a', placeholder: true },
  { id: 'ev_b', name: 'B', description: 'desc b', imageAssetId: 'img_b', placeholder: true }
];

describe('EvidenceSystem', () => {
  it('collects known evidence and emits evidence:added once', () => {
    const events = new EventBus();
    const handler = vi.fn();
    events.on('evidence:added', handler);
    const system = new EvidenceSystem(new GameState(), events, DEFS);

    expect(system.collect('ev_a')).toBe(true);
    expect(system.collect('ev_a')).toBe(false);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(system.hasCollected('ev_a')).toBe(true);
  });

  it('throws for an evidence ID not present in the content catalog', () => {
    const system = new EvidenceSystem(new GameState(), new EventBus(), DEFS);
    expect(() => system.collect('ev_unknown')).toThrow(/unknown evidence/i);
  });

  it('getCollectedDefinitions returns only collected items, in collection order', () => {
    const system = new EvidenceSystem(new GameState(), new EventBus(), DEFS);
    system.collect('ev_b');
    system.collect('ev_a');

    expect(system.getCollectedDefinitions().map((d) => d.id)).toEqual(['ev_b', 'ev_a']);
  });
});

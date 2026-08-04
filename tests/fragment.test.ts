import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { FragmentSystem } from '@engine/fragment/FragmentSystem';
import type { FragmentDefinition } from '@engine/types';

const DEFS: FragmentDefinition[] = [
  { id: 'ev_a', name: 'A', description: 'desc a', presentation: 'card', imageAssetId: 'img_a', placeholder: true },
  {
    id: 'ev_b',
    name: 'B',
    description: 'desc b',
    presentation: 'document',
    documentBody: 'A letter.',
    imageAssetId: 'img_b',
    placeholder: true
  }
];

describe('FragmentSystem', () => {
  it('collects a known fragment and emits fragment:added once', () => {
    const events = new EventBus();
    const handler = vi.fn();
    events.on('fragment:added', handler);
    const system = new FragmentSystem(new GameState(), events, DEFS);

    expect(system.collect('ev_a')).toBe(true);
    expect(system.collect('ev_a')).toBe(false);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(system.hasCollected('ev_a')).toBe(true);
  });

  it('throws for a fragment ID not present in the content catalog', () => {
    const system = new FragmentSystem(new GameState(), new EventBus(), DEFS);
    expect(() => system.collect('ev_unknown')).toThrow(/unknown fragment/i);
  });

  it('getCollectedDefinitions returns only collected items, in collection order', () => {
    const system = new FragmentSystem(new GameState(), new EventBus(), DEFS);
    system.collect('ev_b');
    system.collect('ev_a');

    expect(system.getCollectedDefinitions().map((d) => d.id)).toEqual(['ev_b', 'ev_a']);
  });

  it('collecting a non-document presentation marks it read immediately', () => {
    const system = new FragmentSystem(new GameState(), new EventBus(), DEFS);
    system.collect('ev_a');
    expect(system.hasRead('ev_a')).toBe(true);
  });

  it('collecting a document presentation does NOT mark it read — reading is a separate action', () => {
    const system = new FragmentSystem(new GameState(), new EventBus(), DEFS);
    system.collect('ev_b');
    expect(system.hasCollected('ev_b')).toBe(true);
    expect(system.hasRead('ev_b')).toBe(false);
  });

  it('markRead collects the fragment first if it was not already collected, and emits fragment:read', () => {
    const events = new EventBus();
    const handler = vi.fn();
    events.on('fragment:read', handler);
    const system = new FragmentSystem(new GameState(), events, DEFS);

    system.markRead('ev_b');

    expect(system.hasCollected('ev_b')).toBe(true);
    expect(system.hasRead('ev_b')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('markRead does not re-emit fragment:read on a second call', () => {
    const events = new EventBus();
    const handler = vi.fn();
    events.on('fragment:read', handler);
    const system = new FragmentSystem(new GameState(), events, DEFS);

    system.markRead('ev_b');
    system.markRead('ev_b');

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

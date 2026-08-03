import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';

describe('EventBus', () => {
  it('calls listeners with the emitted payload', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('evidence:added', handler);

    bus.emit('evidence:added', { evidenceId: 'ev_a' });

    expect(handler).toHaveBeenCalledWith({ evidenceId: 'ev_a' });
  });

  it('stops calling a listener after off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('evidence:added', handler);
    bus.off('evidence:added', handler);

    bus.emit('evidence:added', { evidenceId: 'ev_a' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns an unsubscribe function', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.on('evidence:added', handler);
    unsubscribe();

    bus.emit('evidence:added', { evidenceId: 'ev_a' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when emitting an event with no listeners', () => {
    const bus = new EventBus();
    expect(() => bus.emit('evidence:added', { evidenceId: 'ev_a' })).not.toThrow();
  });
});

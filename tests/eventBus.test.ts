import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';

describe('EventBus', () => {
  it('calls listeners with the emitted payload', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('fragment:added', handler);

    bus.emit('fragment:added', { fragmentId: 'ev_a' });

    expect(handler).toHaveBeenCalledWith({ fragmentId: 'ev_a' });
  });

  it('stops calling a listener after off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('fragment:added', handler);
    bus.off('fragment:added', handler);

    bus.emit('fragment:added', { fragmentId: 'ev_a' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('on() returns an unsubscribe function', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsubscribe = bus.on('fragment:added', handler);
    unsubscribe();

    bus.emit('fragment:added', { fragmentId: 'ev_a' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when emitting an event with no listeners', () => {
    const bus = new EventBus();
    expect(() => bus.emit('fragment:added', { fragmentId: 'ev_a' })).not.toThrow();
  });
});

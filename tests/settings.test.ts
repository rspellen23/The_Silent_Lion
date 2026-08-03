import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { SettingsManager } from '@engine/settings/SettingsManager';
import { DEFAULT_SETTINGS } from '@engine/types';
import { MemoryStorage } from './testUtils/MemoryStorage';

describe('SettingsManager', () => {
  it('starts with defaults when nothing is persisted', () => {
    const manager = new SettingsManager(new EventBus(), new MemoryStorage());
    expect(manager.getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a changed setting and emits settings:changed', () => {
    const storage = new MemoryStorage();
    const events = new EventBus();
    const handler = vi.fn();
    events.on('settings:changed', handler);
    const manager = new SettingsManager(events, storage);

    manager.set('textSize', 'large');

    expect(manager.get('textSize')).toBe('large');
    expect(handler).toHaveBeenCalledWith({ key: 'textSize', value: 'large' });

    const reloaded = new SettingsManager(new EventBus(), storage);
    expect(reloaded.get('textSize')).toBe('large');
  });

  it('resetToDefaults restores every setting', () => {
    const storage = new MemoryStorage();
    const manager = new SettingsManager(new EventBus(), storage);
    manager.set('muted', true);
    manager.set('musicVolume', 0.1);

    manager.resetToDefaults();

    expect(manager.getAll()).toEqual(DEFAULT_SETTINGS);
  });
});

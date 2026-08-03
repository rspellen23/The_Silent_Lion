import type { EventBus } from '../EventBus';
import { DEFAULT_SETTINGS } from '../types';
import type { GameSettings } from '../types';

const STORAGE_KEY = 'silentLion:settings';

/**
 * Holds accessibility/audio/text settings independently of any playthrough
 * (a setting like high contrast or text speed should persist even across
 * "Reset progress"). Persists immediately to localStorage on every change.
 */
export class SettingsManager {
  private settings: GameSettings;

  constructor(private events: EventBus, private storage: Storage = window.localStorage) {
    this.settings = this.loadFromStorage() ?? { ...DEFAULT_SETTINGS };
  }

  private loadFromStorage(): GameSettings | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return null;
    }
  }

  getAll(): GameSettings {
    return { ...this.settings };
  }

  get<K extends keyof GameSettings>(key: K): GameSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings[key] = value;
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    this.events.emit('settings:changed', { key, value });
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    this.events.emit('settings:changed', { key: 'all', value: this.settings });
  }
}

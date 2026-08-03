import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import { SAVE_SCHEMA_VERSION } from '../types';
import type { GameSettings, SaveGame, SaveSlotId } from '../types';

const STORAGE_KEY_PREFIX = 'silentLion:save:';
const MANUAL_SLOT_IDS: SaveSlotId[] = ['slot1', 'slot2', 'slot3'];

export interface SaveSlotSummary {
  slotId: SaveSlotId;
  occupied: boolean;
  savedAtIso?: string;
  sceneTitleAtSave?: string;
}

/**
 * Persists GameState + settings to localStorage under a versioned schema.
 * One autosave slot (triggered by scene transitions and deduction success)
 * plus three manual slots. A save whose schemaVersion doesn't match the
 * current SAVE_SCHEMA_VERSION is treated as incompatible and reported to
 * the caller rather than silently coerced — see docs/engineering/adr/0004.
 */
export class SaveManager {
  constructor(
    private state: GameState,
    private events: EventBus,
    private getSettings: () => GameSettings,
    private storage: Storage = window.localStorage
  ) {}

  private key(slotId: SaveSlotId): string {
    return `${STORAGE_KEY_PREFIX}${slotId}`;
  }

  save(slotId: SaveSlotId, sceneTitleAtSave: string): SaveGame {
    const saveGame: SaveGame = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      slotId,
      savedAtIso: new Date().toISOString(),
      sceneTitleAtSave,
      state: this.state.getSnapshot(),
      settings: this.getSettings()
    };
    this.storage.setItem(this.key(slotId), JSON.stringify(saveGame));
    this.events.emit('save:completed', { slotId });
    return saveGame;
  }

  autosave(sceneTitleAtSave: string): SaveGame {
    return this.save('autosave', sceneTitleAtSave);
  }

  /** Returns null if the slot is empty or the saved schema version is unsupported. */
  load(slotId: SaveSlotId): SaveGame | null {
    const raw = this.storage.getItem(this.key(slotId));
    if (!raw) return null;
    let parsed: SaveGame;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
      // Phase 1 has a single schema version, so there is no migration path yet.
      // Future schema bumps should add a migration step here rather than
      // discarding the save outright.
      console.warn(
        `SaveManager: save in slot "${slotId}" has schema version ${parsed.schemaVersion}, ` +
          `expected ${SAVE_SCHEMA_VERSION}. Refusing to load.`
      );
      return null;
    }
    this.state.loadSnapshot(parsed.state);
    this.events.emit('save:loaded', { slotId });
    return parsed;
  }

  hasSave(slotId: SaveSlotId): boolean {
    return this.storage.getItem(this.key(slotId)) !== null;
  }

  /** Used for the title screen's Resume option: most recently saved slot across autosave + manual slots. */
  getMostRecentSave(): SaveGame | null {
    const all: SaveGame[] = [];
    for (const slotId of ['autosave', ...MANUAL_SLOT_IDS] as SaveSlotId[]) {
      const raw = this.storage.getItem(this.key(slotId));
      if (!raw) continue;
      try {
        const parsed: SaveGame = JSON.parse(raw);
        if (parsed.schemaVersion === SAVE_SCHEMA_VERSION) all.push(parsed);
      } catch {
        // skip corrupt entry
      }
    }
    if (all.length === 0) return null;
    return all.sort((a, b) => b.savedAtIso.localeCompare(a.savedAtIso))[0];
  }

  listManualSlots(): SaveSlotSummary[] {
    return MANUAL_SLOT_IDS.map((slotId) => {
      const raw = this.storage.getItem(this.key(slotId));
      if (!raw) return { slotId, occupied: false };
      try {
        const parsed: SaveGame = JSON.parse(raw);
        return {
          slotId,
          occupied: true,
          savedAtIso: parsed.savedAtIso,
          sceneTitleAtSave: parsed.sceneTitleAtSave
        };
      } catch {
        return { slotId, occupied: false };
      }
    });
  }

  /** Clears all save slots — used by the "Reset progress" setting. */
  resetAllProgress(): void {
    for (const slotId of ['autosave', ...MANUAL_SLOT_IDS] as SaveSlotId[]) {
      this.storage.removeItem(this.key(slotId));
    }
    this.events.emit('save:reset', {});
  }
}

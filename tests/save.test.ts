import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { SaveManager } from '@engine/save/SaveManager';
import { SAVE_SCHEMA_VERSION, DEFAULT_SETTINGS } from '@engine/types';
import { MemoryStorage } from './testUtils/MemoryStorage';

function buildManager() {
  const storage = new MemoryStorage();
  const events = new EventBus();
  const state = new GameState();
  const saveManager = new SaveManager(state, events, () => DEFAULT_SETTINGS, storage);
  return { storage, events, state, saveManager };
}

describe('SaveManager', () => {
  it('writes a versioned save and can load it back into GameState', () => {
    const { state, saveManager } = buildManager();
    state.setCurrentScene('scene_test_room');
    state.addEvidence('ev_a');

    saveManager.save('slot1', 'Test Investigation Room');

    const freshState = new GameState();
    const events = new EventBus();
    const reloadedManager = new SaveManager(freshState, events, () => DEFAULT_SETTINGS, (saveManager as any).storage);
    const loaded = reloadedManager.load('slot1');

    expect(loaded?.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(freshState.getCollectedEvidenceIds()).toEqual(['ev_a']);
    expect(freshState.getCurrentSceneId()).toBe('scene_test_room');
  });

  it('autosave writes to the autosave slot specifically', () => {
    const { storage, saveManager } = buildManager();
    saveManager.autosave('Test Investigation Room');

    expect(storage.getItem('silentLion:save:autosave')).not.toBeNull();
    expect(storage.getItem('silentLion:save:slot1')).toBeNull();
  });

  it('getMostRecentSave returns the most recently saved slot across autosave and manual slots', async () => {
    const { saveManager } = buildManager();
    saveManager.save('slot1', 'Older');
    await new Promise((resolve) => setTimeout(resolve, 5));
    saveManager.autosave('Newer');

    expect(saveManager.getMostRecentSave()?.sceneTitleAtSave).toBe('Newer');
  });

  it('refuses to load a save with an incompatible schema version', () => {
    const { storage, saveManager } = buildManager();
    storage.setItem(
      'silentLion:save:slot1',
      JSON.stringify({ schemaVersion: SAVE_SCHEMA_VERSION + 1, slotId: 'slot1' })
    );

    expect(saveManager.load('slot1')).toBeNull();
  });

  it('resetAllProgress clears autosave and every manual slot', () => {
    const { storage, saveManager } = buildManager();
    saveManager.autosave('A');
    saveManager.save('slot1', 'A');
    saveManager.save('slot2', 'A');
    saveManager.save('slot3', 'A');

    saveManager.resetAllProgress();

    expect(saveManager.hasSave('autosave')).toBe(false);
    expect(saveManager.listManualSlots().every((s) => !s.occupied)).toBe(true);
    expect(storage.length).toBe(0);
  });
});

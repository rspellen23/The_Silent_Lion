import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { InsightJournal } from '@engine/journal/InsightJournal';
import { DeductionFramework } from '@engine/deduction/DeductionFramework';
import { DialogueSystem } from '@engine/dialogue/DialogueSystem';
import { SceneManager } from '@engine/scene/SceneManager';
import type { BackgroundManager } from '@engine/background/BackgroundManager';
import type { AudioManager } from '@engine/audio/AudioManager';
import type { DeductionDefinition, FragmentDefinition, Hotspot, SceneDefinition } from '@engine/types';

/**
 * SceneManager's rendering is Phaser-specific (BackgroundManager/
 * AudioManager both require a Phaser.Scene) — these tests fake both to
 * exercise SceneManager's own routing logic (which hotspot effect does
 * what) without spinning up Phaser.
 */
function fakeBackgroundManager() {
  const renderCalls: { backgroundAssetKey: string; hotspots: Hotspot[]; onHotspotActivated: (id: string) => void }[] = [];
  const fake = {
    render: (backgroundAssetKey: string, hotspots: Hotspot[], _isActive: unknown, onHotspotActivated: (id: string) => void) => {
      renderCalls.push({ backgroundAssetKey, hotspots, onHotspotActivated });
    },
    clear: () => {}
  };
  return { fake: fake as unknown as BackgroundManager, renderCalls };
}

function fakeAudioManager(): AudioManager {
  return {
    playMusic: () => {},
    playAmbient: () => {},
    playSfx: () => {},
    stopMusic: () => {},
    stopAmbient: () => {},
    stopAll: () => {}
  } as unknown as AudioManager;
}

const FRAGMENTS: FragmentDefinition[] = [];

function buildSceneManager(scenes: SceneDefinition[], deductions: DeductionDefinition[] = []) {
  const events = new EventBus();
  const state = new GameState();
  const fragments = new FragmentSystem(state, events, FRAGMENTS);
  const journal = new InsightJournal(state, events, []);
  const deduction = new DeductionFramework(state, events, fragments, journal, deductions);
  const dialogue = new DialogueSystem(state, events, fragments, journal, []);
  const { fake: background, renderCalls } = fakeBackgroundManager();
  const audio = fakeAudioManager();
  const sceneManager = new SceneManager(state, events, background, audio, fragments, journal, deduction, dialogue, scenes);
  return { events, state, sceneManager, renderCalls };
}

function sceneWithHotspot(id: string, hotspot: Hotspot): SceneDefinition {
  return {
    id,
    title: id,
    placeholder: true,
    defaultVisualStateId: 'default',
    visualStates: [{ id: 'default', backgroundAssetId: `bg_${id}`, description: '' }],
    hotspots: [hotspot]
  };
}

describe('SceneManager', () => {
  it('travel_to_scene unlocks and immediately navigates to the target scene', () => {
    const sceneA = sceneWithHotspot('scene_a', {
      id: 'door',
      label: 'Door',
      region: { x: 0, y: 0, width: 1, height: 1 },
      repeatable: true,
      effects: [{ type: 'travel_to_scene', targetId: 'scene_b' }]
    });
    const sceneB = sceneWithHotspot('scene_b', {
      id: 'noop',
      label: 'noop',
      region: { x: 0, y: 0, width: 1, height: 1 },
      repeatable: true,
      effects: []
    });
    const { state, sceneManager, renderCalls } = buildSceneManager([sceneA, sceneB]);

    sceneManager.goTo('scene_a');
    expect(state.isSceneUnlocked('scene_b')).toBe(false);

    renderCalls[renderCalls.length - 1].onHotspotActivated('door');

    expect(state.getCurrentSceneId()).toBe('scene_b');
    expect(state.isSceneUnlocked('scene_b')).toBe(true);
    expect(renderCalls[renderCalls.length - 1].backgroundAssetKey).toBe('bg_scene_b');
  });

  it('unlock_scene marks a scene reachable WITHOUT navigating there', () => {
    const sceneA = sceneWithHotspot('scene_a', {
      id: 'note',
      label: 'Note',
      region: { x: 0, y: 0, width: 1, height: 1 },
      repeatable: true,
      effects: [{ type: 'unlock_scene', targetId: 'scene_b' }]
    });
    const sceneB = sceneWithHotspot('scene_b', {
      id: 'noop',
      label: 'noop',
      region: { x: 0, y: 0, width: 1, height: 1 },
      repeatable: true,
      effects: []
    });
    const { state, sceneManager, renderCalls } = buildSceneManager([sceneA, sceneB]);

    sceneManager.goTo('scene_a');
    renderCalls[renderCalls.length - 1].onHotspotActivated('note');

    expect(state.isSceneUnlocked('scene_b')).toBe(true);
    expect(state.getCurrentSceneId()).toBe('scene_a'); // unchanged — did not navigate
  });

  it('reveal_observation emits observation:revealed with the hotspot text', () => {
    const scene = sceneWithHotspot('scene_a', {
      id: 'desk',
      label: 'Desk',
      region: { x: 0, y: 0, width: 1, height: 1 },
      repeatable: true,
      effects: [{ type: 'reveal_observation', text: 'A note.' }]
    });
    const { events, sceneManager, renderCalls } = buildSceneManager([scene]);
    const handler = vi.fn();
    events.on('observation:revealed', handler);

    sceneManager.goTo('scene_a');
    renderCalls[renderCalls.length - 1].onHotspotActivated('desk');

    expect(handler).toHaveBeenCalledWith({ sceneId: 'scene_a', hotspotId: 'desk', text: 'A note.' });
  });

  it('trigger_deduction opens the named deduction', () => {
    const scene = sceneWithHotspot('scene_a', {
      id: 'clue',
      label: 'Clue',
      region: { x: 0, y: 0, width: 1, height: 1 },
      repeatable: true,
      effects: [{ type: 'trigger_deduction', targetId: 'deduct_x' }]
    });
    const deductionDef: DeductionDefinition = {
      id: 'deduct_x',
      title: 'x',
      placeholder: true,
      prompt: '',
      requiredFragmentIds: [],
      optionalSupportingFragmentIds: [],
      conclusionText: '',
      hintStages: [],
      successActions: {},
      failureFeedbackText: ''
    };
    const { events, sceneManager, renderCalls } = buildSceneManager([scene], [deductionDef]);
    const handler = vi.fn();
    events.on('deduction:opened', handler);

    sceneManager.goTo('scene_a');
    renderCalls[renderCalls.length - 1].onHotspotActivated('clue');

    expect(handler).toHaveBeenCalledWith({ deductionId: 'deduct_x' });
  });
});

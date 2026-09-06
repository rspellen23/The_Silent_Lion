import Phaser from 'phaser';

import { EventBus } from '@engine/EventBus';
import { GameState } from '@engine/GameState';
import { SettingsManager } from '@engine/settings/SettingsManager';
import { SaveManager } from '@engine/save/SaveManager';
import { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { InsightJournal } from '@engine/journal/InsightJournal';
import { DeductionFramework } from '@engine/deduction/DeductionFramework';
import { InterpretationPromptSystem } from '@engine/interpretation/InterpretationPromptSystem';
import { CaseBoardSystem } from '@engine/caseboard/CaseBoardSystem';
import { DialogueSystem } from '@engine/dialogue/DialogueSystem';
import { PortraitManager } from '@engine/portrait/PortraitManager';
import { PortraitRenderer } from '@engine/portrait/PortraitRenderer';
import { BackgroundManager, DESIGN_HEIGHT, DESIGN_WIDTH } from '@engine/background/BackgroundManager';
import { AudioManager } from '@engine/audio/AudioManager';
import { SceneManager } from '@engine/scene/SceneManager';
import { loadPlaceholderTextures } from '@engine/placeholder/PlaceholderAssetLoader';
import { getTextureDataUrl } from '@engine/placeholder/PlaceholderTextureFactory';

import { GameScene, PLACEHOLDER_CLICK_SFX_KEY } from './phaser/GameScene';

import { DialogueBoxUI } from '@ui/DialogueBoxUI';
import { JournalUI } from '@ui/JournalUI';
import { DeductionUI } from '@ui/DeductionUI';
import { DocumentReaderUI } from '@ui/DocumentReaderUI';
import { FragmentInventoryUI } from '@ui/FragmentInventoryUI';
import { InterpretationPromptUI } from '@ui/InterpretationPromptUI';
import { CaseBoardUI } from '@ui/CaseBoardUI';
import { SettingsUI } from '@ui/SettingsUI';
import { HudBar } from '@ui/HudBar';
import { TitleScreenUI } from '@ui/TitleScreenUI';
import { ObservationToastUI } from '@ui/ObservationToastUI';

import {
  caseBoardConnections,
  characters,
  conversations,
  deductions,
  fragmentDefinitions,
  gameConfig,
  interpretationPrompts,
  journalEntries,
  placeholderAssetSpecs,
  scenes
} from '@content/index';
import type { SaveGame } from '@engine/types';

const START_SCENE_ID = gameConfig.startSceneId;

// --- Framework-agnostic engine managers (no Phaser dependency) -----------

const events = new EventBus();
const state = new GameState();
const settings = new SettingsManager(events);
const saveManager = new SaveManager(state, events, () => settings.getAll());
const fragmentSystem = new FragmentSystem(state, events, fragmentDefinitions);
const journal = new InsightJournal(state, events, journalEntries);
const deductionFramework = new DeductionFramework(state, events, fragmentSystem, journal, deductions);
const interpretationPromptSystem = new InterpretationPromptSystem(
  state,
  events,
  fragmentSystem,
  journal,
  interpretationPrompts
);
const caseBoardSystem = new CaseBoardSystem(state, caseBoardConnections);
const dialogueSystem = new DialogueSystem(state, events, fragmentSystem, journal, conversations);
const portraitManager = new PortraitManager(characters);

const uiOverlay = document.getElementById('ui-overlay') as HTMLElement;

function currentSceneTitle(): string {
  const def = scenes.find((s) => s.id === state.getCurrentSceneId());
  return def?.title ?? START_SCENE_ID;
}

function onGameReady(scene: Phaser.Scene): void {
  loadPlaceholderTextures(scene, placeholderAssetSpecs);

  const background = new BackgroundManager(scene);
  const audio = new AudioManager(scene, settings, events);
  const portraitRenderer = new PortraitRenderer(scene);
  const sceneManager = new SceneManager(
    state,
    events,
    background,
    audio,
    fragmentSystem,
    journal,
    deductionFramework,
    dialogueSystem,
    interpretationPromptSystem,
    scenes
  );

  events.on('hotspot:activated', () => audio.playSfx(PLACEHOLDER_CLICK_SFX_KEY));

  // Autosave at scene transitions and on successful deductions, per the
  // approved save-system spec.
  events.on('scene:loaded', () => saveManager.autosave(currentSceneTitle()));
  events.on('deduction:success', () => saveManager.autosave(currentSceneTitle()));

  // Re-evaluate hotspot visibility whenever anything an UnlockCondition can
  // reference changes. Without this, a hotspot gated on a flag set mid-
  // conversation (or by a completed prompt/deduction/journal stage) stays
  // invisible until the scene is reloaded, since SceneManager only renders
  // hotspots on scene load or a non-repeatable hotspot's own click.
  events.on('flag:set', () => sceneManager.refresh());
  events.on('fragment:added', () => sceneManager.refresh());
  events.on('journal:updated', () => sceneManager.refresh());
  events.on('deduction:success', () => sceneManager.refresh());
  events.on('prompt:success', () => sceneManager.refresh());

  // --- DOM UI -------------------------------------------------------------

  const dialogueBox = new DialogueBoxUI(
    uiOverlay,
    events,
    dialogueSystem,
    portraitManager,
    settings,
    (assetId) => portraitRenderer.show(assetId),
    (sceneId) => sceneManager.goTo(sceneId)
  );
  void dialogueBox;

  const journalUI = new JournalUI(uiOverlay, events, journal);
  const deductionUI = new DeductionUI(uiOverlay, events, deductionFramework, fragmentSystem, (assetId) =>
    getTextureDataUrl(scene, assetId)
  );
  void deductionUI;
  const documentReader = new DocumentReaderUI(uiOverlay, events, fragmentSystem, (assetId) =>
    getTextureDataUrl(scene, assetId)
  );
  void documentReader;
  const fragmentInventory = new FragmentInventoryUI(uiOverlay, events, fragmentSystem);
  const interpretationPromptUI = new InterpretationPromptUI(uiOverlay, events, interpretationPromptSystem);
  void interpretationPromptUI;
  const caseBoardUI = new CaseBoardUI(uiOverlay, events, caseBoardSystem);
  const observationToast = new ObservationToastUI(uiOverlay, events);
  void observationToast;

  let settingsUI: SettingsUI;
  let hud: HudBar | null = null;
  let titleScreen: TitleScreenUI;

  function showGameplay(): void {
    titleScreen.hide();
    if (!hud) {
      hud = new HudBar(
        uiOverlay,
        events,
        () => journalUI.toggle(),
        () => fragmentInventory.toggle(),
        () => caseBoardUI.toggle(),
        () => settingsUI.toggle(),
        saveManager,
        deductionFramework,
        deductions[0]?.id,
        currentSceneTitle,
        () => window.alert(`Saved — ${currentSceneTitle()}`)
      );
    }
  }

  function startNewGame(): void {
    state.loadSnapshot(GameState.createEmpty());
    sceneManager.goTo(START_SCENE_ID);
    showGameplay();
  }

  function loadSaveGame(saveGame: SaveGame): void {
    state.loadSnapshot(saveGame.state);
    sceneManager.goTo(saveGame.state.currentSceneId || START_SCENE_ID);
    showGameplay();
  }

  settingsUI = new SettingsUI(uiOverlay, settings, saveManager, () => {
    titleScreen.show();
    hud = null;
    document.getElementById('hud-bar')?.remove();
  });

  titleScreen = new TitleScreenUI(
    uiOverlay,
    saveManager,
    startNewGame,
    loadSaveGame,
    () => settingsUI.show()
  );
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-mount',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#0d0f14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  input: {
    activePointers: 2 // supports simultaneous touch pointers on tablet/mobile
  },
  scene: [new GameScene(onGameReady)]
});

import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { BackgroundManager } from '../background/BackgroundManager';
import type { AudioManager } from '../audio/AudioManager';
import type { FragmentSystem } from '../fragment/FragmentSystem';
import type { InsightJournal } from '../journal/InsightJournal';
import type { DeductionFramework } from '../deduction/DeductionFramework';
import type { DialogueSystem } from '../dialogue/DialogueSystem';
import { conditionsMet } from '../conditions';
import type { Hotspot, SceneDefinition } from '../types';

/**
 * Orchestrator for the point-and-click investigation loop: given the
 * current scene's data, it renders the active visual state's background
 * and hotspots via BackgroundManager, and routes each hotspot's effects to
 * the appropriate system (fragments, journal, dialogue, deduction, scene
 * navigation, or a visual-state swap). SceneManager holds no story content —
 * all of it comes from /src/content/scenes/*.json.
 */
export class SceneManager {
  private scenes: Map<string, SceneDefinition> = new Map();
  private currentScene: SceneDefinition | null = null;

  constructor(
    private state: GameState,
    private events: EventBus,
    private background: BackgroundManager,
    private audio: AudioManager,
    private fragments: FragmentSystem,
    private journal: InsightJournal,
    private deduction: DeductionFramework,
    private dialogue: DialogueSystem,
    definitions: SceneDefinition[]
  ) {
    for (const def of definitions) {
      this.scenes.set(def.id, def);
    }
  }

  getDefinition(sceneId: string): SceneDefinition | undefined {
    return this.scenes.get(sceneId);
  }

  isUnlocked(sceneId: string): boolean {
    const def = this.scenes.get(sceneId);
    if (!def) return false;
    return this.state.isSceneUnlocked(sceneId) || conditionsMet(def.unlockConditions, this.state);
  }

  goTo(sceneId: string): void {
    const def = this.scenes.get(sceneId);
    if (!def) {
      throw new Error(`SceneManager: unknown scene ID "${sceneId}"`);
    }
    this.currentScene = def;
    this.state.setCurrentScene(sceneId);
    if (!this.state.getVisualState(sceneId)) {
      this.state.setVisualState(sceneId, def.defaultVisualStateId);
    }
    if (def.musicAssetId) this.audio.playMusic(def.musicAssetId);
    if (def.ambientAssetId) this.audio.playAmbient(def.ambientAssetId);
    this.renderCurrentVisualState();
    this.events.emit('scene:loaded', { sceneId });
  }

  private renderCurrentVisualState(): void {
    const def = this.currentScene;
    if (!def) return;
    const visualStateId = this.state.getVisualState(def.id) ?? def.defaultVisualStateId;
    const visualState = def.visualStates.find((v) => v.id === visualStateId) ?? def.visualStates[0];

    this.background.render(
      visualState.backgroundAssetId,
      def.hotspots,
      (hotspot) => this.isHotspotActive(hotspot, visualStateId),
      (hotspotId) => this.activateHotspot(hotspotId)
    );
  }

  private usedFlagKey(sceneId: string, hotspotId: string): string {
    return `__hotspotUsed__:${sceneId}:${hotspotId}`;
  }

  private isHotspotActive(hotspot: Hotspot, visualStateId: string): boolean {
    if (hotspot.activeInVisualState && hotspot.activeInVisualState !== visualStateId) return false;
    const currentScene = this.currentScene;
    if (
      currentScene &&
      !hotspot.repeatable &&
      this.state.getFlag(this.usedFlagKey(currentScene.id, hotspot.id)) === true
    ) {
      return false;
    }
    return conditionsMet(hotspot.unlockConditions, this.state);
  }

  private activateHotspot(hotspotId: string): void {
    const def = this.currentScene;
    if (!def) return;
    const hotspot = def.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return;

    this.events.emit('hotspot:activated', { sceneId: def.id, hotspotId });

    for (const effect of hotspot.effects) {
      this.applyEffect(def, effect, hotspotId);
    }

    if (!hotspot.repeatable) {
      this.state.setFlag(this.usedFlagKey(def.id, hotspot.id), true);
      this.renderCurrentVisualState();
    }
  }

  private applyEffect(
    scene: SceneDefinition,
    effect: Hotspot['effects'][number],
    hotspotId: string
  ): void {
    switch (effect.type) {
      case 'reveal_observation':
        this.events.emit('observation:revealed', {
          sceneId: scene.id,
          hotspotId,
          text: effect.text ?? ''
        });
        break;
      case 'add_fragment':
        if (effect.targetId) this.fragments.collect(effect.targetId);
        break;
      case 'read_fragment':
        if (effect.targetId) {
          this.fragments.markRead(effect.targetId);
          this.events.emit('fragment:present', { fragmentId: effect.targetId });
        }
        break;
      case 'start_conversation':
        if (effect.targetId) this.dialogue.start(effect.targetId);
        break;
      case 'update_journal':
        if (effect.targetId && effect.journalStage !== undefined) {
          this.journal.advanceStage(effect.targetId, effect.journalStage);
        }
        break;
      case 'unlock_scene':
        if (effect.targetId) this.state.unlockScene(effect.targetId);
        break;
      case 'travel_to_scene':
        if (effect.targetId) {
          this.state.unlockScene(effect.targetId);
          this.goTo(effect.targetId);
        }
        break;
      case 'change_visual_state':
        if (effect.targetId) {
          this.state.setVisualState(scene.id, effect.targetId);
          this.events.emit('scene:visualStateChanged', {
            sceneId: scene.id,
            visualStateId: effect.targetId
          });
          this.renderCurrentVisualState();
        }
        break;
      case 'trigger_deduction':
        if (effect.targetId) this.deduction.open(effect.targetId);
        break;
    }
  }

  /** Re-renders hotspots for the current visual state — call after any state change that affects hotspot conditions (e.g. new fragment, journal update, deduction success). */
  refresh(): void {
    this.renderCurrentVisualState();
  }
}

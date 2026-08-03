/**
 * Central publish/subscribe bus. Every engine manager communicates through
 * this instead of holding direct references to one another, so systems can
 * be built, tested, and swapped independently (docs/CLAUDE.md: "prefer
 * modular systems over hardcoded logic").
 */

export interface GameEventMap {
  'scene:loaded': { sceneId: string };
  'scene:visualStateChanged': { sceneId: string; visualStateId: string };
  'hotspot:activated': { sceneId: string; hotspotId: string };
  'observation:revealed': { sceneId: string; hotspotId: string; text: string };
  'dialogue:started': { conversationId: string };
  'dialogue:line': { conversationId: string; lineId: string };
  'dialogue:choiceMade': { conversationId: string; lineId: string; choiceId: string };
  'dialogue:ended': { conversationId: string };
  'evidence:added': { evidenceId: string };
  'journal:updated': { entryId: string; stage: number };
  'deduction:opened': { deductionId: string };
  'deduction:attempt': { deductionId: string; selectedEvidenceIds: string[] };
  'deduction:success': { deductionId: string };
  'deduction:failure': { deductionId: string; hintStage: number; hintText: string };
  'flag:set': { flag: string; value: boolean | string | number };
  'save:completed': { slotId: string };
  'save:loaded': { slotId: string };
  'save:reset': Record<string, never>;
  'settings:changed': { key: string; value: unknown };
}

export type GameEventName = keyof GameEventMap;
type Listener<K extends GameEventName> = (payload: GameEventMap[K]) => void;

export class EventBus {
  private listeners: Map<GameEventName, Set<Listener<any>>> = new Map();

  on<K extends GameEventName>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off<K extends GameEventName>(event: K, listener: Listener<K>): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of Array.from(handlers)) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

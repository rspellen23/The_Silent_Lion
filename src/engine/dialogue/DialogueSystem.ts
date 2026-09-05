import type { EventBus } from '../EventBus';
import type { GameState } from '../GameState';
import type { FragmentSystem } from '../fragment/FragmentSystem';
import type { InsightJournal } from '../journal/InsightJournal';
import { conditionsMet } from '../conditions';
import type { ConversationDefinition, DialogueChoice, DialogueLine } from '../types';

export interface DialogueLineView {
  line: DialogueLine;
  visibleChoices: DialogueChoice[];
}

export type DialogueAdvanceResult =
  | { ended: false; view: DialogueLineView }
  | { ended: true; transitionToSceneId?: string };

/**
 * Drives a single conversation at a time: line traversal, conditional
 * player choices, and applying each line's/choice's flag, fragment, and
 * journal effects as they are reached. Conversation content is entirely
 * data (see /src/content/dialogue/*.json) — this class contains no story
 * text of its own.
 */
export class DialogueSystem {
  private conversations: Map<string, ConversationDefinition> = new Map();
  private activeConversation: ConversationDefinition | null = null;
  private activeLine: DialogueLine | null = null;

  constructor(
    private state: GameState,
    private events: EventBus,
    private fragments: FragmentSystem,
    private journal: InsightJournal,
    definitions: ConversationDefinition[]
  ) {
    for (const def of definitions) {
      this.conversations.set(def.id, def);
    }
  }

  getDefinition(conversationId: string): ConversationDefinition | undefined {
    return this.conversations.get(conversationId);
  }

  start(conversationId: string): DialogueLineView {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`DialogueSystem: unknown conversation ID "${conversationId}"`);
    }
    this.activeConversation = conversation;
    const startLine = this.findLine(conversation, conversation.startLineId);
    this.activeLine = startLine;
    this.state.setActiveConversation(conversation.id, startLine.id);
    this.events.emit('dialogue:started', { conversationId: conversation.id });
    this.applyLineEffects(startLine);
    this.events.emit('dialogue:line', { conversationId: conversation.id, lineId: startLine.id });
    return this.buildView(startLine);
  }

  getCurrentView(): DialogueLineView | null {
    if (!this.activeConversation || !this.activeLine) return null;
    return this.buildView(this.activeLine);
  }

  /** Advances the conversation. Pass `choiceId` when the current line has visible choices. */
  advance(choiceId?: string): DialogueAdvanceResult {
    if (!this.activeConversation || !this.activeLine) {
      throw new Error('DialogueSystem: no active conversation to advance');
    }
    const conversation = this.activeConversation;
    const currentLine = this.activeLine;

    let nextLineId: string | null | undefined = currentLine.nextLineId;

    if (currentLine.choices && currentLine.choices.length > 0) {
      if (!choiceId) {
        throw new Error(
          `DialogueSystem: line "${currentLine.id}" requires a choiceId to advance`
        );
      }
      const choice = currentLine.choices.find((c) => c.id === choiceId);
      if (!choice) {
        throw new Error(`DialogueSystem: unknown choice ID "${choiceId}" on line "${currentLine.id}"`);
      }
      this.events.emit('dialogue:choiceMade', {
        conversationId: conversation.id,
        lineId: currentLine.id,
        choiceId
      });
      this.applyChoiceEffects(choice);
      nextLineId = choice.nextLineId ?? currentLine.nextLineId;
    }

    if (currentLine.transitionToSceneId) {
      this.end();
      return { ended: true, transitionToSceneId: currentLine.transitionToSceneId };
    }

    const resolvedNextId = nextLineId ?? this.defaultNextLineId(conversation, currentLine);
    if (!resolvedNextId) {
      this.end();
      return { ended: true };
    }

    const nextLine = this.findLine(conversation, resolvedNextId);
    this.activeLine = nextLine;
    this.state.setActiveConversation(conversation.id, nextLine.id);
    this.applyLineEffects(nextLine);
    this.events.emit('dialogue:line', { conversationId: conversation.id, lineId: nextLine.id });
    return { ended: false, view: this.buildView(nextLine) };
  }

  end(): void {
    if (!this.activeConversation) return;
    const conversationId = this.activeConversation.id;
    this.activeConversation = null;
    this.activeLine = null;
    this.state.setActiveConversation(null, null);
    this.events.emit('dialogue:ended', { conversationId });
  }

  private defaultNextLineId(
    conversation: ConversationDefinition,
    currentLine: DialogueLine
  ): string | null {
    const index = conversation.lines.findIndex((l) => l.id === currentLine.id);
    const next = conversation.lines[index + 1];
    return next ? next.id : null;
  }

  private findLine(conversation: ConversationDefinition, lineId: string): DialogueLine {
    const line = conversation.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new Error(`DialogueSystem: conversation "${conversation.id}" has no line "${lineId}"`);
    }
    return line;
  }

  private applyLineEffects(line: DialogueLine): void {
    if (!conditionsMet(line.conditions, this.state)) return;
    this.applyFlags(line.setFlags);
    this.applyFragments(line.grantsFragmentIds);
    this.applyPresentedFragment(line.presentsFragmentId);
    this.applyJournalUpdates(line.journalUpdates);
  }

  private applyChoiceEffects(choice: DialogueChoice): void {
    this.applyFlags(choice.setFlags);
    this.applyFragments(choice.grantsFragmentIds);
    this.applyPresentedFragment(choice.presentsFragmentId);
    this.applyJournalUpdates(choice.journalUpdates);
  }

  private applyFlags(flags?: Record<string, boolean | string | number>): void {
    if (!flags) return;
    for (const [flag, value] of Object.entries(flags)) {
      this.state.setFlag(flag, value);
      this.events.emit('flag:set', { flag, value });
    }
  }

  private applyFragments(fragmentIds?: string[]): void {
    if (!fragmentIds) return;
    for (const id of fragmentIds) this.fragments.collect(id);
  }

  private applyPresentedFragment(fragmentId?: string): void {
    if (!fragmentId) return;
    this.fragments.markRead(fragmentId);
    this.events.emit('fragment:present', { fragmentId });
  }

  private applyJournalUpdates(updates?: { entryId: string; stage: 0 | 1 | 2 }[]): void {
    if (!updates) return;
    for (const update of updates) this.journal.advanceStage(update.entryId, update.stage);
  }

  private buildView(line: DialogueLine): DialogueLineView {
    const visibleChoices = (line.choices ?? []).filter((choice) =>
      conditionsMet(choice.conditions, this.state)
    );
    return { line, visibleChoices };
  }
}

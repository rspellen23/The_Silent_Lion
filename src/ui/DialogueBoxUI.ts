import type { EventBus } from '@engine/EventBus';
import type { DialogueSystem } from '@engine/dialogue/DialogueSystem';
import type { PortraitManager } from '@engine/portrait/PortraitManager';
import type { SettingsManager } from '@engine/settings/SettingsManager';
import { el, placeholderBadge } from './dom';

const TEXT_SPEED_MS_PER_CHAR: Record<string, number> = {
  slow: 55,
  medium: 28,
  fast: 12,
  instant: 0
};

/**
 * Renders the current dialogue line, speaker name, and any player choices
 * as a DOM overlay at the bottom of the screen. Character portraits are
 * rendered as Phaser sprites (see PortraitRenderer); this component only
 * notifies the given callback which asset to show so main.ts can keep the
 * two in sync without DialogueBoxUI depending on Phaser directly.
 */
export class DialogueBoxUI {
  private root: HTMLElement;
  private speakerEl: HTMLElement;
  private textEl: HTMLElement;
  private choicesEl: HTMLElement;
  private continueButton: HTMLButtonElement;
  private typewriterTimer: number | null = null;
  private fullText = '';

  constructor(
    container: HTMLElement,
    private events: EventBus,
    private dialogue: DialogueSystem,
    private portraits: PortraitManager,
    private settings: SettingsManager,
    private onPortraitChange: (assetId: string | null) => void,
    private onSceneTransition: (sceneId: string) => void
  ) {
    this.root = el('div', { class: 'sl-panel sl-transition', id: 'dialogue-box' });
    this.speakerEl = el('div', { id: 'dialogue-speaker' });
    this.textEl = el('div', { id: 'dialogue-text', role: 'status', 'aria-live': 'polite' });
    this.choicesEl = el('div', { id: 'dialogue-choices', role: 'group', 'aria-label': 'Dialogue choices' });
    this.continueButton = el('button', { id: 'dialogue-continue', type: 'button' }, [
      'Continue'
    ]) as HTMLButtonElement;
    this.continueButton.addEventListener('click', () => this.advanceAndHandleTransition());

    this.root.append(this.speakerEl, this.textEl, this.choicesEl, this.continueButton);
    this.root.style.display = 'none';
    container.append(this.root);

    this.events.on('dialogue:started', () => this.renderCurrent());
    this.events.on('dialogue:line', () => this.renderCurrent());
    this.events.on('dialogue:ended', () => this.hide());
  }

  private hide(): void {
    this.root.style.display = 'none';
    this.onPortraitChange(null);
  }

  private renderCurrent(): void {
    const view = this.dialogue.getCurrentView();
    if (!view) {
      this.hide();
      return;
    }
    this.root.style.display = 'block';

    const character = this.portraits.getCharacter(view.line.speakerId);
    this.speakerEl.replaceChildren(
      ...(character?.placeholder ? [placeholderBadge()] : []),
      character?.displayName ?? view.line.speakerId
    );

    const portraitAssetId = this.portraits.resolvePortraitAssetId(
      view.line.speakerId,
      view.line.expressionId
    );
    this.onPortraitChange(portraitAssetId);

    this.startTypewriter(view.line.text);

    this.choicesEl.replaceChildren();
    this.continueButton.style.display = view.visibleChoices.length > 0 ? 'none' : 'inline-block';

    for (const choice of view.visibleChoices) {
      const button = el('button', { type: 'button' }, [choice.text]) as HTMLButtonElement;
      button.addEventListener('click', () => this.advanceAndHandleTransition(choice.id));
      this.choicesEl.append(button);
    }
  }

  private advanceAndHandleTransition(choiceId?: string): void {
    const result = this.dialogue.advance(choiceId);
    if (result.ended && result.transitionToSceneId) {
      this.onSceneTransition(result.transitionToSceneId);
    }
  }

  private startTypewriter(text: string): void {
    this.fullText = text;
    if (this.typewriterTimer !== null) {
      window.clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    const msPerChar = TEXT_SPEED_MS_PER_CHAR[this.settings.get('textSpeed')] ?? 28;
    if (msPerChar === 0) {
      this.textEl.textContent = text;
      return;
    }
    let index = 0;
    this.textEl.textContent = '';
    this.typewriterTimer = window.setInterval(() => {
      index += 1;
      this.textEl.textContent = this.fullText.slice(0, index);
      if (index >= this.fullText.length && this.typewriterTimer !== null) {
        window.clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
    }, msPerChar);
  }
}

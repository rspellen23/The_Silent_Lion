import type { EventBus } from '@engine/EventBus';
import type { InterpretationPromptSystem } from '@engine/interpretation/InterpretationPromptSystem';
import { el, placeholderBadge } from './dom';

/**
 * Single-select "what does this mean" quiz panel. Distinct from
 * DeductionUI (which is a multi-select fragment-connection screen) —
 * this is one correct option among plausible wrong ones, retried gently
 * on a miss, never a fail state.
 */
export class InterpretationPromptUI {
  private root: HTMLElement;
  private promptEl: HTMLElement;
  private optionsEl: HTMLElement;
  private feedbackEl: HTMLElement;
  private currentPromptId: string | null = null;

  constructor(
    container: HTMLElement,
    events: EventBus,
    private prompts: InterpretationPromptSystem
  ) {
    this.root = el('div', {
      class: 'sl-panel sl-overlay-panel',
      id: 'interpretation-prompt-panel',
      role: 'dialog',
      'aria-label': 'Interpretation'
    });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close' }, [
      'Close'
    ]) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());

    this.promptEl = el('div', { id: 'interpretation-prompt-text' });
    this.optionsEl = el('div', {
      id: 'interpretation-prompt-options',
      role: 'group',
      'aria-label': 'Choose an interpretation'
    });
    this.feedbackEl = el('div', { id: 'interpretation-prompt-feedback', role: 'status', 'aria-live': 'polite' });
    this.feedbackEl.style.display = 'none';

    this.root.append(closeButton, el('h2', {}, ['What does it mean?']), this.promptEl, this.optionsEl, this.feedbackEl);
    this.root.style.display = 'none';
    container.append(this.root);

    events.on('prompt:opened', ({ promptId }) => this.show(promptId));
  }

  private show(promptId: string): void {
    const def = this.prompts.getDefinition(promptId);
    if (!def) return;
    this.currentPromptId = promptId;
    this.feedbackEl.style.display = 'none';

    this.promptEl.replaceChildren(...(def.placeholder ? [placeholderBadge()] : []), def.prompt);
    this.renderOptions(false);
    this.root.style.display = 'block';
  }

  hide(): void {
    this.currentPromptId = null;
    this.root.style.display = 'none';
  }

  private renderOptions(disabled: boolean): void {
    const promptId = this.currentPromptId;
    if (!promptId) return;
    const def = this.prompts.getDefinition(promptId);
    if (!def) return;

    this.optionsEl.replaceChildren(
      ...def.options.map((option) => {
        const button = el('button', { type: 'button' }, [option.text]) as HTMLButtonElement;
        button.disabled = disabled;
        button.addEventListener('click', () => this.select(option.id));
        return button;
      })
    );
  }

  private select(optionId: string): void {
    const promptId = this.currentPromptId;
    if (!promptId) return;
    const result = this.prompts.attempt(promptId, optionId);
    this.feedbackEl.style.display = 'block';
    if (result.success) {
      this.feedbackEl.dataset.outcome = 'success';
      this.feedbackEl.replaceChildren(el('strong', {}, ['✓ ']), result.feedbackText);
      this.renderOptions(true);
    } else {
      this.feedbackEl.dataset.outcome = 'failure';
      this.feedbackEl.replaceChildren(el('strong', {}, ['— Not quite. ']), result.feedbackText);
    }
  }
}

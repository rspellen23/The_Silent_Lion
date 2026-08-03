import type { EventBus } from '@engine/EventBus';
import { el } from './dom';

/** Shows the free-text observation revealed by a hotspot's reveal_observation effect. */
export class ObservationToastUI {
  private root: HTMLElement;
  private textEl: HTMLElement;

  constructor(container: HTMLElement, events: EventBus) {
    this.root = el('div', {
      class: 'sl-panel sl-transition',
      id: 'observation-toast',
      role: 'status',
      'aria-live': 'polite'
    });
    this.textEl = el('div', {});
    const closeButton = el('button', { type: 'button', class: 'sl-close-button' }, ['Close']) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());
    this.root.append(closeButton, this.textEl);
    this.root.style.display = 'none';
    container.append(this.root);

    events.on('observation:revealed', ({ text }) => this.show(text));
  }

  private show(text: string): void {
    this.textEl.textContent = text;
    this.root.style.display = 'block';
  }

  private hide(): void {
    this.root.style.display = 'none';
  }
}

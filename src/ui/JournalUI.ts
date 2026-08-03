import type { EventBus } from '@engine/EventBus';
import type { InsightJournal } from '@engine/journal/InsightJournal';
import { el, placeholderBadge } from './dom';

/**
 * The Insight Journal panel. Every entry lists ALL of its unlocked stages
 * (Observation, Interpretation, Realization) in order — earlier stages are
 * never removed when a later one unlocks, so the player can see how
 * Gloria's understanding evolved.
 */
export class JournalUI {
  private root: HTMLElement;
  private listEl: HTMLElement;
  private visible = false;

  constructor(container: HTMLElement, private events: EventBus, private journal: InsightJournal) {
    this.root = el('div', { class: 'sl-panel sl-overlay-panel', id: 'journal-panel', role: 'dialog', 'aria-label': 'Insight Journal' });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close journal' }, ['Close']) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());
    this.listEl = el('div', { id: 'journal-list' });
    this.root.append(closeButton, el('h2', {}, ['Insight Journal']), this.listEl);
    this.root.style.display = 'none';
    container.append(this.root);

    this.events.on('journal:updated', () => {
      if (this.visible) this.render();
    });
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  show(): void {
    this.visible = true;
    this.render();
    this.root.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = 'none';
  }

  private render(): void {
    const entries = this.journal.getVisibleEntries();
    if (entries.length === 0) {
      this.listEl.replaceChildren(el('p', {}, ['No clues recorded yet.']));
      return;
    }
    this.listEl.replaceChildren(
      ...entries.map((entry) =>
        el('div', { class: 'journal-entry' }, [
          el('h3', {}, [...(entry.placeholder ? [placeholderBadge()] : []), entry.title]),
          ...entry.revealedStages.map((stage) =>
            el('div', { class: 'journal-stage' }, [
              el('div', { class: 'journal-stage-label' }, [stage.label]),
              el('div', {}, [stage.text])
            ])
          )
        ])
      )
    );
  }
}

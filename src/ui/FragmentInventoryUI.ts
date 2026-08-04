import type { EventBus } from '@engine/EventBus';
import type { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { el, placeholderBadge } from './dom';

/**
 * Browsable list of every collected Fragment, independent of an active
 * deduction — players can revisit what they've found at any time.
 * Document-presentation fragments show a read/unread badge; clicking any
 * fragment re-opens its presentation via DocumentReaderUI (both listen to
 * the same fragment:present event).
 */
export class FragmentInventoryUI {
  private root: HTMLElement;
  private listEl: HTMLElement;
  private visible = false;

  constructor(container: HTMLElement, private events: EventBus, private fragments: FragmentSystem) {
    this.root = el('div', {
      class: 'sl-panel sl-overlay-panel',
      id: 'fragment-inventory-panel',
      role: 'dialog',
      'aria-label': 'Fragments'
    });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close fragments' }, [
      'Close'
    ]) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());
    this.listEl = el('div', { id: 'fragment-inventory-list' });
    this.root.append(closeButton, el('h2', {}, ['Fragments']), this.listEl);
    this.root.style.display = 'none';
    container.append(this.root);

    this.events.on('fragment:added', () => {
      if (this.visible) this.render();
    });
    this.events.on('fragment:read', () => {
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
    const collected = this.fragments.getCollectedDefinitions();
    if (collected.length === 0) {
      this.listEl.replaceChildren(el('p', {}, ['No fragments collected yet.']));
      return;
    }
    this.listEl.replaceChildren(
      ...collected.map((def) => {
        const isDocument = def.presentation === 'document';
        const isRead = this.fragments.hasRead(def.id);
        const button = el('button', { class: 'fragment-inventory-item', type: 'button' }, [
          ...(def.placeholder ? [placeholderBadge()] : []),
          ...(isDocument && !isRead ? [el('span', { class: 'fragment-unread-badge' }, ['Unread'])] : []),
          el('strong', {}, [def.name]),
          el('div', {}, [def.description])
        ]) as HTMLButtonElement;
        button.addEventListener('click', () => {
          this.hide();
          this.events.emit('fragment:present', { fragmentId: def.id });
        });
        return button;
      })
    );
  }
}

import type { EventBus } from '@engine/EventBus';
import type { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { el, placeholderBadge } from './dom';
import { renderMarkdownSubset } from './markdown';

/**
 * Opens a single Fragment's presentation. For presentation: 'document'
 * fragments this renders documentBody as Markdown (letters, notebook
 * pages, historical records); every other presentation (card, photograph,
 * artifact, testimony, behavioral) falls back to name + image + description
 * — presentation-specific visual treatment is a Phase 3 polish concern,
 * not required for the mechanic to work. Opening a fragment here always
 * marks it read.
 */
export class DocumentReaderUI {
  private root: HTMLElement;
  private bodyEl: HTMLElement;

  constructor(
    container: HTMLElement,
    events: EventBus,
    private fragments: FragmentSystem,
    private resolveImageUrl: (assetId: string) => string | null
  ) {
    this.root = el('div', {
      class: 'sl-panel sl-overlay-panel',
      id: 'document-reader-panel',
      role: 'dialog',
      'aria-label': 'Fragment'
    });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close' }, [
      'Close'
    ]) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());
    this.bodyEl = el('div', { id: 'document-reader-body' });
    this.root.append(closeButton, this.bodyEl);
    this.root.style.display = 'none';
    container.append(this.root);

    events.on('fragment:present', ({ fragmentId }) => this.show(fragmentId));
  }

  show(fragmentId: string): void {
    const def = this.fragments.getDefinition(fragmentId);
    if (!def) return;
    this.fragments.markRead(fragmentId);

    const imageUrl = this.resolveImageUrl(def.imageAssetId);
    const children: (Node | string)[] = [
      el('h2', {}, [...(def.placeholder ? [placeholderBadge()] : []), def.name]),
      ...(imageUrl ? [el('img', { src: imageUrl, alt: '', class: 'document-reader-image' })] : []),
      el('p', {}, [def.description])
    ];
    if (def.presentation === 'document' && def.documentBody) {
      const documentEl = el('div', { class: 'document-reader-markdown' });
      documentEl.innerHTML = renderMarkdownSubset(def.documentBody);
      children.push(documentEl);
    }
    this.bodyEl.replaceChildren(...children);
    this.root.style.display = 'block';
  }

  hide(): void {
    this.root.style.display = 'none';
  }
}

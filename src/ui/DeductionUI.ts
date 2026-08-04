import type { EventBus } from '@engine/EventBus';
import type { DeductionFramework } from '@engine/deduction/DeductionFramework';
import type { FragmentSystem } from '@engine/fragment/FragmentSystem';
import { el, placeholderBadge } from './dom';

/**
 * The fragment-connection deduction screen. The player toggles two or more
 * collected fragments and submits them; success/failure is communicated
 * with both an icon prefix and text (never color alone), per the
 * accessibility requirement that no deduction depend on color.
 */
export class DeductionUI {
  private root: HTMLElement;
  private promptEl: HTMLElement;
  private fragmentListEl: HTMLElement;
  private feedbackEl: HTMLElement;
  private submitButton: HTMLButtonElement;
  private currentDeductionId: string | null = null;
  private selectedFragmentIds: Set<string> = new Set();

  constructor(
    container: HTMLElement,
    private events: EventBus,
    private deduction: DeductionFramework,
    private fragments: FragmentSystem,
    private resolveImageUrl: (assetId: string) => string | null
  ) {
    this.root = el('div', {
      class: 'sl-panel sl-overlay-panel',
      id: 'deduction-panel',
      role: 'dialog',
      'aria-label': 'Deduction'
    });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close deduction' }, ['Close']) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());

    this.promptEl = el('div', { id: 'deduction-prompt' });
    this.fragmentListEl = el('div', {
      id: 'deduction-fragment-list',
      role: 'group',
      'aria-label': 'Select fragments that support your conclusion'
    });
    this.submitButton = el('button', { id: 'deduction-submit', type: 'button' }, [
      'Submit Deduction'
    ]) as HTMLButtonElement;
    this.submitButton.addEventListener('click', () => this.submit());
    this.feedbackEl = el('div', { id: 'deduction-feedback', role: 'status', 'aria-live': 'polite' });
    this.feedbackEl.style.display = 'none';

    this.root.append(
      closeButton,
      el('h2', {}, ['Form a Deduction']),
      this.promptEl,
      this.fragmentListEl,
      this.submitButton,
      this.feedbackEl
    );
    this.root.style.display = 'none';
    container.append(this.root);

    this.events.on('deduction:opened', ({ deductionId }) => this.show(deductionId));
    this.events.on('fragment:added', () => {
      if (this.currentDeductionId) this.renderFragmentList();
    });
  }

  private show(deductionId: string): void {
    const def = this.deduction.getDefinition(deductionId);
    if (!def) return;
    this.currentDeductionId = deductionId;
    this.selectedFragmentIds.clear();
    this.feedbackEl.style.display = 'none';

    this.promptEl.replaceChildren(
      ...(def.placeholder ? [placeholderBadge()] : []),
      el('p', {}, [def.prompt])
    );
    this.renderFragmentList();
    this.root.style.display = 'block';
  }

  hide(): void {
    this.currentDeductionId = null;
    this.root.style.display = 'none';
  }

  private renderFragmentList(): void {
    const collected = this.fragments.getCollectedDefinitions();
    if (collected.length === 0) {
      this.fragmentListEl.replaceChildren(
        el('p', {}, ['No fragments collected yet — investigate the scene first.'])
      );
      return;
    }
    this.fragmentListEl.replaceChildren(
      ...collected.map((item) => {
        const pressed = this.selectedFragmentIds.has(item.id);
        const imageUrl = this.resolveImageUrl(item.imageAssetId);
        const button = el(
          'button',
          {
            class: 'deduction-fragment-item',
            type: 'button',
            'aria-pressed': String(pressed)
          },
          [
            ...(imageUrl ? [el('img', { src: imageUrl, alt: '', width: '64', height: '64' })] : []),
            el('strong', {}, [item.name]),
            el('div', {}, [item.description])
          ]
        ) as HTMLButtonElement;
        button.addEventListener('click', () => {
          if (this.selectedFragmentIds.has(item.id)) this.selectedFragmentIds.delete(item.id);
          else this.selectedFragmentIds.add(item.id);
          this.renderFragmentList();
        });
        return button;
      })
    );
  }

  private submit(): void {
    if (!this.currentDeductionId) return;
    const result = this.deduction.attempt(this.currentDeductionId, Array.from(this.selectedFragmentIds));
    this.feedbackEl.style.display = 'block';
    if (result.success) {
      this.feedbackEl.dataset.outcome = 'success';
      this.feedbackEl.replaceChildren(
        el('strong', {}, ['✓ Conclusion reached. ']),
        result.conclusionText ?? ''
      );
      this.submitButton.disabled = true;
    } else {
      this.feedbackEl.dataset.outcome = 'failure';
      this.feedbackEl.replaceChildren(el('strong', {}, ['— Not yet. ']), result.hintText ?? '');
    }
  }
}

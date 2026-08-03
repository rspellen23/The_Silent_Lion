import type { EventBus } from '@engine/EventBus';
import type { DeductionFramework } from '@engine/deduction/DeductionFramework';
import type { EvidenceSystem } from '@engine/evidence/EvidenceSystem';
import { el, placeholderBadge } from './dom';

/**
 * The evidence-connection deduction screen. The player toggles two or more
 * collected evidence items and submits them; success/failure is
 * communicated with both an icon prefix and text (never color alone), per
 * the accessibility requirement that no deduction depend on color.
 */
export class DeductionUI {
  private root: HTMLElement;
  private promptEl: HTMLElement;
  private evidenceListEl: HTMLElement;
  private feedbackEl: HTMLElement;
  private submitButton: HTMLButtonElement;
  private currentDeductionId: string | null = null;
  private selectedEvidenceIds: Set<string> = new Set();

  constructor(
    container: HTMLElement,
    private events: EventBus,
    private deduction: DeductionFramework,
    private evidence: EvidenceSystem,
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
    this.evidenceListEl = el('div', {
      id: 'deduction-evidence-list',
      role: 'group',
      'aria-label': 'Select evidence that supports your conclusion'
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
      this.evidenceListEl,
      this.submitButton,
      this.feedbackEl
    );
    this.root.style.display = 'none';
    container.append(this.root);

    this.events.on('deduction:opened', ({ deductionId }) => this.show(deductionId));
    this.events.on('evidence:added', () => {
      if (this.currentDeductionId) this.renderEvidenceList();
    });
  }

  private show(deductionId: string): void {
    const def = this.deduction.getDefinition(deductionId);
    if (!def) return;
    this.currentDeductionId = deductionId;
    this.selectedEvidenceIds.clear();
    this.feedbackEl.style.display = 'none';

    this.promptEl.replaceChildren(
      ...(def.placeholder ? [placeholderBadge()] : []),
      el('p', {}, [def.prompt])
    );
    this.renderEvidenceList();
    this.root.style.display = 'block';
  }

  hide(): void {
    this.currentDeductionId = null;
    this.root.style.display = 'none';
  }

  private renderEvidenceList(): void {
    const collected = this.evidence.getCollectedDefinitions();
    if (collected.length === 0) {
      this.evidenceListEl.replaceChildren(
        el('p', {}, ['No evidence collected yet — investigate the scene first.'])
      );
      return;
    }
    this.evidenceListEl.replaceChildren(
      ...collected.map((item) => {
        const pressed = this.selectedEvidenceIds.has(item.id);
        const imageUrl = this.resolveImageUrl(item.imageAssetId);
        const button = el(
          'button',
          {
            class: 'deduction-evidence-item',
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
          if (this.selectedEvidenceIds.has(item.id)) this.selectedEvidenceIds.delete(item.id);
          else this.selectedEvidenceIds.add(item.id);
          this.renderEvidenceList();
        });
        return button;
      })
    );
  }

  private submit(): void {
    if (!this.currentDeductionId) return;
    const result = this.deduction.attempt(this.currentDeductionId, Array.from(this.selectedEvidenceIds));
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

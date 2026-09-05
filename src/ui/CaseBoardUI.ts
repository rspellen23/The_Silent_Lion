import type { EventBus } from '@engine/EventBus';
import type { CaseBoardSystem } from '@engine/caseboard/CaseBoardSystem';
import type { CaseBoardConnectionCategory } from '@engine/types';
import { el, placeholderBadge } from './dom';

const CATEGORY_LABELS: Record<CaseBoardConnectionCategory, string> = {
  presence: 'Presence',
  opportunity: 'Opportunity',
  motive: 'Motive',
  concealment: 'Concealment',
  contradiction: 'Contradiction'
};

const CATEGORY_ORDER: CaseBoardConnectionCategory[] = [
  'presence',
  'opportunity',
  'motive',
  'concealment',
  'contradiction'
];

/**
 * The Case Board: a per-subject view of every connection (presence /
 * opportunity / motive / concealment / contradiction) the investigation
 * has revealed. Purely a presentation layer over CaseBoardSystem, which
 * derives visibility from existing GameState — nothing here is stored
 * independently.
 */
export class CaseBoardUI {
  private root: HTMLElement;
  private subjectsEl: HTMLElement;
  private connectionsEl: HTMLElement;
  private visible = false;
  private selectedSubjectId: string | null = null;

  constructor(container: HTMLElement, private events: EventBus, private caseBoard: CaseBoardSystem) {
    this.root = el('div', {
      class: 'sl-panel sl-overlay-panel',
      id: 'case-board-panel',
      role: 'dialog',
      'aria-label': 'Case Board'
    });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close case board' }, [
      'Close'
    ]) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());

    this.subjectsEl = el('div', { id: 'case-board-subjects', role: 'group', 'aria-label': 'Select a suspect' });
    this.connectionsEl = el('div', { id: 'case-board-connections' });

    this.root.append(closeButton, el('h2', {}, ['Case Board']), this.subjectsEl, this.connectionsEl);
    this.root.style.display = 'none';
    container.append(this.root);

    for (const event of ['fragment:added', 'fragment:read', 'flag:set', 'journal:updated', 'deduction:success'] as const) {
      this.events.on(event, () => {
        if (this.visible) this.render();
      });
    }
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
    const visibleSubjects = this.caseBoard.getVisibleSubjectIds();
    if (!this.selectedSubjectId || !visibleSubjects.includes(this.selectedSubjectId)) {
      this.selectedSubjectId = visibleSubjects[0] ?? null;
    }

    if (visibleSubjects.length === 0) {
      this.subjectsEl.replaceChildren();
      this.connectionsEl.replaceChildren(el('p', {}, ['No connections established yet.']));
      return;
    }

    this.subjectsEl.replaceChildren(
      ...visibleSubjects.map((subjectId) => {
        const button = el('button', { type: 'button', 'aria-pressed': String(subjectId === this.selectedSubjectId) }, [
          subjectId
        ]) as HTMLButtonElement;
        button.addEventListener('click', () => {
          this.selectedSubjectId = subjectId;
          this.render();
        });
        return button;
      })
    );

    const connections = this.selectedSubjectId ? this.caseBoard.getVisibleConnections(this.selectedSubjectId) : [];
    const groups = CATEGORY_ORDER.map((category) => ({
      category,
      items: connections.filter((c) => c.category === category)
    })).filter((group) => group.items.length > 0);

    this.connectionsEl.replaceChildren(
      ...groups.map((group) =>
        el('div', { class: 'case-board-category' }, [
          el('div', { class: 'case-board-category-label' }, [CATEGORY_LABELS[group.category]]),
          ...group.items.map((item) =>
            el('div', { class: 'case-board-connection' }, [
              ...(item.placeholder ? [placeholderBadge()] : []),
              item.summaryText
            ])
          )
        ])
      )
    );
  }
}

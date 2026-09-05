import type { EventBus } from '@engine/EventBus';
import type { SaveManager } from '@engine/save/SaveManager';
import type { DeductionFramework } from '@engine/deduction/DeductionFramework';
import type { SaveSlotId } from '@engine/types';
import { el } from './dom';

const MANUAL_SLOTS: SaveSlotId[] = ['slot1', 'slot2', 'slot3'];

/** Always-visible control bar during gameplay: Journal, Fragments, Case Board, Deduction, manual save slots, Settings. */
export class HudBar {
  private deductionButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    events: EventBus,
    onJournalToggle: () => void,
    onFragmentsToggle: () => void,
    onCaseBoardToggle: () => void,
    onSettingsToggle: () => void,
    saveManager: SaveManager,
    deduction: DeductionFramework,
    /** Undefined when no deduction exists yet for the current content batch — the button is then disabled rather than wired to a nonexistent ID. */
    deductionId: string | undefined,
    getSceneTitle: () => string,
    onSaveComplete: (slotId: SaveSlotId) => void
  ) {
    const root = el('div', { id: 'hud-bar' });

    const journalButton = el('button', { type: 'button', 'aria-label': 'Open Insight Journal' }, ['Journal']) as HTMLButtonElement;
    journalButton.addEventListener('click', onJournalToggle);

    const fragmentsButton = el('button', { type: 'button', 'aria-label': 'Open Fragments' }, ['Fragments']) as HTMLButtonElement;
    fragmentsButton.addEventListener('click', onFragmentsToggle);

    const caseBoardButton = el('button', { type: 'button', 'aria-label': 'Open case board' }, ['Case Board']) as HTMLButtonElement;
    caseBoardButton.addEventListener('click', onCaseBoardToggle);

    this.deductionButton = el('button', { type: 'button', 'aria-label': 'Open deduction screen' }, [
      'Deduction'
    ]) as HTMLButtonElement;
    if (deductionId) {
      const id = deductionId;
      this.deductionButton.addEventListener('click', () => deduction.open(id));
      const refreshDeductionAvailability = () => {
        this.deductionButton.disabled = !deduction.isAvailable(id) || deduction.isCompleted(id);
      };
      refreshDeductionAvailability();
      events.on('fragment:added', refreshDeductionAvailability);
      events.on('deduction:success', refreshDeductionAvailability);
    } else {
      this.deductionButton.disabled = true;
    }

    const saveButtons = MANUAL_SLOTS.map((slotId, i) => {
      const button = el('button', { type: 'button', 'aria-label': `Manual save to slot ${i + 1}` }, [
        `Save ${i + 1}`
      ]) as HTMLButtonElement;
      button.addEventListener('click', () => {
        saveManager.save(slotId, getSceneTitle());
        onSaveComplete(slotId);
      });
      return button;
    });

    const settingsButton = el('button', { type: 'button', 'aria-label': 'Open settings' }, ['Settings']) as HTMLButtonElement;
    settingsButton.addEventListener('click', onSettingsToggle);

    root.append(journalButton, fragmentsButton, caseBoardButton, this.deductionButton, ...saveButtons, settingsButton);
    container.append(root);
  }
}

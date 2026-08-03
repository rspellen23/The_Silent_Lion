import type { EventBus } from '@engine/EventBus';
import type { SaveManager } from '@engine/save/SaveManager';
import type { DeductionFramework } from '@engine/deduction/DeductionFramework';
import type { SaveSlotId } from '@engine/types';
import { el } from './dom';

const MANUAL_SLOTS: SaveSlotId[] = ['slot1', 'slot2', 'slot3'];

/** Always-visible control bar during gameplay: Journal, Deduction, manual save slots, Settings. */
export class HudBar {
  private deductionButton: HTMLButtonElement;

  constructor(
    container: HTMLElement,
    events: EventBus,
    onJournalToggle: () => void,
    onSettingsToggle: () => void,
    saveManager: SaveManager,
    deduction: DeductionFramework,
    deductionId: string,
    getSceneTitle: () => string,
    onSaveComplete: (slotId: SaveSlotId) => void
  ) {
    const root = el('div', { id: 'hud-bar' });

    const journalButton = el('button', { type: 'button', 'aria-label': 'Open Insight Journal' }, ['Journal']) as HTMLButtonElement;
    journalButton.addEventListener('click', onJournalToggle);

    this.deductionButton = el('button', { type: 'button', 'aria-label': 'Open deduction screen' }, [
      'Deduction'
    ]) as HTMLButtonElement;
    this.deductionButton.addEventListener('click', () => deduction.open(deductionId));
    const refreshDeductionAvailability = () => {
      this.deductionButton.disabled = !deduction.isAvailable(deductionId) || deduction.isCompleted(deductionId);
    };
    refreshDeductionAvailability();
    events.on('evidence:added', refreshDeductionAvailability);
    events.on('deduction:success', refreshDeductionAvailability);

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

    root.append(journalButton, this.deductionButton, ...saveButtons, settingsButton);
    container.append(root);
  }
}

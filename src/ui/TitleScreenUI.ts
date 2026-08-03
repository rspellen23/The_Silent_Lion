import type { SaveManager } from '@engine/save/SaveManager';
import type { SaveGame } from '@engine/types';
import { el, placeholderBadge } from './dom';

/**
 * Title screen: New Game, Resume (most recent save across all slots), and
 * the three manual save slots. Resume/slot buttons are disabled — not
 * hidden — when empty, so keyboard/screen-reader users can discover them.
 */
export class TitleScreenUI {
  private root: HTMLElement;

  constructor(
    container: HTMLElement,
    private saveManager: SaveManager,
    private onNewGame: () => void,
    private onLoad: (saveGame: SaveGame) => void,
    private onOpenSettings: () => void
  ) {
    this.root = el('div', { id: 'title-screen' });
    container.append(this.root);
    this.render();
  }

  show(): void {
    this.render();
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  private render(): void {
    const mostRecent = this.saveManager.getMostRecentSave();
    const manualSlots = this.saveManager.listManualSlots();

    const newGameButton = el('button', { type: 'button' }, ['New Game']) as HTMLButtonElement;
    newGameButton.addEventListener('click', () => this.onNewGame());

    const resumeButton = el('button', { type: 'button' }, [
      mostRecent ? `Resume — ${mostRecent.sceneTitleAtSave}` : 'Resume'
    ]) as HTMLButtonElement;
    resumeButton.disabled = !mostRecent;
    if (mostRecent) {
      resumeButton.addEventListener('click', () => this.onLoad(mostRecent));
    }

    const slotButtons = manualSlots.map((slot) => {
      const button = el('button', { type: 'button' }, [
        slot.occupied ? `Load ${slot.slotId} — ${slot.sceneTitleAtSave}` : `Load ${slot.slotId} (empty)`
      ]) as HTMLButtonElement;
      button.disabled = !slot.occupied;
      if (slot.occupied) {
        button.addEventListener('click', () => {
          const saveGame = this.saveManager.load(slot.slotId);
          if (saveGame) this.onLoad(saveGame);
        });
      }
      return button;
    });

    const settingsButton = el('button', { type: 'button' }, ['Settings']) as HTMLButtonElement;
    settingsButton.addEventListener('click', () => this.onOpenSettings());

    this.root.replaceChildren(
      el('h1', {}, ['The Silent Lion']),
      el('p', {}, [placeholderBadge(), 'Phase 1 framework — vertical slice, no final story content']),
      newGameButton,
      resumeButton,
      ...slotButtons,
      settingsButton
    );
  }
}

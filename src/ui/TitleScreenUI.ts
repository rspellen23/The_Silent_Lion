import type { SaveManager } from '@engine/save/SaveManager';
import type { SaveGame } from '@engine/types';
import { el } from './dom';
import titleBackgroundUrl from '../../assets/imgs/harry-potter-the-silent-lion-title-screen.jpg';

/**
 * Title screen: New Game, Continue (most recent save across all slots), and
 * Settings, over the Story Bible key-art background. Manual save slots are
 * offered as a smaller secondary row beneath the three primary buttons —
 * disabled rather than hidden when empty, so keyboard/screen-reader users
 * can discover them.
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
    this.root.style.backgroundImage = `url(${titleBackgroundUrl})`;
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

    const newGameButton = el('button', { type: 'button', class: 'title-primary-button' }, [
      'New Game'
    ]) as HTMLButtonElement;
    newGameButton.addEventListener('click', () => this.onNewGame());

    const continueButton = el('button', { type: 'button', class: 'title-primary-button' }, [
      mostRecent ? `Continue — ${mostRecent.sceneTitleAtSave}` : 'Continue'
    ]) as HTMLButtonElement;
    continueButton.disabled = !mostRecent;
    if (mostRecent) {
      continueButton.addEventListener('click', () => this.onLoad(mostRecent));
    }

    const settingsButton = el('button', { type: 'button', class: 'title-primary-button' }, [
      'Settings'
    ]) as HTMLButtonElement;
    settingsButton.addEventListener('click', () => this.onOpenSettings());

    const slotButtons = manualSlots.map((slot) => {
      const button = el('button', { type: 'button', class: 'title-slot-button' }, [
        slot.occupied ? `${slot.slotId} — ${slot.sceneTitleAtSave}` : `${slot.slotId} (empty)`
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

    this.root.replaceChildren(
      el('h1', { class: 'sr-only' }, ['Harry Potter and the Silent Lion']),
      el('div', { id: 'title-screen-menu' }, [
        newGameButton,
        continueButton,
        settingsButton,
        el('div', { id: 'title-screen-slots' }, slotButtons)
      ])
    );
  }
}

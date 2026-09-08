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
    private onOpenSettings: () => void,
    private onNavigate: () => void
  ) {
    this.root = el('div', { id: 'title-screen' });
    this.root.style.backgroundImage = `url(${titleBackgroundUrl})`;
    this.root.style.display = 'none';
    container.append(this.root);
    this.render();
  }

  /** Hidden until StartupScreenUI's first-gesture gate fires (see main.ts).
   * Fades in — crossfading with StartupScreenUI's own fade-out — rather
   * than cutting straight to the background image. */
  show(): void {
    this.render();
    this.root.style.display = 'flex';
    // Force a reflow so the browser registers the pre-transition
    // opacity:0 state before the class change animates it to 1 — without
    // this the two style changes would collapse into one and skip the
    // transition entirely.
    void this.root.offsetWidth;
    this.root.classList.add('title-screen-visible');
  }

  hide(): void {
    this.root.style.display = 'none';
    this.root.classList.remove('title-screen-visible');
  }

  /** Plays the menu-navigation tone on hover and keyboard focus alike, so
   * mouse and keyboard/screen-reader users get the same feedback moving
   * between buttons. */
  private attachNavSound(button: HTMLButtonElement): void {
    button.addEventListener('mouseenter', () => this.onNavigate());
    button.addEventListener('focus', () => this.onNavigate());
  }

  private render(): void {
    const mostRecent = this.saveManager.getMostRecentSave();
    const manualSlots = this.saveManager.listManualSlots();

    const newGameButton = el('button', { type: 'button', class: 'title-primary-button' }, [
      'New Game'
    ]) as HTMLButtonElement;
    newGameButton.addEventListener('click', () => this.onNewGame());
    this.attachNavSound(newGameButton);

    const continueButton = el('button', { type: 'button', class: 'title-primary-button' }, [
      mostRecent ? `Continue — ${mostRecent.sceneTitleAtSave}` : 'Continue'
    ]) as HTMLButtonElement;
    continueButton.disabled = !mostRecent;
    if (mostRecent) {
      continueButton.addEventListener('click', () => this.onLoad(mostRecent));
    }
    this.attachNavSound(continueButton);

    const settingsButton = el('button', { type: 'button', class: 'title-primary-button' }, [
      'Settings'
    ]) as HTMLButtonElement;
    settingsButton.addEventListener('click', () => this.onOpenSettings());
    this.attachNavSound(settingsButton);

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
        this.attachNavSound(button);
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

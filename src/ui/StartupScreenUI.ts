import { el } from './dom';

/**
 * Pre-title splash: a brief "press any key" gate shown once, before the
 * main title screen. Two jobs: (1) gives the required-by-every-browser
 * first user gesture a visible, intentional home instead of a silent
 * hidden requirement, and (2) that same gesture is what the title theme's
 * playback is deferred until, so the reveal of the title screen and the
 * music starting land on the same beat. No wordmark here — the title
 * screen's key art already carries the logo, so this stays just the
 * prompt and crossfades into that reveal rather than repeating it.
 */
export class StartupScreenUI {
  private root: HTMLElement;
  private dismissed = false;

  constructor(container: HTMLElement, private onBegin: () => void) {
    this.root = el('div', { id: 'startup-screen' }, [
      el('div', { id: 'startup-screen-prompt' }, ['Click or press any key to begin'])
    ]);
    container.append(this.root);

    const begin = () => {
      if (this.dismissed) return;
      this.dismissed = true;
      document.removeEventListener('pointerdown', begin);
      document.removeEventListener('keydown', begin);

      // Crossfade: start the title screen's fade-in immediately and fade
      // this screen out in parallel, rather than cutting to black first.
      this.root.style.pointerEvents = 'none';
      const reducedMotion = document.documentElement.getAttribute('data-reduced-motion') === 'true';
      if (reducedMotion) {
        this.root.style.display = 'none';
      } else {
        this.root.addEventListener('transitionend', () => { this.root.style.display = 'none'; }, { once: true });
        this.root.classList.add('startup-screen-fading');
      }
      this.onBegin();
    };
    document.addEventListener('pointerdown', begin);
    document.addEventListener('keydown', begin);
  }
}

import type { SettingsManager } from '@engine/settings/SettingsManager';
import type { SaveManager } from '@engine/save/SaveManager';
import type { GameSettings } from '@engine/types';
import { el } from './dom';

const TEXT_SIZE_SCALE: Record<GameSettings['textSize'], string> = {
  small: '0.85',
  medium: '1',
  large: '1.3'
};

/**
 * Settings panel covering the Phase 1 accessibility/audio requirements:
 * text size, text speed, high contrast, reduced motion, per-channel volume,
 * mute, and a reset-progress action. Every control is a native, labeled
 * HTML form element so keyboard navigation and screen readers work without
 * extra wiring.
 */
export class SettingsUI {
  private root: HTMLElement;
  private visible = false;

  constructor(
    container: HTMLElement,
    private settings: SettingsManager,
    private saveManager: SaveManager,
    private onReset: () => void
  ) {
    this.root = el('div', {
      class: 'sl-panel sl-overlay-panel',
      id: 'settings-panel',
      role: 'dialog',
      'aria-label': 'Settings'
    });
    const closeButton = el('button', { class: 'sl-close-button', type: 'button', 'aria-label': 'Close settings' }, ['Close']) as HTMLButtonElement;
    closeButton.addEventListener('click', () => this.hide());
    this.root.append(closeButton, el('h2', {}, ['Settings']));
    this.root.style.display = 'none';
    container.append(this.root);

    this.buildControls();
    this.applyDocumentAttributes();
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  show(): void {
    this.visible = true;
    this.root.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.root.style.display = 'none';
  }

  private applyDocumentAttributes(): void {
    document.documentElement.setAttribute('data-high-contrast', String(this.settings.get('highContrast')));
    document.documentElement.setAttribute('data-reduced-motion', String(this.settings.get('reducedMotion')));
    document.documentElement.style.setProperty('--sl-font-scale', TEXT_SIZE_SCALE[this.settings.get('textSize')]);
  }

  private buildControls(): void {
    const s = this.settings;

    this.root.append(
      this.selectRow('text-size', 'Text size', s.get('textSize'), [
        ['small', 'Small'],
        ['medium', 'Medium'],
        ['large', 'Large']
      ], (value) => {
        s.set('textSize', value as GameSettings['textSize']);
        this.applyDocumentAttributes();
      }),
      this.selectRow('text-speed', 'Text speed', s.get('textSpeed'), [
        ['slow', 'Slow'],
        ['medium', 'Medium'],
        ['fast', 'Fast'],
        ['instant', 'Instant']
      ], (value) => s.set('textSpeed', value as GameSettings['textSpeed'])),
      this.checkboxRow('high-contrast', 'High-contrast UI', s.get('highContrast'), (checked) => {
        s.set('highContrast', checked);
        this.applyDocumentAttributes();
      }),
      this.checkboxRow('reduced-motion', 'Reduced motion', s.get('reducedMotion'), (checked) => {
        s.set('reducedMotion', checked);
        this.applyDocumentAttributes();
      }),
      this.rangeRow('music-volume', 'Music volume', s.get('musicVolume'), (v) => s.set('musicVolume', v)),
      this.rangeRow('ambient-volume', 'Ambient volume', s.get('ambientVolume'), (v) => s.set('ambientVolume', v)),
      this.rangeRow('sfx-volume', 'Sound effects volume', s.get('sfxVolume'), (v) => s.set('sfxVolume', v)),
      this.checkboxRow('mute', 'Mute all audio', s.get('muted'), (checked) => s.set('muted', checked)),
      this.resetRow()
    );
  }

  private selectRow(
    id: string,
    labelText: string,
    current: string,
    options: [string, string][],
    onChange: (value: string) => void
  ): HTMLElement {
    const select = el(
      'select',
      { id },
      options.map(([value, text]) => {
        const opt = el('option', { value }, [text]) as HTMLOptionElement;
        if (value === current) opt.selected = true;
        return opt;
      })
    ) as HTMLSelectElement;
    select.addEventListener('change', () => onChange(select.value));
    return el('div', { class: 'settings-row' }, [el('label', { for: id }, [labelText]), select]);
  }

  private checkboxRow(
    id: string,
    labelText: string,
    checked: boolean,
    onChange: (checked: boolean) => void
  ): HTMLElement {
    const input = el('input', { id, type: 'checkbox' }) as HTMLInputElement;
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    return el('div', { class: 'settings-row' }, [el('label', { for: id }, [labelText]), input]);
  }

  private rangeRow(
    id: string,
    labelText: string,
    value: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const input = el('input', {
      id,
      type: 'range',
      min: '0',
      max: '1',
      step: '0.05',
      'aria-valuetext': `${Math.round(value * 100)} percent`
    }) as HTMLInputElement;
    input.value = String(value);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      input.setAttribute('aria-valuetext', `${Math.round(v * 100)} percent`);
      onChange(v);
    });
    return el('div', { class: 'settings-row' }, [el('label', { for: id }, [labelText]), input]);
  }

  private resetRow(): HTMLElement {
    const button = el('button', { type: 'button', id: 'reset-progress' }, ['Reset progress']) as HTMLButtonElement;
    button.addEventListener('click', () => {
      const confirmed = window.confirm(
        'Reset all saved progress? This clears the autosave and all manual save slots. This cannot be undone.'
      );
      if (!confirmed) return;
      this.saveManager.resetAllProgress();
      this.onReset();
    });
    return el('div', { class: 'settings-row' }, [
      el('label', {}, ['Progress']),
      button
    ]);
  }
}

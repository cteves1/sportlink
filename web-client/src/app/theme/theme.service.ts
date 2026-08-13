import { Injectable, signal } from '@angular/core';

const DARK_CLASS = 'app-dark';
const STORAGE_KEY = 'theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.getInitialPreference());

  constructor() {
    this.applyTheme(this.isDark());
  }

  toggle(): void {
    this.setDark(!this.isDark());
  }

  setDark(value: boolean): void {
    this.isDark.set(value);
    this.applyTheme(value);
    localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle(DARK_CLASS, isDark);
  }

  private getInitialPreference(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}

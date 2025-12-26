import { Injectable, signal, computed, effect } from '@angular/core';

export type SupportedLanguage = 'en' | 'tr';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'tr'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const STORAGE_KEY = 'cinetrack_language';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private readonly languageSignal = signal<SupportedLanguage>(this.loadLanguage());

    readonly language = computed(() => this.languageSignal());

    /**
     * Language code to pass to API calls (en, tr)
     */
    readonly langCode = computed(() => this.languageSignal());

    constructor() {
        // Persist language changes to localStorage
        effect(() => {
            const lang = this.languageSignal();
            localStorage.setItem(STORAGE_KEY, lang);
        });
    }

    private loadLanguage(): SupportedLanguage {
        if (typeof localStorage === 'undefined') {
            return DEFAULT_LANGUAGE;
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
            return stored as SupportedLanguage;
        }

        // Try to detect browser language
        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
            return browserLang as SupportedLanguage;
        }

        return DEFAULT_LANGUAGE;
    }

    setLanguage(lang: SupportedLanguage): void {
        if (SUPPORTED_LANGUAGES.includes(lang)) {
            this.languageSignal.set(lang);
        }
    }

    toggleLanguage(): void {
        const current = this.languageSignal();
        const next = current === 'en' ? 'tr' : 'en';
        this.setLanguage(next);
    }
}

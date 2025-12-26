import { Injectable, computed, inject } from '@angular/core';
import { LanguageService, SupportedLanguage } from '../services/language.service';

import enTranslations from './en.json';
import trTranslations from './tr.json';

export type TranslationKey = string;

const translations: Record<SupportedLanguage, Record<string, unknown>> = {
    en: enTranslations,
    tr: trTranslations
};

@Injectable({
    providedIn: 'root'
})
export class TranslationService {
    private languageService = inject(LanguageService);

    readonly currentTranslations = computed(() => {
        const lang = this.languageService.language();
        return translations[lang];
    });

    /**
     * Get a translated string by dot-notation key
     * Example: t('nav.home') returns 'Home' or 'Ana Sayfa'
     */
    t(key: string, params?: Record<string, string | number>): string {
        const lang = this.languageService.language();
        const keys = key.split('.');
        let value: unknown = translations[lang];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                // Fallback to English if key not found
                value = this.getNestedValue(translations.en, keys);
                break;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation key '${key}' not found`);
            return key;
        }

        // Replace placeholders like {{count}}
        if (params) {
            return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
                return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
            });
        }

        return value;
    }

    private getNestedValue(obj: Record<string, unknown>, keys: string[]): unknown {
        let value: unknown = obj;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = (value as Record<string, unknown>)[k];
            } else {
                return undefined;
            }
        }
        return value;
    }
}

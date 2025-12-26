import { Component, ChangeDetectionStrategy, inject, signal, computed, EffectRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoodService, MoodVector } from '../../../core/services/mood.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/i18n';

@Component({
    selector: 'app-mood-widget',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './mood-widget.component.html',
    styleUrl: './mood-widget.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodWidgetComponent {
    private moodService = inject(MoodService);

    // Convert observable to signal
    mood = toSignal(this.moodService.currentMood$);

    dominantMoodInfo = computed(() => {
        const m = this.mood();
        if (!m) return null;

        // Find max value key
        let maxKey = '';
        let maxValue = -1;

        for (const [key, value] of Object.entries(m)) {
            if (typeof value === 'number' && value > maxValue) {
                maxValue = value;
                maxKey = key;
            }
        }

        return {
            ...this.getMoodConfig(maxKey),
            key: maxKey,
            value: Math.round(maxValue)
        };
    });

    private getMoodConfig(moodKey: string) {
        const configs: Record<string, { icon: string; color: string; label: string; description: string }> = {
            adrenaline: {
                icon: 'local_fire_department',
                color: '#ff4b4b',
                label: 'Adrenaline',
                description: 'High energy and thrill-seeking'
            },
            melancholy: {
                icon: 'rainy',
                color: '#4b7bff',
                label: 'Melancholic',
                description: 'Reflective and emotional depth'
            },
            joy: {
                icon: 'sentiment_very_satisfied',
                color: '#ffd93d',
                label: 'Joyful',
                description: 'Light-hearted and uplifting'
            },
            tension: {
                icon: 'warning',
                color: '#ff8c42',
                label: 'Tense',
                description: 'Suspenseful and gripping'
            },
            intellect: {
                icon: 'psychology',
                color: '#6c5ce7',
                label: 'Intellectual',
                description: 'Thought-provoking and complex'
            },
            romance: {
                icon: 'favorite',
                color: '#ff7675',
                label: 'Romantic',
                description: 'Passionate and sentimental'
            },
            wonder: {
                icon: 'auto_awesome',
                color: '#a29bfe',
                label: 'Wonder',
                description: 'Imaginative and magical'
            },
            nostalgia: {
                icon: 'history',
                color: '#dfe6e9',
                label: 'Nostalgic',
                description: 'Longing for the past'
            },
            darkness: {
                icon: 'dark_mode',
                color: '#636e72',
                label: 'Dark',
                description: 'Grim and intense'
            },
            inspiration: {
                icon: 'lightbulb',
                color: '#fdcb6e',
                label: 'Inspired',
                description: 'Uplifting and motivating'
            }
        };

        return configs[moodKey] || {
            icon: 'movie',
            color: '#fff',
            label: 'Neutral',
            description: 'Balanced mood profile'
        };
    }
}

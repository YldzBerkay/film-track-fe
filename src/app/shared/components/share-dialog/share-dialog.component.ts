import { Component, ChangeDetectionStrategy, signal, inject, ViewChild, ElementRef, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoodVector } from '../../../core/services/mood.service';
import { UserProfile, Badge } from '../../../core/services/user.service';
import { MoodChartComponent } from '../mood-chart/mood-chart.component';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-share-dialog',
    standalone: true,
    imports: [CommonModule, MoodChartComponent],
    templateUrl: './share-dialog.component.html',
    styleUrl: './share-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareDialogComponent {
    isOpen = input<boolean>(false);
    profile = input<UserProfile | null>(null);
    moodData = input<MoodVector | null>(null);
    badges = input<Badge[]>([]);
    close = input<() => void>(() => { });

    @ViewChild('captureArea') captureArea!: ElementRef<HTMLDivElement>;
    isGenerating = signal(false);
    currentDate = new Date();

    closeDialog(e?: Event) {
        if (e) e.stopPropagation();
        this.close()();
    }

    async downloadImage() {
        if (this.isGenerating()) return;
        this.isGenerating.set(true);

        try {
            const element = this.captureArea.nativeElement;
            const canvas = await html2canvas(element, {
                backgroundColor: '#14181c',
                scale: 2, // High resolution
                logging: false,
                useCORS: true // For images
            });

            const link = document.createElement('a');
            link.download = `cinetrack-mood-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to generate image', err);
        } finally {
            this.isGenerating.set(false);
        }
    }

    async shareProfile() {
        const profile = this.profile();
        if (!profile) return;

        const url = `${window.location.origin}/u/${profile.user.username}`;
        const text = `Check out my movie mood on CineTrack! My current vibe is ${this.primaryMood}. 🎬✨`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My CineTrack Mood',
                    text: text,
                    url: url
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(`${text} ${url}`);
            alert('Link copied to clipboard!');
        }
    }

    // Helper to get primary mood string
    get primaryMood(): string {
        const data = this.moodData();
        if (!data) return 'Movie Buff';

        // Find key with max value
        return Object.entries(data).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    // Identify top badges (earned)
    get topBadges(): Badge[] {
        return this.badges().filter(b => b.earnedAt).slice(0, 3);
    }
}

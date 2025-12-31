import { Component, Input, OnInit, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService, TasteMatchResult } from '../../../core/services/match.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { TranslatePipe } from '../../../core/i18n';

@Component({
    selector: 'app-taste-match',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './taste-match.component.html',
    styleUrls: ['./taste-match.component.scss'],
    animations: [
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(20px)' }),
                animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ]),
        trigger('scoreReveal', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.5)' }),
                animate('600ms 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
            ])
        ]),
        trigger('pulse', [
            state('start', style({ transform: 'scale(1)' })),
            state('end', style({ transform: 'scale(1.05)' })),
            transition('start <=> end', animate('800ms ease-in-out'))
        ])
    ]
})
export class TasteMatchComponent implements OnChanges {
    @Input() targetUserId!: string;
    @Input() targetUsername?: string;

    result = signal<TasteMatchResult | null>(null);
    isLoading = signal(false);
    error = signal<string | null>(null);
    pulseState = signal<'start' | 'end'>('start');

    constructor(private matchService: MatchService) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['targetUserId'] && this.targetUserId) {
            this.loadTasteMatch();
        }
    }

    loadTasteMatch() {
        this.isLoading.set(true);
        this.error.set(null);

        this.matchService.getTasteMatch(this.targetUserId).subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.result.set(res.data);
                    // Start pulse animation for high scores
                    if (res.data.matchScore >= 70) {
                        this.startPulse();
                    }
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Failed to calculate taste match');
                this.isLoading.set(false);
            }
        });
    }

    private startPulse() {
        setInterval(() => {
            this.pulseState.update(s => s === 'start' ? 'end' : 'start');
        }, 1600);
    }

    getScoreColor(score: number): string {
        if (score >= 90) return '#10b981'; // Emerald
        if (score >= 70) return '#3b82f6'; // Blue
        if (score >= 50) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    }

    getVerdictClass(verdict: string): string {
        switch (verdict) {
            case 'Cinematic Soulmates': return 'soulmates';
            case 'Great Taste': return 'great';
            case 'Compatible': return 'compatible';
            default: return 'different';
        }
    }
}

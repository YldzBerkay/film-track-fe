
import { Component, input, output, computed, ViewChild, ElementRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { TasteMatchResult } from '../../../../core/services/match.service';
import { MoodChartComponent } from '../../../../shared/components/mood-chart/mood-chart.component';
import { TranslatePipe } from '../../../../core/i18n';
import { MoodVector } from '../../../../core/services/mood.service';
import html2canvas from 'html2canvas';

const DIMENSION_ORDER: (keyof MoodVector)[] = [
    'adrenaline', 'joy', 'romance', 'wonder', 'inspiration',
    'intellect', 'nostalgia', 'melancholy', 'darkness', 'tension'
];

@Component({
    selector: 'app-match-dialog',
    standalone: true,
    imports: [CommonModule, MoodChartComponent, TranslatePipe],
    templateUrl: './match-dialog.component.html',
    styleUrl: './match-dialog.component.scss',
    animations: [
        trigger('dialogEnter', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translate(-50%, -48%) scale(0.95)' }),
                animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'translate(-50%, -48%) scale(0.95)' }))
            ])
        ]),
        trigger('backdropEnter', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('popIn', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.8) translateY(10px)' }),
                animate('400ms 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
            ])
        ])
    ]
})
export class MatchDialogComponent implements OnInit {
    result = input<TasteMatchResult | null>(null);
    isOpen = input<boolean>(false);
    close = output<void>();

    @ViewChild('dialogContent') dialogContent!: ElementRef<HTMLDivElement>;

    // Computed Vectors using robust mapping
    userVector = computed(() => this.mapVector(this.result()?.radarData?.user));
    compareVector = computed(() => this.mapVector(this.result()?.radarData?.target));

    ngOnInit(): void {
        const res = this.result();
        if (res && res.matchScore > 75) {
            this.triggerConfetti();
        }
    }

    // Refactored Data Mapping
    private mapVector(values?: number[]): MoodVector | null {
        if (!values || values.length !== 10) return null;

        // Dynamically map array values to keys based on backend order
        return DIMENSION_ORDER.reduce((acc, key, index) => {
            acc[key] = values[index];
            return acc;
        }, {} as MoodVector);
    }

    // Confetti Implementation (handled by CSS)
    triggerConfetti() {
        // CSS-based confetti is triggered via template
    }

    async shareMatch() {
        if (!this.dialogContent) return;

        try {
            const element = this.dialogContent.nativeElement;
            const canvas = await html2canvas(element, {
                backgroundColor: '#0d1117',
                scale: 2,
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    // Remove action buttons from the clone
                    const actions = clonedDoc.querySelector('.dialog-actions');
                    if (actions) actions.remove();
                }
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File([blob], 'taste-match.png', { type: 'image/png' });

                if (navigator.share && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'My Taste Match',
                        text: `I have a ${this.result()?.matchScore}% match with this user! Check out our cinematic compatibility.`
                    });
                } else {
                    // Fallback: Copy image to clipboard
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        alert('Image copied to clipboard!');
                    } catch (e) {
                        console.error('Clipboard failed', e);
                        // Final fallback: download
                        const link = document.createElement('a');
                        link.download = 'taste-match.png';
                        link.href = canvas.toDataURL();
                        link.click();
                    }
                }
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    }

    onBackdropClick() {
        this.close.emit();
    }
}

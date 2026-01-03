import { Component, EventEmitter, Input, Output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { WatchedListService, WatchedReportsResponse } from '../../../core/services/watched-list.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { GenreTranslatePipe } from '../../pipes/genre-translate.pipe';
import { LanguageService } from '../../../core/services/language.service';

@Component({
    selector: 'app-watched-reports-dialog',
    standalone: true,
    imports: [CommonModule, TranslatePipe, GenreTranslatePipe],
    templateUrl: './watched-reports-dialog.component.html',
    styleUrls: ['./watched-reports-dialog.component.scss'],
    animations: [
        trigger('backdropAnimation', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('modalAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
                animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }))
            ])
        ])
    ]
})
export class WatchedReportsDialogComponent implements OnInit {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();

    private watchedListService = inject(WatchedListService);

    reports = signal<WatchedReportsResponse['data'] | null>(null);
    isLoading = signal(true);


    ngOnInit(): void {
        this.loadReports();
    }

    loadReports(): void {
        this.isLoading.set(true);
        this.watchedListService.getReports().subscribe({
            next: (res) => {
                if (res.success) {
                    this.reports.set(res.data);
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    closeDialog(): void {
        this.close.emit();
    }

    private languageService = inject(LanguageService);

    formatRuntime(minutes: number): string {
        const isTr = this.languageService.langCode() === 'tr';
        const h = isTr ? 'sa' : 'h';
        const m = isTr ? 'dk' : 'm';

        if (minutes < 60) {
            return `${minutes}${m}`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}${h} ${mins}${m}` : `${hours}${h}`;
    }

    getSortedGenres(): Array<{ name: string, count: number }> {
        const reports = this.reports();
        if (!reports || !reports.genreCounts) return [];

        return Object.entries(reports.genreCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }
}

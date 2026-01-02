import { Component, ChangeDetectionStrategy, signal, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n';
import { MatchService, TasteMatchResult } from '../../../../core/services/match.service';

@Component({
    selector: 'app-taste-match-dialog',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './taste-match-dialog.component.html',
    styleUrl: './taste-match-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasteMatchDialogComponent {
    private matchService = inject(MatchService);

    isOpen = input.required<boolean>();
    targetUser = input<{ id: string; name: string } | null>(null);
    close = output<void>();

    tasteMatchResult = signal<TasteMatchResult | null>(null);
    isTasteMatchLoading = signal(false);
    tasteMatchError = signal<string | null>(null);

    constructor() {
        effect(() => {
            const user = this.targetUser();
            if (this.isOpen() && user) {
                this.loadTasteMatch(user.id);
            } else if (!this.isOpen()) {
                // Reset state when closed
                this.tasteMatchResult.set(null);
                this.tasteMatchError.set(null);
                this.isTasteMatchLoading.set(false);
            }
        }, { allowSignalWrites: true });
    }

    private loadTasteMatch(userId: string): void {
        this.tasteMatchResult.set(null);
        this.tasteMatchError.set(null);
        this.isTasteMatchLoading.set(true);

        this.matchService.getTasteMatch(userId).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.tasteMatchResult.set(response.data);
                } else {
                    this.tasteMatchError.set('Failed to calculate taste match');
                }
                this.isTasteMatchLoading.set(false);
            },
            error: (err) => {
                this.tasteMatchError.set(err.error?.message || 'Failed to calculate taste match');
                this.isTasteMatchLoading.set(false);
            }
        });
    }
}

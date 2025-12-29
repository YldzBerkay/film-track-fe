import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-rate-dialog',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './rate-dialog.component.html',
    styleUrl: './rate-dialog.component.scss'
})
export class RateDialogComponent {
    @Input() isOpen = false;
    @Input() initialRating: number | null = null;
    @Input() title = '';
    @Output() close = new EventEmitter<void>();
    @Output() save = new EventEmitter<{ rating: number, review?: string }>();

    hoverRating = signal<number>(0);
    selectedRating = signal<number>(0);
    reviewText = signal<string>('');

    ngOnChanges(changes: any): void {
        if (changes.initialRating && this.initialRating !== null) {
            this.selectedRating.set(this.initialRating || 0);
        }

        if (changes.isOpen && !this.isOpen) {
            this.selectedRating.set(0);
            this.hoverRating.set(0);
            this.reviewText.set('');
        }
    }

    onRate(rating: number): void {
        this.selectedRating.set(rating);
    }

    onReviewInput(text: string): void {
        this.reviewText.set(text);
    }

    onSave(): void {
        if (this.selectedRating() > 0) {
            this.save.emit({
                rating: this.selectedRating(),
                review: this.reviewText()
            });
            this.close.emit();
        }
    }

    onClose(): void {
        this.close.emit();
    }
}

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

    /**
     * Check if a star is in the "decrease zone" 
     * (between hovered rating and selected rating when lowering)
     */
    isDecreaseZone(star: number): boolean {
        const hover = this.hoverRating();
        const selected = this.selectedRating();

        // Only show decrease zone when hovering on a lower rating
        if (hover === 0 || hover >= selected) return false;

        // Stars between hover (exclusive) and selected (inclusive) are in decrease zone
        return star > hover && star <= selected;
    }

    /**
     * Check if a star is in the "increase zone"
     * (between selected rating and hovered rating when raising)
     */
    isIncreaseZone(star: number): boolean {
        const hover = this.hoverRating();
        const selected = this.selectedRating();

        // Only show increase zone when hovering on a higher rating
        if (hover === 0 || hover <= selected) return false;

        // Stars between selected (exclusive) and hover (inclusive) are in increase zone
        return star > selected && star <= hover;
    }

    /**
     * Get the appropriate star icon based on current state
     */
    getStarIcon(star: number): string {
        const hover = this.hoverRating();
        const selected = this.selectedRating();

        // If hovering
        if (hover > 0) {
            if (star <= hover) return 'star';  // Filled up to hover
            if (this.isDecreaseZone(star)) return 'star';  // Filled but will be red
            return 'star_outline';
        }

        // Not hovering - show selected rating
        return selected >= star ? 'star' : 'star_outline';
    }
}

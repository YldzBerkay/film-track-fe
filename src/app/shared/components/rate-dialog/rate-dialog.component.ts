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
    @Output() save = new EventEmitter<number>();

    hoverRating = signal<number>(0);
    selectedRating = signal<number>(0);

    ngOnChanges(): void {
        if (this.isOpen && this.initialRating) {
            this.selectedRating.set(this.initialRating);
        } else if (!this.isOpen) {
            this.selectedRating.set(0);
            this.hoverRating.set(0);
        }
    }

    onRate(rating: number): void {
        this.selectedRating.set(rating);
    }

    onSave(): void {
        if (this.selectedRating() > 0) {
            this.save.emit(this.selectedRating());
            this.close.emit();
        }
    }

    onClose(): void {
        this.close.emit();
    }
}

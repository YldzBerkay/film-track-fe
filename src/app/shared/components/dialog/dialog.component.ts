import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../../core/i18n';

export type DialogType = 'info' | 'success' | 'danger' | 'warning';

@Component({
    selector: 'app-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
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
                style({ transform: 'scale(0.95)', opacity: 0 }),
                animate('200ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'scale(1)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('150ms ease-in', style({ transform: 'scale(0.95)', opacity: 0 }))
            ])
        ])
    ]
})
export class DialogComponent {
    @Input() isOpen = false;
    @Input() title = '';
    @Input() message = '';
    @Input() confirmText = 'Confirm';
    @Input() cancelText = 'Cancel';
    @Input() type: DialogType = 'info';


    @Input() showCancel = true;
    @Input() showInput = false;
    @Input() inputType: 'text' | 'textarea' = 'textarea';
    @Input() inputMinLength = 0;
    @Input() inputPlaceholder = '';
    @Input() validationMatch = ''; // If set, input must match this string exactly
    @Input() isLoading = false;
    @Input() loadingText = 'Analyzing your memory...'; // Default to existing text
    @Input() resultData: { success: boolean; message: string; confidence?: number } | null = null;

    inputValue = '';

    @Output() confirm = new EventEmitter<string | void>();
    @Output() cancel = new EventEmitter<void>();
    @Output() close = new EventEmitter<void>();

    resetState(): void {
        this.inputValue = '';
    }

    get isValid(): boolean {
        if (!this.showInput) return true;

        if (this.validationMatch) {
            return this.inputValue === this.validationMatch ||
                (this.inputValue === 'DELETE'); // Special handling for "DELETE" if needed, or pass it in validationMatch
        }

        return this.inputValue.length >= this.inputMinLength;
    }

    onConfirm(): void {
        if (!this.isValid) {
            return;
        }
        this.confirm.emit(this.showInput ? this.inputValue : undefined);
    }

    onCancel(): void {
        this.cancel.emit();
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
            this.close.emit();
        }
    }
}

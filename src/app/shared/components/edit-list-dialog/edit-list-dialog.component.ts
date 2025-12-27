import { Component, ChangeDetectionStrategy, input, output, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TMDBService } from '../../../core/services/tmdb.service';
import { TranslatePipe } from '../../../core/i18n';

export interface ListItem {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    rating?: number;
}

@Component({
    selector: 'app-edit-list-dialog',
    standalone: true,
    imports: [CommonModule, DragDropModule, TranslatePipe],
    templateUrl: './edit-list-dialog.component.html',
    styleUrl: './edit-list-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditListDialogComponent implements OnChanges {
    // Inputs
    isOpen = input<boolean>(false);
    listTitle = input<string>('');
    listIcon = input<string>('list');
    initialItems = input<ListItem[]>([]);

    // Outputs
    close = output<void>();
    save = output<ListItem[]>();

    // Local state for editing
    items = signal<ListItem[]>([]);
    isSaving = signal(false);

    constructor(public tmdbService: TMDBService) { }

    ngOnChanges(): void {
        if (this.isOpen()) {
            // Deep copy items when dialog opens
            this.items.set([...this.initialItems()]);
            this.isSaving.set(false);
        }
    }

    closeDialog(e?: Event): void {
        if (e) e.stopPropagation();
        this.close.emit();
    }

    saveChanges(): void {
        this.isSaving.set(true);
        this.save.emit(this.items());
    }

    drop(event: CdkDragDrop<ListItem[]>): void {
        const currentItems = [...this.items()];
        moveItemInArray(currentItems, event.previousIndex, event.currentIndex);
        this.items.set(currentItems);
    }

    removeItem(tmdbId: number): void {
        this.items.update(list => list.filter(item => item.tmdbId !== tmdbId));
    }

    getMediaTypeLabel(mediaType: 'movie' | 'tv'): string {
        return mediaType === 'tv' ? 'TV' : 'Movie';
    }
}

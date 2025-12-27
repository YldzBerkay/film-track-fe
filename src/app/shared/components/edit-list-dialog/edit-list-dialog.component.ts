import { Component, ChangeDetectionStrategy, input, output, signal, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { TMDBService } from '../../../core/services/tmdb.service';
import { FormsModule } from '@angular/forms';
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
    imports: [CommonModule, DragDropModule, FormsModule, TranslatePipe],
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
    isDefault = input<boolean>(false);

    // Outputs
    close = output<void>();
    save = output<{ items: ListItem[], name?: string, icon?: string }>();

    // Local state for editing
    items = signal<ListItem[]>([]);
    editedName = signal<string>('');
    editedIcon = signal<string>('list');
    isSaving = signal(false);

    availableIcons = [
        'list', 'movie', 'tv', 'star', 'favorite', 'schedule', 'local_fire_department',
        'bookmark', 'playlist_play', 'visibility', 'thumb_up', 'diamond', 'bolt',
        'verified', 'rocket_launch', 'face', 'search', 'home', 'settings', 'person',
        'groups', 'notifications', 'edit', 'delete', 'add', 'remove', 'check', 'close',
        'menu', 'more_vert', 'arrow_back', 'arrow_forward', 'play_arrow', 'pause',
        'stop', 'skip_next', 'skip_previous', 'volume_up', 'volume_off', 'mic',
        'camera_alt', 'image', 'slideshow', 'live_tv', 'theaters', 'local_movies',
        'movie_filter', 'video_library', 'video_call', 'videocam', 'headset',
        'music_note', 'album', 'library_music', 'radio', 'podcasts', 'book',
        'library_books', 'local_library', 'history', 'update', 'event', 'calendar_today',
        'today', 'date_range', 'access_time', 'timer', 'hourglass_empty', 'watch_later',
        'alarm', 'map', 'place', 'explore', 'navigation', 'near_me', 'location_on',
        'directions', 'commute', 'train', 'directions_car', 'directions_bus',
        'directions_bike', 'directions_boat', 'flight', 'local_taxi', 'hotel', 'restaurant',
        'local_cafe', 'local_bar', 'local_pizza', 'fastfood', 'kitchen',
        'emoji_food_beverage', 'cake', 'celebration', 'sports_esports', 'sports_soccer',
        'sports_basketball', 'sports_tennis', 'sports_baseball', 'sports_football',
        'fitness_center', 'pool', 'directions_run', 'hiking', 'kayaking', 'surfing',
        'skateboarding', 'school', 'science', 'psychology', 'public', 'language',
        'flag', 'campaign', 'article', 'newspaper', 'lightbulb', 'emoji_objects',
        'sunny', 'bedtime', 'cloud', 'toys', 'gamepad', 'palette', 'brush', 'looks',
        'healing', 'pets', 'eco', 'nature', 'forest', 'water_drop', 'whatshot',
        'mood', 'mood_bad', 'sentiment_satisfied', 'sentiment_dissatisfied',
        'sentiment_very_satisfied', 'sentiment_very_dissatisfied',
        'face_retouching_natural', 'masks', 'theater_comedy'
    ];

    constructor(public tmdbService: TMDBService) { }

    ngOnChanges(): void {
        if (this.isOpen()) {
            this.items.set([...this.initialItems()]);
            this.editedName.set(this.listTitle());
            this.editedIcon.set(this.listIcon());
            this.isSaving.set(false);
        }
    }

    closeDialog(e?: Event): void {
        if (e) e.stopPropagation();
        this.close.emit();
    }

    saveChanges(): void {
        this.isSaving.set(true);
        this.save.emit({
            items: this.items(),
            name: this.isDefault() ? undefined : this.editedName().trim(),
            icon: this.isDefault() ? undefined : this.editedIcon()
        });
    }

    selectIcon(icon: string): void {
        this.editedIcon.set(icon);
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

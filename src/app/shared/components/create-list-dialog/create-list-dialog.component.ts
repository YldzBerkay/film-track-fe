import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../../core/i18n';

@Component({
    selector: 'app-create-list-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './create-list-dialog.component.html',
    styleUrls: ['./create-list-dialog.component.scss'],
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
export class CreateListDialogComponent {
    @Input() isOpen = false;
    @Input() isLoading = false;
    @Output() close = new EventEmitter<void>();
    @Output() create = new EventEmitter<{ name: string; icon: string }>();

    listName = signal('');
    selectedIcon = signal('list');

    // Predefined icons available for selection
    availableIcons = [
        'list',
        'movie',
        'tv',
        'star',
        'favorite',
        'schedule',
        'local_fire_department',
        'bookmark',
        'playlist_play',
        'visibility',
        'thumb_up',
        'diamond',
        'bolt',
        'verified',
        'rocket_launch',
        'face',
        'search',
        'home',
        'settings',
        'person',
        'groups',
        'notifications',
        'edit',
        'delete',
        'add',
        'remove',
        'check',
        'close',
        'menu',
        'more_vert',
        'arrow_back',
        'arrow_forward',
        'play_arrow',
        'pause',
        'stop',
        'skip_next',
        'skip_previous',
        'volume_up',
        'volume_off',
        'mic',
        'camera_alt',
        'image',
        'slideshow',
        'live_tv',
        'theaters',
        'local_movies',
        'movie_filter',
        'video_library',
        'video_call',
        'videocam',
        'headset',
        'music_note',
        'album',
        'library_music',
        'radio',
        'podcasts',
        'book',
        'library_books',
        'local_library',
        'history',
        'update',
        'event',
        'calendar_today',
        'today',
        'date_range',
        'access_time',
        'timer',
        'hourglass_empty',
        'watch_later',
        'alarm',
        'map',
        'place',
        'explore',
        'navigation',
        'near_me',
        'location_on',
        'directions',
        'commute',
        'train',
        'directions_car',
        'directions_bus',
        'directions_bike',
        'directions_boat',
        'flight',
        'local_taxi',
        'hotel',
        'restaurant',
        'local_cafe',
        'local_bar',
        'local_pizza',
        'fastfood',
        'kitchen',
        'emoji_food_beverage',
        'cake',
        'celebration',
        'sports_esports',
        'sports_soccer',
        'sports_basketball',
        'sports_tennis',
        'sports_baseball',
        'sports_football',
        'fitness_center',
        'pool',
        'directions_run',
        'hiking',
        'kayaking',
        'surfing',
        'skateboarding',
        'school',
        'science',
        'psychology',
        'public',
        'language',
        'flag',
        'campaign',
        'article',
        'newspaper',
        'lightbulb',
        'emoji_objects',
        'sunny',
        'bedtime',
        'cloud',
        'toys',
        'gamepad',
        'palette',
        'brush',
        'looks',
        'healing',
        'pets',
        'eco',
        'nature',
        'forest',
        'water_drop',
        'whatshot',
        'mood',
        'mood_bad',
        'sentiment_satisfied',
        'sentiment_dissatisfied',
        'sentiment_very_satisfied',
        'sentiment_very_dissatisfied',
        'face_retouching_natural',
        'masks',
        'theater_comedy'
    ];

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
            this.close.emit();
        }
    }

    onCancel(): void {
        this.close.emit();
    }

    onSubmit(): void {
        if (this.listName().trim()) {
            this.create.emit({
                name: this.listName().trim(),
                icon: this.selectedIcon()
            });
            // Reset form
            this.listName.set('');
            this.selectedIcon.set('list');
        }
    }

    selectIcon(icon: string): void {
        this.selectedIcon.set(icon);
    }
}

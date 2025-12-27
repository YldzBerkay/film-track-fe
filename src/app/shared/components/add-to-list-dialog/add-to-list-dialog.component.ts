import { Component, EventEmitter, Input, Output, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { WatchlistService, Watchlist } from '../../../core/services/watchlist.service';
import { WatchedListService, WatchedList } from '../../../core/services/watched-list.service';
import { forkJoin } from 'rxjs';

interface ListItem {
    id: string;
    name: string;
    icon: string;
    isIncluded: boolean;
    type: 'watched' | 'watchlist' | 'custom';
    isLoading?: boolean;
    isDisabled?: boolean;
    tooltip?: string;
}

@Component({
    selector: 'app-add-to-list-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './add-to-list-dialog.component.html',
    styleUrls: ['./add-to-list-dialog.component.scss'],
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
export class AddToListDialogComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() tmdbId!: number;
    @Input() mediaType!: 'movie' | 'tv';
    @Input() title!: string;
    @Input() posterPath?: string;
    @Input() runtime = 0;
    @Input() releaseDate?: string;
    @Input() numberOfEpisodes?: number;
    @Input() numberOfSeasons?: number;
    @Input() hasSpecials = false;
    @Input() specialsEpisodeCount = 0;

    @Output() close = new EventEmitter<void>();

    private watchlistService = inject(WatchlistService);
    private watchedListService = inject(WatchedListService);

    lists = signal<ListItem[]>([]);
    isLoading = signal(true);
    newListName = signal('');
    isCreatingList = signal(false);
    includeSpecials = signal(false);

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
            this.loadLists();
        }
    }

    loadLists(): void {
        if (!this.tmdbId || !this.mediaType) return;

        this.isLoading.set(true);

        forkJoin({
            watchlists: this.watchlistService.getWatchlists(),
            watchedList: this.watchedListService.getWatchedList()
        }).subscribe({
            next: (response) => {
                const listItems: ListItem[] = [];

                // Check release date for Watched list restriction
                let isUnreleased = false;
                if (this.releaseDate) {
                    const release = new Date(this.releaseDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    isUnreleased = release > today;
                }

                // Process Watched List
                let isInWatched = false;
                if (response.watchedList.success) {
                    const watchedList = response.watchedList.data.watchedList;
                    isInWatched = watchedList.items.some(
                        item => item.tmdbId === Number(this.tmdbId) && item.mediaType === this.mediaType
                    );

                    listItems.push({
                        id: watchedList._id,
                        name: 'Watched',
                        icon: 'check_circle',
                        isIncluded: isInWatched,
                        type: 'watched',
                        isDisabled: isUnreleased,
                        tooltip: isUnreleased ? 'You cannot add this film because its not released yet' : undefined
                    });
                }

                // Process Watchlists (Default + Custom)
                if (response.watchlists.success) {
                    response.watchlists.data.watchlists.forEach(list => {
                        const isInList = list.items.some(
                            item => item.tmdbId === Number(this.tmdbId) && item.mediaType === this.mediaType
                        );

                        const isWatchlist = list.isDefault;
                        const isDisabled = isWatchlist && isInWatched && !isInList;

                        listItems.push({
                            id: list._id,
                            name: list.name,
                            icon: list.isDefault ? 'bookmark' : (list.icon || 'list'),
                            isIncluded: isInList,
                            type: list.isDefault ? 'watchlist' : 'custom',
                            isDisabled: isDisabled,
                            tooltip: isDisabled ? 'Already in watched list' : undefined
                        });
                    });
                }

                this.lists.set(listItems);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load lists', err);
                this.isLoading.set(false);
            }
        });
    }

    toggleList(list: ListItem): void {
        if (list.isDisabled) return;

        const wasIncluded = list.isIncluded;

        // Optimistic update: set loading and toggle included status
        this.lists.update(current =>
            current.map(item =>
                item.id === list.id
                    ? { ...item, isLoading: true, isIncluded: !item.isIncluded }
                    : item
            )
        );

        const updatedList = this.lists().find(l => l.id === list.id);
        if (!updatedList) return;

        const action$ = updatedList.isIncluded
            ? this.addItemToList(updatedList)
            : this.removeItemFromList(updatedList);

        (action$ as any).subscribe({
            next: () => {
                // Success: turn off loading and handle reactive disabling
                this.lists.update(current => {
                    const updated = current.map(item =>
                        item.id === list.id
                            ? { ...item, isLoading: false }
                            : item
                    );

                    // If we toggled 'watched', update 'watchlist' isDisabled status
                    if (list.type === 'watched') {
                        const isInWatchedNow = updated.find(i => i.id === list.id)?.isIncluded;
                        return updated.map(item => {
                            if (item.type === 'watchlist') {
                                const isDisabled = isInWatchedNow && !item.isIncluded;
                                return {
                                    ...item,
                                    isDisabled: isDisabled,
                                    tooltip: isDisabled ? 'Already in watched list' : undefined
                                };
                            }
                            return item;
                        });
                    }
                    return updated;
                });
            },
            error: (err: any) => {
                console.error(`Failed to toggle list ${list.name}`, err);
                // Error: revert changes
                this.lists.update(current =>
                    current.map(item =>
                        item.id === list.id
                            ? { ...item, isLoading: false, isIncluded: wasIncluded }
                            : item
                    )
                );
            }
        });
    }

    private addItemToList(list: ListItem) {
        let runtime = this.runtime;
        let episodes = this.numberOfEpisodes;
        let seasons = this.numberOfSeasons;

        if (this.mediaType === 'tv' && this.hasSpecials && this.includeSpecials()) {
            // Add specials if included
            const avgRuntime = this.runtime / (this.numberOfEpisodes || 1);
            runtime = this.runtime + (avgRuntime * this.specialsEpisodeCount);
            episodes = (this.numberOfEpisodes || 0) + this.specialsEpisodeCount;
            seasons = (this.numberOfSeasons || 0) + 1;
        }

        const itemData = {
            tmdbId: Number(this.tmdbId),
            mediaType: this.mediaType,
            title: this.title,
            posterPath: this.posterPath,
            numberOfEpisodes: this.mediaType === 'tv' ? episodes : undefined,
            numberOfSeasons: this.mediaType === 'tv' ? seasons : undefined
        };

        if (list.type === 'watched') {
            return this.watchedListService.addItem({
                ...itemData,
                runtime: runtime || 0
            });
        } else {
            return this.watchlistService.addItem(list.id, itemData);
        }
    }

    private removeItemFromList(list: ListItem) {
        if (list.type === 'watched') {
            return this.watchedListService.removeItem(Number(this.tmdbId), this.mediaType);
        } else {
            return this.watchlistService.removeItem(list.id, Number(this.tmdbId), this.mediaType);
        }
    }

    createList(): void {
        const name = this.newListName().trim();
        if (!name) return;

        this.isCreatingList.set(true);

        this.watchlistService.createCustomList(name).subscribe({
            next: (response) => {
                if (response.success) {
                    const newList: ListItem = {
                        id: response.data.watchlist._id,
                        name: response.data.watchlist.name,
                        icon: response.data.watchlist.icon || 'list',
                        isIncluded: false, // Newly created list is empty
                        type: 'custom'
                    };

                    // Add to lists and immediately toggle (add item to it)
                    this.lists.update(lists => [...lists, newList]);
                    this.newListName.set('');
                    this.toggleList(newList);
                }
                this.isCreatingList.set(false);
            },
            error: (err) => {
                console.error('Failed to create list', err);
                this.isCreatingList.set(false);
            }
        });
    }

    onBackdropClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
            this.close.emit();
        }
    }
}

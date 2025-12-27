import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TMDBService } from '../../../core/services/tmdb.service';
import { WatchlistService, Watchlist, WatchlistResponse } from '../../../core/services/watchlist.service';
import { WatchedListService, WatchedList, WatchedListResponse } from '../../../core/services/watched-list.service';
import { TranslatePipe, TranslationService } from '../../../core/i18n';
import { EditListDialogComponent, ListItem } from '../../../shared/components/edit-list-dialog/edit-list-dialog.component';

type ListType = 'watched' | 'watchlist' | 'custom';

@Component({
    selector: 'app-list-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, TranslatePipe, EditListDialogComponent],
    templateUrl: './list-detail.component.html',
    styleUrl: './list-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListDetailComponent implements OnInit {
    private route: ActivatedRoute = inject(ActivatedRoute);
    private location: Location = inject(Location);
    router: Router = inject(Router);
    tmdbService: TMDBService = inject(TMDBService);
    private watchlistService: WatchlistService = inject(WatchlistService);
    private watchedListService: WatchedListService = inject(WatchedListService);
    private translationService: TranslationService = inject(TranslationService);

    listType = signal<ListType>('watched');
    watchedList = signal<WatchedList | null>(null);
    watchlist = signal<Watchlist | null>(null);
    isLoading = signal(true);
    error = signal<string | null>(null);

    // Privacy dropdown state
    showPrivacyDropdown = signal(false);

    readonly listTitle = computed(() => {
        const type = this.listType();
        if (type === 'watched') {
            return this.translationService.t('watched.title');
        } else if (type === 'watchlist') {
            return this.translationService.t('watchlist.title');
        } else {
            return this.watchlist()?.name || '';
        }
    });

    readonly listIcon = computed(() => {
        const type = this.listType();
        if (type === 'watched') {
            return 'visibility';
        } else if (type === 'watchlist') {
            return 'bookmark';
        } else {
            return this.watchlist()?.icon || 'list';
        }
    });

    readonly items = computed(() => {
        const type = this.listType();
        if (type === 'watched') {
            return this.watchedList()?.items || [];
        } else {
            return this.watchlist()?.items || [];
        }
    });

    readonly privacyStatus = computed(() => {
        const type = this.listType();
        if (type === 'watched') {
            return this.watchedList()?.privacyStatus ?? 0;
        } else {
            return this.watchlist()?.privacyStatus ?? 0;
        }
    });

    readonly listId = computed(() => {
        return this.watchlist()?._id || '';
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (id === 'watched') {
            this.listType.set('watched');
            this.loadWatchedList();
        } else if (id === 'watchlist') {
            this.listType.set('watchlist');
            this.loadDefaultWatchlist();
        } else if (id) {
            this.listType.set('custom');
            this.loadCustomWatchlist(id);
        }
    }

    @HostListener('document:click')
    onDocumentClick(): void {
        this.showPrivacyDropdown.set(false);
    }

    loadWatchedList(): void {
        this.isLoading.set(true);
        this.watchedListService.getWatchedList().subscribe({
            next: (response: WatchedListResponse) => {
                if (response.success && response.data.watchedList) {
                    this.watchedList.set(response.data.watchedList);
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('Failed to load watched list');
                this.isLoading.set(false);
            }
        });
    }

    loadDefaultWatchlist(): void {
        this.isLoading.set(true);
        this.watchlistService.getDefaultWatchlist().subscribe({
            next: (response: WatchlistResponse) => {
                if (response.success && response.data.watchlist) {
                    this.watchlist.set(response.data.watchlist);
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('Failed to load watchlist');
                this.isLoading.set(false);
            }
        });
    }

    loadCustomWatchlist(id: string): void {
        this.isLoading.set(true);
        this.watchlistService.getWatchlist(id).subscribe({
            next: (response: WatchlistResponse) => {
                if (response.success && response.data.watchlist) {
                    this.watchlist.set(response.data.watchlist);
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('Failed to load list');
                this.isLoading.set(false);
            }
        });
    }

    navigateToItem(item: { tmdbId: number; mediaType: 'movie' | 'tv' }): void {
        const route = item.mediaType === 'tv' ? '/tv' : '/movies';
        this.router.navigate([route, item.tmdbId]);
    }

    goBack(): void {
        this.location.back();
    }

    togglePrivacyDropdown(event: Event): void {
        event.stopPropagation();
        this.showPrivacyDropdown.update(v => !v);
    }

    getPrivacyIcon(status: number): string {
        switch (status) {
            case 1: return 'group';
            case 2: return 'lock';
            default: return 'public';
        }
    }

    updatePrivacy(status: number): void {
        const type = this.listType();

        if (type === 'watched') {
            this.watchedListService.updatePrivacy(status).subscribe({
                next: (response: WatchedListResponse) => {
                    if (response.success && response.data.watchedList) {
                        this.watchedList.set(response.data.watchedList);
                    }
                }
            });
        } else {
            const id = this.listId();
            if (id) {
                this.watchlistService.updatePrivacy(id, status).subscribe({
                    next: (response: WatchlistResponse) => {
                        if (response.success && response.data.watchlist) {
                            this.watchlist.set(response.data.watchlist);
                        }
                    }
                });
            }
        }

        this.showPrivacyDropdown.set(false);
    }

    // Edit List Order
    showEditDialog = signal(false);

    readonly listItemsForEdit = computed<ListItem[]>(() => {
        return this.items().map(item => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            rating: (item as any).rating
        }));
    });

    openEditDialog(): void {
        this.showEditDialog.set(true);
    }

    saveListOrder(items: ListItem[]): void {
        const orderedTmdbIds = items.map(item => item.tmdbId);
        const type = this.listType();

        if (type === 'watched') {
            this.watchedListService.reorderItems(orderedTmdbIds).subscribe({
                next: (response: WatchedListResponse) => {
                    if (response.success && response.data.watchedList) {
                        this.watchedList.set(response.data.watchedList);
                        this.showEditDialog.set(false);
                    }
                }
            });
        } else {
            const id = this.listId();
            if (id) {
                this.watchlistService.reorderItems(id, orderedTmdbIds).subscribe({
                    next: (response: WatchlistResponse) => {
                        if (response.success && response.data.watchlist) {
                            this.watchlist.set(response.data.watchlist);
                            this.showEditDialog.set(false);
                        }
                    }
                });
            }
        }
    }
}

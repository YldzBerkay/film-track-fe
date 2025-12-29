import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    OnInit,
    ViewChild,
    ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n';
import { ProfileStateService } from '../../../../core/services/profile-state.service';
import { WatchedListService, WatchedList } from '../../../../core/services/watched-list.service';
import { WatchlistService, Watchlist } from '../../../../core/services/watchlist.service';
import { TMDBService } from '../../../../core/services/tmdb.service';

type ViewMode = 'slider' | 'list';

@Component({
    selector: 'app-profile-library',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe],
    templateUrl: './profile-library.component.html',
    styleUrl: './profile-library.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileLibraryComponent implements OnInit {
    private profileState = inject(ProfileStateService);
    private watchedListService = inject(WatchedListService);
    private watchlistService = inject(WatchlistService);
    router = inject(Router);
    tmdbService = inject(TMDBService);

    isOwnProfile = this.profileState.isOwnProfile;
    user = this.profileState.user;

    // View mode
    viewMode = signal<ViewMode>('slider');

    // Data
    watched = signal<WatchedList | null>(null);
    defaultWatchlist = signal<Watchlist | null>(null);
    customWatchlists = signal<Watchlist[]>([]);
    isLoading = signal(true);

    // Privacy dropdown
    activePrivacyDropdown = signal<string | null>(null);

    @ViewChild('watchedContainer') watchedContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('watchlistContainer') watchlistContainer?: ElementRef<HTMLDivElement>;

    ngOnInit(): void {
        this.loadLists();
    }

    private loadLists(): void {
        // WatchedListService uses authenticated user automatically
        this.watchedListService.getWatchedList().subscribe({
            next: (response) => {
                if (response.success && response.data?.watchedList) {
                    this.watched.set(response.data.watchedList);
                }
            }
        });

        // WatchlistService.getWatchlists() returns all watchlists for authenticated user
        this.watchlistService.getWatchlists().subscribe({
            next: (response) => {
                if (response.success && response.data?.watchlists) {
                    const lists = response.data.watchlists;
                    this.defaultWatchlist.set(lists.find(l => l.isDefault) || null);
                    this.customWatchlists.set(lists.filter(l => !l.isDefault));
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    togglePrivacyDropdown(listId: string, event: Event): void {
        event.stopPropagation();
        if (this.activePrivacyDropdown() === listId) {
            this.activePrivacyDropdown.set(null);
        } else {
            this.activePrivacyDropdown.set(listId);
        }
    }

    getPrivacyIcon(status: number): string {
        switch (status) {
            case 0: return 'public';
            case 1: return 'group';
            case 2: return 'lock';
            default: return 'public';
        }
    }

    updateWatchedPrivacy(status: number): void {
        this.watchedListService.updatePrivacy(status).subscribe({
            next: (response) => {
                if (response.success) {
                    this.watched.update(w => w ? { ...w, privacyStatus: status } : null);
                }
                this.activePrivacyDropdown.set(null);
            }
        });
    }

    updateWatchlistPrivacy(listId: string, status: number): void {
        this.watchlistService.updatePrivacy(listId, status).subscribe({
            next: (response) => {
                if (response.success) {
                    if (this.defaultWatchlist()?._id === listId) {
                        this.defaultWatchlist.update(w => w ? { ...w, privacyStatus: status } : null);
                    } else {
                        this.customWatchlists.update(lists =>
                            lists.map(l => l._id === listId ? { ...l, privacyStatus: status } : l)
                        );
                    }
                }
                this.activePrivacyDropdown.set(null);
            }
        });
    }

    scrollList(container: HTMLElement | undefined, direction: 'left' | 'right'): void {
        if (!container) return;
        const amount = 300;
        container.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth'
        });
    }
}

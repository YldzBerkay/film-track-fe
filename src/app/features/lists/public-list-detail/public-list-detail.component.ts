import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TMDBService } from '../../../core/services/tmdb.service';
import { UserService } from '../../../core/services/user.service';
import { TranslatePipe, TranslationService } from '../../../core/i18n';
import { LanguageService } from '../../../core/services/language.service';
import { ListFilterComponent } from '../../../shared/components/list-filter/list-filter.component';

type ListType = 'watched' | 'watchlist' | 'custom';

@Component({
    selector: 'app-public-list-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, TranslatePipe, ListFilterComponent],
    templateUrl: './public-list-detail.component.html',
    styleUrl: './public-list-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicListDetailComponent implements OnInit {
    private route: ActivatedRoute = inject(ActivatedRoute);
    private location: Location = inject(Location);
    router: Router = inject(Router);
    tmdbService: TMDBService = inject(TMDBService);
    private userService: UserService = inject(UserService);
    private translationService: TranslationService = inject(TranslationService);
    private languageService: LanguageService = inject(LanguageService);

    // Route params
    username = signal<string>('');
    userId = signal<string>('');
    listTypeParam = signal<string>('watched');

    // Data signals
    listType = signal<ListType>('watched');
    list = signal<any | null>(null);
    ownerUsername = signal<string>('');
    ownerAvatar = signal<string | null>(null);
    canView = signal<boolean>(true);
    privacyMessage = signal<string>('');
    isLoading = signal(true);
    error = signal<string | null>(null);

    filteredItems = signal<any[]>([]);

    private previousLanguage = this.languageService.language();

    constructor() {
        effect(() => {
            const currentLang = this.languageService.language();
            if (currentLang !== this.previousLanguage) {
                this.previousLanguage = currentLang;
                this.loadListDetail();
            }
        });

        effect(() => {
            this.filteredItems.set(this.items());
        }, { allowSignalWrites: true });
    }

    readonly listTitle = computed(() => {
        const type = this.listType();
        if (type === 'watched') {
            return this.translationService.t('watched.title');
        } else if (type === 'watchlist') {
            return this.translationService.t('watchlist.title');
        } else {
            return this.list()?.name || '';
        }
    });

    readonly listIcon = computed(() => {
        const type = this.listType();
        if (type === 'watched') {
            return 'visibility';
        } else if (type === 'watchlist') {
            return 'bookmark';
        } else {
            return this.list()?.icon || 'list';
        }
    });

    readonly items = computed(() => {
        return this.list()?.items || [];
    });

    ngOnInit(): void {
        // Get username from route
        const username = this.route.snapshot.paramMap.get('username');
        const listType = this.route.snapshot.paramMap.get('listType');

        if (!username || !listType) {
            this.error.set('Invalid route parameters');
            this.isLoading.set(false);
            return;
        }

        this.username.set(username);
        this.listTypeParam.set(listType);

        // First, resolve username to userId
        this.resolveUserAndLoadList(username, listType);
    }

    private resolveUserAndLoadList(username: string, listType: string): void {
        this.isLoading.set(true);
        const lang = this.languageService.language();

        // Get user profile to get userId
        this.userService.getProfile(username, lang).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    const userId = response.data.user.id;
                    this.userId.set(userId);
                    this.ownerUsername.set(response.data.user.username);
                    this.ownerAvatar.set(response.data.user.avatar);

                    // Now load the list
                    this.loadListDetailForUser(userId, listType);
                } else {
                    this.error.set('User not found');
                    this.isLoading.set(false);
                }
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Failed to load user');
                this.isLoading.set(false);
            }
        });
    }

    private loadListDetailForUser(userId: string, listType: string): void {
        const lang = this.languageService.language();

        this.userService.getUserListDetail(userId, listType, lang).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.list.set(response.data.list);
                    this.listType.set(response.data.type);
                    this.ownerUsername.set(response.data.ownerUsername);
                    this.ownerAvatar.set(response.data.ownerAvatar);
                    this.canView.set(response.data.canView);
                    this.privacyMessage.set(response.data.privacyMessage || '');
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Failed to load list');
                this.isLoading.set(false);
            }
        });
    }

    loadListDetail(): void {
        const userId = this.userId();
        const listType = this.listTypeParam();
        if (userId && listType) {
            this.loadListDetailForUser(userId, listType);
        }
    }

    navigateToItem(item: { tmdbId: number; mediaType: 'movie' | 'tv' }): void {
        const route = item.mediaType === 'tv' ? '/tv' : '/movies';
        this.router.navigate([route, item.tmdbId]);
    }

    goBack(): void {
        this.location.back();
    }

    navigateToProfile(): void {
        this.router.navigate(['/profile', this.username()]);
    }

    onFilterChange(items: any[]): void {
        this.filteredItems.set(items);
    }
}

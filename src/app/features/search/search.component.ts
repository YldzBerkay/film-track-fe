import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TMDBService, TMDBMovie, TMDBTvShow } from '../../core/services/tmdb.service';
import { UserService, UserSearchResults } from '../../core/services/user.service';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { TranslatePipe } from '../../core/i18n';
import { HeaderComponent } from '../../layout/header/header.component';

type SearchTab = 'movies' | 'tv' | 'people';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, TranslatePipe, HeaderComponent],
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    private tmdbService = inject(TMDBService);
    private userService = inject(UserService);

    query = signal('');
    activeTab = signal<SearchTab>('movies');
    isLoading = signal(false);

    currentPage = signal(1);
    totalPages = signal(1);

    // Tab specific counts
    movieTotal = signal(0);
    tvTotal = signal(0);
    peopleTotal = signal(0);

    movieResults = signal<TMDBMovie[]>([]);
    tvResults = signal<TMDBTvShow[]>([]);
    userResults = signal<UserSearchResults['users']>([]);

    constructor() {
        effect(() => {
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            const q = params['q'];
            const page = params['page'] ? Number(params['page']) : 1;

            if (q) {
                this.query.set(q);
                this.currentPage.set(page);
                this.performSearch(q, page);
            }
        });
    }

    performSearch(q: string, page: number = 1) {
        if (!q.trim()) return;

        this.isLoading.set(true);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { q, page },
            queryParamsHandling: 'merge'
        });

        const active = this.activeTab();

        // Use forkJoin to get counts for all tabs if it's the first page or tab switch,
        // but to ensure we have data, let's just run them parallel.
        // Actually, to support pagination correctly for the ACTIVE tab, we need to pass 'page' to it.
        // For inactive tabs, page 1 is fine to get the total count.

        const moviePage = active === 'movies' ? page : 1;
        const tvPage = active === 'tv' ? page : 1;
        const peoplePage = active === 'people' ? page : 1;

        forkJoin({
            movies: this.tmdbService.searchMovies(q, moviePage),
            tv: this.tmdbService.searchTvShows(q, tvPage),
            people: this.userService.searchUsers(q, peoplePage)
        }).pipe(
            finalize(() => this.isLoading.set(false))
        ).subscribe({
            next: (res: any) => {
                // Movies
                if (res.movies.success) {
                    this.movieTotal.set(res.movies.data.pagination.total);
                    if (active === 'movies') {
                        this.movieResults.set(res.movies.data.results);
                        this.totalPages.set(res.movies.data.pagination.pages);
                    }
                }

                // TV
                if (res.tv.success) {
                    this.tvTotal.set(res.tv.data.pagination.total);
                    if (active === 'tv') {
                        this.tvResults.set(res.tv.data.results);
                        this.totalPages.set(res.tv.data.pagination.pages);
                    }
                }

                // People
                if (res.people.success) {
                    this.peopleTotal.set(res.people.data.pagination.total);
                    if (active === 'people') {
                        this.userResults.set(res.people.data.users);
                        this.totalPages.set(res.people.data.pagination.pages);
                    }
                }
            },
            error: (err) => {
                console.error('Search error:', err);
                // Reset results on error? Or keep previous?
                // For now, let's handle individual errors gracefully if needed, but forkJoin fails if one fails unless caught.
                // Assuming services handle errors by returning empty/safe responses or we should catch here.
                // The current services return properly structured responses even on empty, but network error might throw.
            }
        });
    }

    setActiveTab(tab: SearchTab) {
        this.activeTab.set(tab);
        this.currentPage.set(1);
        this.performSearch(this.query(), 1);
    }

    changePage(newPage: number) {
        if (newPage >= 1 && newPage <= this.totalPages()) {
            this.currentPage.set(newPage);
            this.performSearch(this.query(), newPage);
            window.scrollTo(0, 0);
        }
    }

    getPosterUrl(path: string | null) {
        return this.tmdbService.getPosterUrl(path);
    }

    getAvatarUrl(user: UserSearchResults['users'][0]) {
        if (user.avatar) return user.avatar;
        return `https://ui-avatars.com/api/?name=${user.username}&background=random`;
    }

    goBack() {
        this.location.back();
    }
}

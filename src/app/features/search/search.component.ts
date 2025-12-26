import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TMDBService, TMDBMovie, TMDBTvShow } from '../../core/services/tmdb.service';
import { UserService, UserSearchResults } from '../../core/services/user.service';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

type SearchTab = 'movies' | 'tv' | 'people';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
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
            if (q) {
                this.query.set(q);
                this.performSearch(q);
            }
        });
    }

    performSearch(q: string) {
        if (!q.trim()) return;

        this.isLoading.set(true);

        // search movies
        this.tmdbService.searchMovies(q).subscribe({
            next: (res) => {
                if (res.success) this.movieResults.set(res.data.results);
            },
            error: () => this.movieResults.set([])
        });

        // search tv
        this.tmdbService.searchTvShows(q).subscribe({
            next: (res) => {
                if (res.success) this.tvResults.set(res.data.results);
            },
            error: () => this.tvResults.set([])
        });

        // search users
        this.userService.searchUsers(q).pipe(
            finalize(() => this.isLoading.set(false))
        ).subscribe({
            next: (res) => {
                if (res.success) this.userResults.set(res.data.users);
            },
            error: () => this.userResults.set([])
        });
    }

    setActiveTab(tab: SearchTab) {
        this.activeTab.set(tab);
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

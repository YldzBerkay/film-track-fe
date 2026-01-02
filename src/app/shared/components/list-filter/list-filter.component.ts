import { Component, ChangeDetectionStrategy, input, output, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n';

export interface FilterState {
    year: string | null;
    genre: string | null;
    country: string | null;
    language: string | null;
    mediaType: string | null;
}

@Component({
    selector: 'app-list-filter',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './list-filter.component.html',
    styleUrl: './list-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListFilterComponent {
    items = input.required<any[]>();
    listType = input<string>('custom'); // 'watched', 'watchlist', 'custom'
    filterChange = output<any[]>();

    // Filter State
    selectedYear = signal<string | null>(null);
    selectedGenre = signal<string | null>(null);
    selectedCountry = signal<string | null>(null);
    selectedLanguage = signal<string | null>(null);
    selectedMediaType = signal<string | null>(null);

    // Status Filters (Booleans)
    filterWatched = signal(false);
    filterLiked = signal(false);
    filterRated = signal(false);
    filterReviewed = signal(false);

    // Toggle Methods
    toggleWatched() { this.filterWatched.update(v => !v); }
    toggleLiked() { this.filterLiked.update(v => !v); }
    toggleRated() { this.filterRated.update(v => !v); }
    toggleReviewed() { this.filterReviewed.update(v => !v); }

    // Expanded/Collapsed State for Options
    isExpanded = signal(false);

    // Options (Computed from items)
    readonly availableYears = computed(() => {
        const years = new Set<string>();
        this.items().forEach(item => {
            // Try releaseDate first, then firstAirDate (TV)
            const date = item.releaseDate || item.firstAirDate;
            if (date) {
                years.add(date.substring(0, 4));
            }
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    });

    readonly availableGenres = computed(() => {
        const genres = new Set<string>();
        this.items().forEach(item => {
            if (item.genres && Array.isArray(item.genres)) {
                item.genres.forEach((g: string) => genres.add(g));
            }
        });
        return Array.from(genres).sort();
    });

    readonly availableCountries = computed(() => {
        const countries = new Set<string>();
        this.items().forEach(item => {
            if (item.originCountry && Array.isArray(item.originCountry)) {
                item.originCountry.forEach((c: string) => countries.add(c));
            }
        });
        return Array.from(countries).sort();
    });

    readonly availableLanguages = computed(() => {
        const langs = new Set<string>();
        this.items().forEach(item => {
            if (item.originalLanguage) {
                langs.add(item.originalLanguage);
            }
        });
        return Array.from(langs).sort();
    });

    readonly availableMediaTypes = computed(() => {
        return ['movie', 'tv'];
    });

    constructor() {
        effect(() => {
            this.applyFilters();
        });
    }

    toggleExpand(event?: Event): void {
        event?.stopPropagation();
        this.isExpanded.update(v => !v);
    }

    clearAll(): void {
        this.selectedYear.set(null);
        this.selectedGenre.set(null);
        this.selectedCountry.set(null);
        this.selectedLanguage.set(null);
        this.selectedMediaType.set(null);
        this.filterWatched.set(false);
        this.filterLiked.set(false);
        this.filterRated.set(false);
        this.filterReviewed.set(false);
    }

    hasActiveFilters = computed(() => {
        return !!(this.selectedYear() || this.selectedGenre() || this.selectedCountry() ||
            this.selectedLanguage() || this.selectedMediaType() ||
            this.filterWatched() || this.filterLiked() || this.filterRated() || this.filterReviewed());
    });

    private applyFilters(): void {
        const items = this.items();
        const year = this.selectedYear();
        const genre = this.selectedGenre();
        const country = this.selectedCountry();
        const language = this.selectedLanguage();
        const mediaType = this.selectedMediaType();

        if (!items) return;

        const filtered = items.filter(item => {
            // Year Check
            if (year) {
                const date = item.releaseDate || item.firstAirDate;
                if (!date || !date.startsWith(year)) return false;
            }

            // Genre Check
            if (genre) {
                if (!item.genres || !item.genres.includes(genre)) return false;
            }

            // Country Check
            if (country) {
                if (!item.originCountry || !item.originCountry.includes(country)) return false;
            }

            // Language Check
            if (language) {
                if (item.originalLanguage !== language) return false;
            }

            // Media Type Check
            if (mediaType) {
                if (item.mediaType !== mediaType) return false;
            }

            // -- Status Filters --
            // Watched (Only if toggle is ON)
            if (this.filterWatched() && !item.isWatched) return false;

            // Liked
            if (this.filterLiked() && !item.isLiked) return false;

            // Rated
            // Use userRating specifically, or explicit rating field if in WatchedList
            if (this.filterRated()) {
                const rating = item.userRating || (item.rating && item.rating > 0);
                if (!rating) return false;
            }

            // Reviewed
            if (this.filterReviewed() && !item.hasReview) return false;

            return true;
        });

        this.filterChange.emit(filtered);
    }

    // Visibility Helpers
    readonly showWatchedFilter = computed(() => {
        const type = this.listType();
        // Only show "Watched" & "Liked" on Custom Lists 
        // (User req: "dont add to watched list and watchlist... only custom lists")
        return type === 'custom';
    });

    readonly showLikedFilter = computed(() => {
        const type = this.listType();
        return type === 'custom';
    });

    readonly showRatedReviewFilter = computed(() => {
        const type = this.listType();
        // Show on Custom Lists AND Watched List
        // (User req: "dont add to watchlist")
        return type !== 'watchlist';
    });
}

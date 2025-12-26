import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { TMDBService, TMDBMovie, TMDBTvShow } from '../../../core/services/tmdb.service';
import { FavoritesService } from '../../../core/services/favorites.service';

type TabType = 'movies' | 'tv';

interface SelectedItem {
  tmdbId: number;
  title: string;
  posterPath: string;
  releaseDate: string;
}

@Component({
  selector: 'app-favorites-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './favorites-selection.component.html',
  styleUrl: './favorites-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FavoritesSelectionComponent {
  activeTab = signal<TabType>('movies');
  searchQuery = signal<string>('');
  isLoading = signal(false);
  isLoadingMore = signal(false);
  errorMessage = signal<string | null>(null);

  movies = signal<TMDBMovie[]>([]);
  tvShows = signal<TMDBTvShow[]>([]);
  selectedMovies = signal<SelectedItem[]>([]);
  selectedTvShows = signal<SelectedItem[]>([]);

  currentPage = signal(1);
  hasMoreResults = signal(true);

  private searchSubject = new Subject<string>();

  readonly selectedMoviesCount = computed(() => this.selectedMovies().length);
  readonly selectedTvShowsCount = computed(() => this.selectedTvShows().length);
  readonly totalSelected = computed(() => this.selectedMoviesCount() + this.selectedTvShowsCount());
  readonly canContinue = computed(() => this.selectedMoviesCount() === 5 && this.selectedTvShowsCount() === 5);
  readonly progressPercentage = computed(() => {
    const total = this.activeTab() === 'movies' ? this.selectedMoviesCount() : this.selectedTvShowsCount();
    return (total / 5) * 100;
  });

  constructor(
    public tmdbService: TMDBService,
    private favoritesService: FavoritesService,
    private router: Router
  ) {
    // Load popular content on init
    this.loadPopularMovies();
    this.loadPopularTvShows();

    // Setup search debounce
    this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query.trim()) {
            return of(null);
          }
          this.isLoading.set(true);
          const isMovies = this.activeTab() === 'movies';
          return isMovies
            ? this.tmdbService.searchMovies(query)
            : this.tmdbService.searchTvShows(query);
        }),
        catchError((error) => {
          this.errorMessage.set('Failed to search. Please try again.');
          this.isLoading.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isLoading.set(false);
        if (response?.success && response.data) {
          const isMovies = this.activeTab() === 'movies';
          if (isMovies) {
            this.movies.set(response.data.results as TMDBMovie[]);
          } else {
            this.tvShows.set(response.data.results as TMDBTvShow[]);
          }
          this.hasMoreResults.set(response.data.page < response.data.total_pages);
        }
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    
    if (!query.trim()) {
      if (this.activeTab() === 'movies') {
        this.loadPopularMovies();
      } else {
        this.loadPopularTvShows();
      }
      return;
    }

    this.searchSubject.next(query);
  }

  onTabChange(tab: TabType): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.movies.set([]);
    this.tvShows.set([]);

    if (tab === 'movies') {
      this.loadPopularMovies();
    } else {
      this.loadPopularTvShows();
    }
  }

  toggleMovieSelection(movie: TMDBMovie): void {
    const selected = this.selectedMovies();
    const index = selected.findIndex((m) => m.tmdbId === movie.id);

    if (index >= 0) {
      // Deselect
      this.selectedMovies.set(selected.filter((_, i) => i !== index));
    } else {
      // Select (max 5)
      if (selected.length < 5) {
        this.selectedMovies.set([
          ...selected,
          {
            tmdbId: movie.id,
            title: movie.title,
            posterPath: movie.poster_path || '',
            releaseDate: movie.release_date || ''
          }
        ]);
      }
    }
  }

  toggleTvShowSelection(tvShow: TMDBTvShow): void {
    const selected = this.selectedTvShows();
    const index = selected.findIndex((t) => t.tmdbId === tvShow.id);

    if (index >= 0) {
      // Deselect
      this.selectedTvShows.set(selected.filter((_, i) => i !== index));
    } else {
      // Select (max 5)
      if (selected.length < 5) {
        this.selectedTvShows.set([
          ...selected,
          {
            tmdbId: tvShow.id,
            title: tvShow.name,
            posterPath: tvShow.poster_path || '',
            releaseDate: tvShow.first_air_date || ''
          }
        ]);
      }
    }
  }

  isMovieSelected(movieId: number): boolean {
    return this.selectedMovies().some((m) => m.tmdbId === movieId);
  }

  isTvShowSelected(tvShowId: number): boolean {
    return this.selectedTvShows().some((t) => t.tmdbId === tvShowId);
  }

  loadMore(): void {
    if (this.isLoadingMore() || !this.hasMoreResults()) {
      return;
    }

    this.isLoadingMore.set(true);
    const query = this.searchQuery();
    const nextPage = this.currentPage() + 1;

    const isMovies = this.activeTab() === 'movies';

    if (query.trim()) {
      if (isMovies) {
        this.tmdbService.searchMovies(query, nextPage).subscribe({
          next: (response) => {
            if (response?.success) {
              this.movies.set([...this.movies(), ...response.data.results]);
              this.currentPage.set(nextPage);
              this.hasMoreResults.set(response.data.page < response.data.total_pages);
            }
            this.isLoadingMore.set(false);
          },
          error: () => {
            this.isLoadingMore.set(false);
          }
        });
      } else {
        this.tmdbService.searchTvShows(query, nextPage).subscribe({
          next: (response) => {
            if (response?.success) {
              this.tvShows.set([...this.tvShows(), ...response.data.results]);
              this.currentPage.set(nextPage);
              this.hasMoreResults.set(response.data.page < response.data.total_pages);
            }
            this.isLoadingMore.set(false);
          },
          error: () => {
            this.isLoadingMore.set(false);
          }
        });
      }
    } else {
      if (isMovies) {
        this.tmdbService.getPopularMovies(nextPage).subscribe({
          next: (response) => {
            if (response?.success) {
              this.movies.set([...this.movies(), ...response.data.results]);
              this.currentPage.set(nextPage);
              this.hasMoreResults.set(response.data.page < response.data.total_pages);
            }
            this.isLoadingMore.set(false);
          },
          error: () => {
            this.isLoadingMore.set(false);
          }
        });
      } else {
        this.tmdbService.getPopularTvShows(nextPage).subscribe({
          next: (response) => {
            if (response?.success) {
              this.tvShows.set([...this.tvShows(), ...response.data.results]);
              this.currentPage.set(nextPage);
              this.hasMoreResults.set(response.data.page < response.data.total_pages);
            }
            this.isLoadingMore.set(false);
          },
          error: () => {
            this.isLoadingMore.set(false);
          }
        });
      }
    }
  }

  onContinue(): void {
    if (!this.canContinue()) {
      return;
    }

    this.isLoading.set(true);

    const favoriteMovies = this.selectedMovies().map((m) => ({
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: m.posterPath,
      releaseDate: m.releaseDate
    }));

    const favoriteTvShows = this.selectedTvShows().map((t) => ({
      tmdbId: t.tmdbId,
      name: t.title,
      posterPath: t.posterPath,
      firstAirDate: t.releaseDate
    }));

    this.favoritesService
      .saveFavorites({
        favoriteMovies,
        favoriteTvShows
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message || 'Failed to save favorites');
          this.isLoading.set(false);
        }
      });
  }

  onSkip(): void {
    this.router.navigate(['/dashboard']);
  }

  private loadPopularMovies(): void {
    this.isLoading.set(true);
    this.tmdbService.getPopularMovies().subscribe({
      next: (response) => {
        if (response?.success) {
          this.movies.set(response.data.results);
          this.hasMoreResults.set(response.data.page < response.data.total_pages);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load movies');
        this.isLoading.set(false);
      }
    });
  }

  private loadPopularTvShows(): void {
    this.isLoading.set(true);
    this.tmdbService.getPopularTvShows().subscribe({
      next: (response) => {
        if (response?.success) {
          this.tvShows.set(response.data.results);
          this.hasMoreResults.set(response.data.page < response.data.total_pages);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load TV shows');
        this.isLoading.set(false);
      }
    });
  }
}


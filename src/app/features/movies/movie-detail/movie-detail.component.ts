import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject, effect } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TMDBService, TMDBMovieDetails } from '../../../core/services/tmdb.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { WatchedListService } from '../../../core/services/watched-list.service';
import { AddToListDialogComponent } from '../../../shared/components/add-to-list-dialog/add-to-list-dialog.component';
import { RateDialogComponent } from '../../../shared/components/rate-dialog/rate-dialog.component';

import { ReviewCardComponent } from '../../../shared/components/review-card/review-card.component';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AddToListDialogComponent, RateDialogComponent, TranslatePipe, ReviewCardComponent],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  tmdbService = inject(TMDBService);
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private watchedListService = inject(WatchedListService);
  private location = inject(Location);
  private languageService = inject(LanguageService);

  movie = signal<TMDBMovieDetails | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);

  // Rating & Watched state
  userRating = signal<number | null>(null);
  isWatched = signal(false);
  isRating = signal(false);
  isLogging = signal(false);
  publicStats = signal<{ count: number; averageRating: number } | null>(null);

  isAddToListOpen = signal(false);
  isRateDialogOpen = signal(false);

  // Reviews & Activities
  activities = signal<any[]>([]);
  isLoadingActivities = signal(false);

  // Sorting
  reviewSort = signal<'popular' | 'recent' | 'rating_high' | 'rating_low'>('popular');

  sortedReviews = computed(() => {
    const list = [...this.activities()];
    const sort = this.reviewSort();

    return list.sort((a, b) => {
      // Safety checks for properties
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      const scoreA = (a.likesCount || 0) * 2 - (a.dislikesCount || 0) + (a.commentCount || 0);
      const scoreB = (b.likesCount || 0) * 2 - (b.dislikesCount || 0) + (b.commentCount || 0);

      if (sort === 'recent') {
        return dateB - dateA;
      } else if (sort === 'rating_high') {
        return ratingB - ratingA;
      } else if (sort === 'rating_low') {
        return ratingA - ratingB;
      } else { // popular (default)
        if (scoreA === scoreB) {
          return dateB - dateA;
        }
        return scoreB - scoreA;
      }
    });
  });

  readonly tmdbId = computed(() => this.route.snapshot.paramMap.get('id') || '');

  private previousLanguage = this.languageService.language();

  constructor() {
    effect(() => {
      const currentLang = this.languageService.language();
      if (currentLang !== this.previousLanguage) {
        this.previousLanguage = currentLang;
        const id = this.tmdbId();
        if (id) {
          this.loadMovieDetails(id);
        }
      }
    });

    // Effect to load activities when movie changes
    effect(() => {
      const id = this.tmdbId();
      if (id) {
        this.loadActivities(Number(id));
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    const id = this.tmdbId();
    if (!id) {
      this.router.navigate(['/']);
      return;
    }
    this.loadMovieDetails(id);
    this.loadPublicStats(Number(id));
    if (this.isLoggedIn()) {
      this.checkUserStatus(Number(id));
    }
    // Activities loaded via effect
  }

  loadActivities(tmdbId: number): void {
    this.isLoadingActivities.set(true);
    this.activityService.getMediaActivities('movie', tmdbId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.activities.set(res.data.activities);
        }
        this.isLoadingActivities.set(false);
      },
      error: () => {
        this.isLoadingActivities.set(false);
      }
    });
  }

  // ... (rest of methods)

  openRateDialog(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isRateDialogOpen.set(true);
  }

  closeRateDialog(): void {
    this.isRateDialogOpen.set(false);
  }

  onRate(event: { rating: number, review?: string }): void {
    // Compatibility with event potentially being just a number in some previous versions, 
    // but we updated RateDialog to emit object.
    // However, if we just use explicit typing:
    const rating = event.rating;
    const review = event.review;

    if (this.isRating()) return;

    this.isRating.set(true);
    const movie = this.movie();
    if (!movie) return;

    if (this.isWatched()) {
      // Just update rating (and review)
      this.watchedListService.updateRating(movie.id, 'movie', rating, review).subscribe({
        next: (res) => {
          if (res.success) {
            this.userRating.set(rating);
            this.loadPublicStats(movie.id);
            this.loadActivities(movie.id); // Reload reviews
          }
          this.isRating.set(false);
          this.closeRateDialog();
        },
        error: () => {
          this.isRating.set(false);
        }
      });
    } else {
      // Add to watched with rating and review
      this.watchedListService.addItem({
        tmdbId: movie.id,
        mediaType: 'movie',
        title: movie.title,
        posterPath: movie.poster_path || undefined,
        runtime: movie.runtime || 0,
        genres: movie.genres?.map(g => g.name),
        rating: rating,
        reviewText: review,
        watchedAt: new Date().toISOString()
      }).subscribe({
        next: (res) => {
          if (res.success) {
            this.userRating.set(rating);
            this.isWatched.set(true);
            this.loadPublicStats(movie.id);
            this.loadActivities(movie.id); // Reload reviews
          }
          this.isRating.set(false);
          this.closeRateDialog();
        },
        error: () => {
          this.isRating.set(false);
        }
      });
    }
  }

  loadMovieDetails(id: string): void {
    this.isLoading.set(true);
    // ... existing implementation
    this.error.set(null);

    this.tmdbService.getMovieDetails(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.movie.set(response.data);
        } else {
          this.error.set('Movie not found');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load movie details');
        this.isLoading.set(false);
      }
    });
  }

  checkUserStatus(tmdbId: number): void {
    // Check watched status/rating
    this.watchedListService.checkItem(tmdbId, 'movie').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.isWatched.set(res.data.isWatched);
          this.userRating.set(res.data.rating || null);
        }
      }
    });
  }

  loadPublicStats(tmdbId: number): void {
    this.watchedListService.getPublicStats(tmdbId, 'movie').subscribe({
      next: (res) => {
        if (res.success) {
          this.publicStats.set(res.data);
        }
      }
    });
  }

  getGenreNames(genres: any[] | undefined): string[] {
    return genres?.map(g => g.name) || [];
  }

  getStars(rating: number): number[] {
    const normalizedRating = rating / 2; // TMDB uses 10-point scale, convert to 5
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating % 1 >= 0.5;
    const stars: number[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(1);
    }
    if (hasHalfStar) {
      stars.push(0.5);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(0);
    }
    return stars;
  }

  formatRuntime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  }

  onLogClick(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.toggleWatched();
  }

  toggleWatched(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isLogging()) return;

    const movie = this.movie();
    if (!movie) return;

    this.isLogging.set(true);

    if (this.isWatched()) {
      // Remove from watched
      this.watchedListService.removeItem(movie.id, 'movie').subscribe({
        next: (res) => {
          if (res.success) {
            this.isWatched.set(false);
            this.userRating.set(null);
            this.loadPublicStats(movie.id);
          }
          this.isLogging.set(false);
        },
        error: () => {
          this.isLogging.set(false);
        }
      });
    } else {
      // Add to watched
      this.watchedListService.addItem({
        tmdbId: movie.id,
        mediaType: 'movie',
        title: movie.title,
        posterPath: movie.poster_path || undefined,
        runtime: movie.runtime || 0,
        watchedAt: new Date().toISOString()
      }).subscribe({
        next: (res) => {
          if (res.success) {
            this.isWatched.set(true);
            this.loadPublicStats(movie.id);
          }
          this.isLogging.set(false);
        },
        error: () => {
          this.isLogging.set(false);
        }
      });
    }
  }

  onAddToList(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isAddToListOpen.set(true);
  }

  closeAddToList(): void {
    this.isAddToListOpen.set(false);
  }

  onSortChange(value: string): void {
    this.reviewSort.set(value as 'popular' | 'recent' | 'rating_high' | 'rating_low');
  }

  goBack(): void {
    this.location.back();
  }
}


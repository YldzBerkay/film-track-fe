import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TMDBService, TMDBMovieDetails } from '../../../core/services/tmdb.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { WatchedListService } from '../../../core/services/watched-list.service';
import { AddToListDialogComponent } from '../../../shared/components/add-to-list-dialog/add-to-list-dialog.component';
import { RateDialogComponent } from '../../../shared/components/rate-dialog/rate-dialog.component';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AddToListDialogComponent, RateDialogComponent],
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

  readonly tmdbId = computed(() => this.route.snapshot.paramMap.get('id') || '');

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

  onRate(rating: number): void {
    if (this.isRating()) return;

    this.isRating.set(true);
    const movie = this.movie();
    if (!movie) return;

    this.watchedListService.addItem({
      tmdbId: movie.id,
      mediaType: 'movie',
      title: movie.title,
      posterPath: movie.poster_path || undefined,
      runtime: movie.runtime || 0,
      rating: rating,
      watchedAt: new Date().toISOString()
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.userRating.set(rating);
          this.isWatched.set(true);
          this.loadPublicStats(movie.id);
        }
        this.isRating.set(false);
        this.closeRateDialog();
      },
      error: () => {
        this.isRating.set(false);
      }
    });
  }

  loadMovieDetails(id: string): void {
    this.isLoading.set(true);
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

  goBack(): void {
    this.location.back();
  }
}


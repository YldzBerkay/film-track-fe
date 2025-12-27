import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TMDBService, TMDBTvShowDetails } from '../../../core/services/tmdb.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { WatchedListService } from '../../../core/services/watched-list.service';
import { AddToListDialogComponent } from '../../../shared/components/add-to-list-dialog/add-to-list-dialog.component';
import { RateDialogComponent } from '../../../shared/components/rate-dialog/rate-dialog.component';

@Component({
  selector: 'app-tv-show-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AddToListDialogComponent, RateDialogComponent],
  templateUrl: './tv-show-detail.component.html',
  styleUrl: './tv-show-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TvShowDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  tmdbService = inject(TMDBService);
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private watchedListService = inject(WatchedListService);
  private location = inject(Location);

  tvShow = signal<TMDBTvShowDetails | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);
  selectedSeason = signal<number>(1);

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
    this.loadTvShowDetails(id);
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
    const show = this.tvShow();
    if (!show) return;

    this.watchedListService.addItem({
      tmdbId: show.id,
      mediaType: 'tv',
      title: show.name,
      posterPath: show.poster_path || undefined,
      runtime: 0, // TV shows might have varying runtime, usually passed 0 or avg
      rating: rating,
      watchedAt: new Date().toISOString()
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.userRating.set(rating);
          this.isWatched.set(true);
          this.loadPublicStats(show.id);
        }
        this.isRating.set(false);
        this.closeRateDialog();
      },
      error: () => {
        this.isRating.set(false);
      }
    });
  }

  loadTvShowDetails(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.tmdbService.getShowDetails(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tvShow.set(response.data);
          if (response.data.seasons && response.data.seasons.length > 0) {
            this.selectedSeason.set(response.data.seasons[0].season_number);
          }
        } else {
          this.error.set('TV Show not found');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load TV show details');
        this.isLoading.set(false);
      }
    });
  }

  checkUserStatus(tmdbId: number): void {
    // Check watched status/rating
    this.watchedListService.checkItem(tmdbId, 'tv').subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.isWatched.set(res.data.isWatched);
          this.userRating.set(res.data.rating || null);
        }
      }
    });
  }

  loadPublicStats(tmdbId: number): void {
    this.watchedListService.getPublicStats(tmdbId, 'tv').subscribe({
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  }

  onSeasonSelect(seasonNumber: number): void {
    this.selectedSeason.set(seasonNumber);
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

    const show = this.tvShow();
    if (!show) return;

    this.isLogging.set(true);

    if (this.isWatched()) {
      // Remove from watched
      this.watchedListService.removeItem(show.id, 'tv').subscribe({
        next: (res) => {
          if (res.success) {
            this.isWatched.set(false);
            this.userRating.set(null);
            this.loadPublicStats(show.id);
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
        tmdbId: show.id,
        mediaType: 'tv',
        title: show.name,
        posterPath: show.poster_path || undefined,
        runtime: 0,
        watchedAt: new Date().toISOString()
      }).subscribe({
        next: (res) => {
          if (res.success) {
            this.isWatched.set(true);
            this.loadPublicStats(show.id);
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


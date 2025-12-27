import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TMDBService, TMDBTvShowDetails } from '../../../core/services/tmdb.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { AddToListDialogComponent } from '../../../shared/components/add-to-list-dialog/add-to-list-dialog.component';

@Component({
  selector: 'app-tv-show-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AddToListDialogComponent],
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

  tvShow = signal<TMDBTvShowDetails | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);
  selectedSeason = signal<number>(1);

  isAddToListOpen = signal(false);

  readonly tmdbId = computed(() => this.route.snapshot.paramMap.get('id') || '');

  ngOnInit(): void {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    const id = this.tmdbId();
    if (!id) {
      this.router.navigate(['/']);
      return;
    }
    this.loadTvShowDetails(id);
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
    // TODO: Open log modal
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
}


import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TMDBService, TMDBTvShowDetails, TMDBSeasonDetails } from '../../../core/services/tmdb.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';
import { WatchedListService } from '../../../core/services/watched-list.service';
import { EpisodeRatingService } from '../../../core/services/episode-rating.service';
import { SeasonRatingService } from '../../../core/services/season-rating.service';
import { AddToListDialogComponent } from '../../../shared/components/add-to-list-dialog/add-to-list-dialog.component';
import { RateDialogComponent } from '../../../shared/components/rate-dialog/rate-dialog.component';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';

import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-tv-show-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, AddToListDialogComponent, RateDialogComponent, DialogComponent, TranslatePipe],
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
  private episodeRatingService = inject(EpisodeRatingService);
  private seasonRatingService = inject(SeasonRatingService);
  private location = inject(Location);

  tvShow = signal<TMDBTvShowDetails | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);
  selectedSeason = signal<number | null>(null);
  seasonDetails = signal<TMDBSeasonDetails | null>(null);
  isSeasonLoading = signal(false);

  // Rating & Watched state
  userRating = signal<number | null>(null);
  isWatched = signal(false);
  isRating = signal(false);
  isLogging = signal(false);
  publicStats = signal<{ count: number; averageRating: number } | null>(null);

  isAddToListOpen = signal(false);
  isRateDialogOpen = signal(false);
  isSpecialsDialogOpen = signal(false);
  pendingRating = signal<number | null>(null);

  // Episode ratings (keyed by episode number for current season)
  episodeRatings = signal<Record<number, number>>({});
  episodeRatingDialogOpen = signal(false);
  ratingEpisode = signal<{ seasonNumber: number; episodeNumber: number; name: string } | null>(null);

  // Season ratings (keyed by season number)
  seasonRatings = signal<Record<number, number>>({});
  seasonRatingDialogOpen = signal(false);
  ratingSeason = signal<{ seasonNumber: number; name: string } | null>(null);

  // Public Stats for seasons and episodes
  seasonPublicStats = signal<Record<number, { count: number; averageRating: number }>>({});
  episodePublicStats = signal<Record<number, { count: number; averageRating: number }>>({});

  readonly tmdbId = computed(() => this.route.snapshot.paramMap.get('id') || '');
  readonly hasSpecials = computed(() => this.tvShow()?.seasons.some(s => s.season_number === 0) || false);
  readonly specialsEpisodeCount = computed(() => this.tvShow()?.seasons.find(s => s.season_number === 0)?.episode_count || 0);

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

  calculateTotalRuntime(show: TMDBTvShowDetails, includeSpecials = false): number {
    const avgRuntime = show.episode_run_time?.[0] || 30; // Default to 30 mins

    // Calculate episode count based on preference
    const relevantEpisodes = show.seasons
      .filter(s => includeSpecials || s.season_number !== 0)
      .reduce((acc, s) => acc + s.episode_count, 0);

    return avgRuntime * relevantEpisodes;
  }

  onRate(rating: number): void {
    if (this.isRating()) return;

    const show = this.tvShow();
    if (!show) return;

    if (this.isWatched()) {
      // Just update the rating
      this.isRating.set(true);
      this.watchedListService.updateRating(show.id, 'tv', rating).subscribe({
        next: (res) => {
          if (res.success) {
            this.userRating.set(rating);
            this.loadPublicStats(show.id);
          }
          this.isRating.set(false);
          this.closeRateDialog();
        },
        error: () => {
          this.isRating.set(false);
        }
      });
    } else {
      // Not watched yet, marks as watched. Check for specials.
      this.pendingRating.set(rating);
      if (this.hasSpecials()) {
        this.isSpecialsDialogOpen.set(true);
      } else {
        this.finishToggleWatched(false, rating);
      }
      this.closeRateDialog();
    }
  }

  loadTvShowDetails(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.tmdbService.getShowDetails(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tvShow.set(response.data);
          // By default, no season is selected. Accordions are closed.

          // Load stats for all seasons (bulk fetch)
          this.loadShowSeasonStats(Number(id));

          // Load user's season ratings for this show
          if (this.isLoggedIn()) {
            this.seasonRatingService.getUserRatingsForShow(Number(id)).subscribe({
              next: (res) => {
                if (res.success) {
                  this.seasonRatings.set(res.data.ratings);
                }
              }
            });
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

  loadSeasonDetails(tvId: string, seasonNumber: number): void {
    this.isSeasonLoading.set(true);
    this.episodeRatings.set({}); // Clear previous ratings

    this.tmdbService.getSeasonDetails(tvId, seasonNumber).subscribe({
      next: (response) => {
        if (response.success) {
          this.seasonDetails.set(response.data);

          // Load stats for all episodes in this season (bulk fetch)
          this.loadSeasonEpisodeStats(Number(tvId), seasonNumber);
        }
        this.isSeasonLoading.set(false);
      },
      error: () => {
        this.isSeasonLoading.set(false);
      }
    });

    // Load user's ratings for this season (if logged in)
    if (this.isLoggedIn()) {
      this.episodeRatingService.getUserRatingsForSeason(Number(tvId), seasonNumber).subscribe({
        next: (res) => {
          if (res.success) {
            this.episodeRatings.set(res.data.ratings);
          }
        }
      });
    }
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

  loadSeasonPublicStats(tvId: number, seasonNumber: number): void {
    this.seasonRatingService.getPublicStats(tvId, seasonNumber).subscribe({
      next: (res) => {
        if (res.success) {
          this.seasonPublicStats.update(prev => ({
            ...prev,
            [seasonNumber]: res.data
          }));
        }
      }
    });
  }

  loadShowSeasonStats(tvId: number): void {
    this.seasonRatingService.getShowPublicStats(tvId).subscribe({
      next: (res) => {
        if (res.success) {
          this.seasonPublicStats.set(res.data.stats);
        }
      }
    });
  }

  loadEpisodePublicStats(tvId: number, seasonNumber: number, episodeNumber: number): void {
    this.episodeRatingService.getPublicStats(tvId, seasonNumber, episodeNumber).subscribe({
      next: (res) => {
        if (res.success) {
          this.episodePublicStats.update(prev => ({
            ...prev,
            [episodeNumber]: res.data
          }));
        }
      }
    });
  }

  loadSeasonEpisodeStats(tvId: number, seasonNumber: number): void {
    this.episodeRatingService.getSeasonPublicStats(tvId, seasonNumber).subscribe({
      next: (res) => {
        if (res.success) {
          this.episodePublicStats.set(res.data.stats);
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

  getGenreNames(genres: any[] | undefined): string[] {
    return genres?.map(g => g.name) || [];
  }

  onSeasonSelect(seasonNumber: number): void {
    if (this.selectedSeason() === seasonNumber) {
      this.selectedSeason.set(null); // Collapse if already selected
    } else {
      this.selectedSeason.set(seasonNumber);
      this.loadSeasonDetails(this.tmdbId(), seasonNumber);
    }
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
      this.isLogging.set(true);
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
      // Check for specials (Season 0)
      const hasSpecials = show.seasons.some(s => s.season_number === 0);
      if (hasSpecials) {
        this.isSpecialsDialogOpen.set(true);
      } else {
        this.finishToggleWatched(false);
      }
    }
  }

  onSpecialsConfirm(includeSpecials: boolean): void {
    this.isSpecialsDialogOpen.set(false);
    this.finishToggleWatched(includeSpecials, this.pendingRating());
    this.pendingRating.set(null);
  }

  finishToggleWatched(includeSpecials: boolean, rating: number | null = null): void {
    const show = this.tvShow();
    if (!show) return;

    this.isLogging.set(true);
    this.watchedListService.addItem({
      tmdbId: show.id,
      mediaType: 'tv',
      title: show.name,
      posterPath: show.poster_path || undefined,
      runtime: this.calculateTotalRuntime(show, includeSpecials),
      genres: show.genres?.map(g => g.name),
      numberOfEpisodes: includeSpecials ? show.number_of_episodes + (show.seasons.find(s => s.season_number === 0)?.episode_count || 0) : show.number_of_episodes,
      numberOfSeasons: includeSpecials ? show.number_of_seasons + 1 : show.number_of_seasons,
      rating: rating !== null ? rating : undefined,
      watchedAt: new Date().toISOString()
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.isWatched.set(true);
          if (rating !== null) this.userRating.set(rating);
          this.loadPublicStats(show.id);
        }
        this.isLogging.set(false);
      },
      error: () => {
        this.isLogging.set(false);
      }
    });
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

  openEpisodeRateDialog(episode: { episode_number: number; name: string }): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    const seasonNum = this.selectedSeason();
    if (seasonNum === null) return;

    this.ratingEpisode.set({
      seasonNumber: seasonNum,
      episodeNumber: episode.episode_number,
      name: episode.name
    });
    this.episodeRatingDialogOpen.set(true);
  }

  closeEpisodeRateDialog(): void {
    this.episodeRatingDialogOpen.set(false);
    this.ratingEpisode.set(null);
  }

  onRateEpisode(rating: number): void {
    const ep = this.ratingEpisode();
    if (!ep) return;

    const wasAlreadyRated = !!this.episodeRatings()[ep.episodeNumber];
    const oldRating = this.episodeRatings()[ep.episodeNumber];

    this.episodeRatingService.rateEpisode(
      Number(this.tmdbId()),
      ep.seasonNumber,
      ep.episodeNumber,
      rating
    ).subscribe({
      next: (res) => {
        if (res.success) {
          // Update local ratings
          const current = this.episodeRatings();
          this.episodeRatings.set({
            ...current,
            [ep.episodeNumber]: rating
          });

          // Optimistically update episode public stats
          const currentStats = this.episodePublicStats()[ep.episodeNumber];
          if (currentStats) {
            const newCount = wasAlreadyRated ? currentStats.count : currentStats.count + 1;
            const oldTotal = currentStats.averageRating * currentStats.count;
            const newTotal = wasAlreadyRated
              ? oldTotal - oldRating + rating
              : oldTotal + rating;
            const newAvg = Math.round((newTotal / newCount) * 10) / 10;

            this.episodePublicStats.update(prev => ({
              ...prev,
              [ep.episodeNumber]: { count: newCount, averageRating: newAvg }
            }));
          } else {
            this.episodePublicStats.update(prev => ({
              ...prev,
              [ep.episodeNumber]: { count: 1, averageRating: rating }
            }));
          }
        }
        this.closeEpisodeRateDialog();
      },
      error: () => {
        this.closeEpisodeRateDialog();
      }
    });
  }

  openSeasonRateDialog(season: { season_number: number; name: string }, event: Event): void {
    event.stopPropagation(); // Prevent accordion toggle
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.ratingSeason.set({
      seasonNumber: season.season_number,
      name: season.name
    });
    this.seasonRatingDialogOpen.set(true);
  }

  closeSeasonRateDialog(): void {
    this.seasonRatingDialogOpen.set(false);
    this.ratingSeason.set(null);
  }

  onRateSeason(rating: number): void {
    const s = this.ratingSeason();
    if (!s) return;

    const wasAlreadyRated = !!this.seasonRatings()[s.seasonNumber];
    const oldRating = this.seasonRatings()[s.seasonNumber];

    this.seasonRatingService.rateSeason(
      Number(this.tmdbId()),
      s.seasonNumber,
      rating
    ).subscribe({
      next: (res) => {
        if (res.success) {
          const current = this.seasonRatings();
          this.seasonRatings.set({
            ...current,
            [s.seasonNumber]: rating
          });

          // Optimistically update season public stats
          const currentStats = this.seasonPublicStats()[s.seasonNumber];
          if (currentStats) {
            const newCount = wasAlreadyRated ? currentStats.count : currentStats.count + 1;
            const oldTotal = currentStats.averageRating * currentStats.count;
            const newTotal = wasAlreadyRated
              ? oldTotal - oldRating + rating
              : oldTotal + rating;
            const newAvg = Math.round((newTotal / newCount) * 10) / 10;

            this.seasonPublicStats.update(prev => ({
              ...prev,
              [s.seasonNumber]: { count: newCount, averageRating: newAvg }
            }));
          } else {
            this.seasonPublicStats.update(prev => ({
              ...prev,
              [s.seasonNumber]: { count: 1, averageRating: rating }
            }));
          }
        }
        this.closeSeasonRateDialog();
      },
      error: () => {
        this.closeSeasonRateDialog();
      }
    });
  }
}


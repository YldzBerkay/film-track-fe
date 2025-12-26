import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService, Activity } from '../../core/services/activity.service';
import { TMDBService } from '../../core/services/tmdb.service';

type FeedType = 'following' | 'friends' | 'global';

import { RecommendationService, MealtimeRecommendation } from '../../core/services/recommendation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private activityService = inject(ActivityService);
  private recommendationService = inject(RecommendationService);
  tmdbService = inject(TMDBService);
  router = inject(Router);

  activeFeedType = signal<FeedType>('following');
  searchQuery = signal<string>('');
  activities = signal<Activity[]>([]);
  isLoading = signal(false);
  currentPage = signal(1);
  hasMore = signal(true);

  readonly user = computed(() => this.authService.user());
  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  dailyPick = signal<DailyPick | null>(null);
  mealtimePick = signal<MealtimeRecommendation | null>(null);
  isDailyPickLoading = signal(true);
  isMealtimePickLoading = signal(true);

  // Mock pool of daily picks - ideally this would come from a backend 'trending' endpoint
  private readonly DAILY_PICK_POOL: DailyPick[] = [
    {
      tmdbId: 27205,
      title: 'Inception',
      year: 2010,
      genre: 'Sci-Fi',
      backdropUrl: 'https://image.tmdb.org/t/p/w500/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
      overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.'
    },
    {
      tmdbId: 438631,
      title: 'Dune',
      year: 2021,
      genre: 'Sci-Fi',
      backdropUrl: 'https://image.tmdb.org/t/p/w500/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
      overview: 'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.'
    },
    {
      tmdbId: 872585,
      title: 'Oppenheimer',
      year: 2023,
      genre: 'History',
      backdropUrl: 'https://image.tmdb.org/t/p/w500/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
      overview: 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.'
    },
    {
      tmdbId: 157336,
      title: 'Interstellar',
      year: 2014,
      genre: 'Sci-Fi',
      backdropUrl: 'https://image.tmdb.org/t/p/w500/pbrkL804c8yAv3zBZR4QPEafpAR.jpg',
      overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.'
    },
    {
      tmdbId: 155,
      title: 'The Dark Knight',
      year: 2008,
      genre: 'Action',
      backdropUrl: 'https://image.tmdb.org/t/p/w500/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
      overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.'
    }
  ];

  ngOnInit(): void {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadFeed();
    this.loadDailyPick();
    this.loadMealtimePick();
  }

  loadMealtimePick(): void {
    this.isMealtimePickLoading.set(true);
    this.recommendationService.getMealtimePick().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mealtimePick.set(response.data);
        }
        this.isMealtimePickLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load mealtime pick', err);
        this.isMealtimePickLoading.set(false);
      }
    });
  }

  loadDailyPick(): void {
    this.isDailyPickLoading.set(true);
    // 1. Fetch user's recent activity to find what they've watched
    this.activityService.getUserActivities(1, 100).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const watchedTmdbIds = new Set(
            response.data.activities
              .filter(a => ['movie_watched', 'rating', 'review'].includes(a.type))
              .map(a => a.tmdbId)
          );

          // 2. Find the first movie in the pool that hasn't been watched
          const pick = this.DAILY_PICK_POOL.find(movie => !watchedTmdbIds.has(movie.tmdbId));

          // 3. Fallback to the first one if all are watched (or maybe randomize)
          this.dailyPick.set(pick || this.DAILY_PICK_POOL[0]);
        } else {
          // Fallback if API fails
          this.dailyPick.set(this.DAILY_PICK_POOL[0]);
        }
        this.isDailyPickLoading.set(false);
      },
      error: () => {
        // Fallback on error
        this.dailyPick.set(this.DAILY_PICK_POOL[0]);
        this.isDailyPickLoading.set(false);
      }
    });
  }

  onFeedTypeChange(type: FeedType): void {
    this.activeFeedType.set(type);
    this.currentPage.set(1);
    this.activities.set([]);
    this.loadFeed();
  }

  loadFeed(): void {
    this.isLoading.set(true);
    this.activityService
      .getFeed(this.activeFeedType(), this.currentPage())
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            if (this.currentPage() === 1) {
              this.activities.set(response.data.activities);
            } else {
              this.activities.set([...this.activities(), ...response.data.activities]);
            }
            this.hasMore.set(
              response.data.pagination.page < response.data.pagination.totalPages
            );
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }

  loadMore(): void {
    if (this.isLoading() || !this.hasMore()) {
      return;
    }
    this.currentPage.set(this.currentPage() + 1);
    this.loadFeed();
  }

  getStars(rating: number | undefined): number[] {
    if (!rating) {
      return [0, 0, 0, 0, 0];
    }
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
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

  getYear(dateString: string): number {
    return new Date(dateString).getFullYear();
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  onLogClick(): void {
    // TODO: Open log modal
  }

  onSearch(): void {
    const query = this.searchQuery();
    if (query.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}

interface DailyPick {
  tmdbId: number;
  title: string;
  year: number;
  genre: string;
  backdropUrl: string;
  overview: string;
}


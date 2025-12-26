import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService, Activity } from '../../core/services/activity.service';
import { TMDBService } from '../../core/services/tmdb.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';

type FeedType = 'following' | 'friends' | 'global';

import { RecommendationService, MealtimeRecommendation, DailyPick } from '../../core/services/recommendation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DialogComponent],
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


  showMemoryDialog = signal(false);
  memoryText = signal('');
  isDialogLoading = signal(false);
  dialogResult = signal<{ success: boolean; message: string; confidence?: number } | null>(null);

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
    this.recommendationService.getDailyPick().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.dailyPick.set(response.data);
        }
        this.isDailyPickLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load daily pick', err);
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

  openMemoryDialog(): void {
    this.showMemoryDialog.set(true);
  }

  closeMemoryDialog(): void {
    this.showMemoryDialog.set(false);
    this.memoryText.set('');
    this.isDialogLoading.set(false);
    this.dialogResult.set(null);
  }

  handleMemorySubmit(text: string | void): void {
    if (typeof text === 'string') {
      const pick = this.dailyPick();
      if (!pick) {
        console.error('No daily pick available');
        return;
      }

      this.isDialogLoading.set(true);

      this.recommendationService.verifyMemory(pick.title, pick.overview, text).subscribe({
        next: (response) => {
          this.isDialogLoading.set(false);
          if (response.success && response.data) {
            const result = response.data;
            this.dialogResult.set({
              success: result.watched,
              message: result.watched ? 'You watched today\'s movie successfully!' : result.reasoning,
              confidence: result.confidence
            });
            // Update the dailyPick to reflect watched status
            if (result.watched) {
              this.dailyPick.set({ ...pick, watched: true });
            }
          }
        },
        error: (err) => {
          console.error('Memory verification failed:', err);
          this.isDialogLoading.set(false);
          this.dialogResult.set({
            success: false,
            message: 'Failed to verify memory. Please try again.'
          });
        }
      });
    }
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




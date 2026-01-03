import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject, effect, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService, Activity } from '../../core/services/activity.service';
import { TMDBService } from '../../core/services/tmdb.service';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe } from '../../core/i18n';
import { WatchlistService, DashboardListSummary } from '../../core/services/watchlist.service';
import { WatchedListService } from '../../core/services/watched-list.service';

type FeedType = 'following' | 'friends' | 'global';

import { RecommendationService, MealtimeRecommendation, DailyPick, MoodRecommendation } from '../../core/services/recommendation.service';
import { CommentListComponent } from '../../shared/components/comments/comment-list/comment-list.component';

import { CreateListDialogComponent } from '../../shared/components/create-list-dialog/create-list-dialog.component';
import { FriendMealtimeDialogComponent } from './components/friend-mealtime-dialog/friend-mealtime-dialog.component';
import { TasteMatchDialogComponent } from './components/taste-match-dialog/taste-match-dialog.component';
import { ActivityCardComponent } from '../../shared/components/activity-card/activity-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CommentListComponent,
    HeaderComponent,
    DialogComponent,
    TranslatePipe,
    CreateListDialogComponent,
    FriendMealtimeDialogComponent,
    TasteMatchDialogComponent,
    ActivityCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private activityService = inject(ActivityService);
  private recommendationService = inject(RecommendationService);
  private languageService = inject(LanguageService);
  private watchlistService = inject(WatchlistService);
  private watchedListService = inject(WatchedListService);
  tmdbService = inject(TMDBService);
  router = inject(Router);

  private previousLanguage = this.languageService.language();

  constructor() {
    // Effect to reload language-dependent content when language changes
    effect(() => {
      const currentLang = this.languageService.language();
      // Skip on first run or if language hasn't changed
      if (currentLang !== this.previousLanguage) {
        this.previousLanguage = currentLang;
        this.reloadLanguageDependentContent();
      }
    });

    // Effect for infinite scroll
    effect(() => {
      if (this.isAnchorIntersecting() && this.hasMore() && !this.isLoading()) {
        this.loadMore();
      }
    }, { allowSignalWrites: true });
  }

  private reloadLanguageDependentContent(): void {
    if (this.isAuthenticated()) {
      this.loadDailyPick();
      this.loadMealtimePick();
      this.loadMoodRecommendations();
      this.loadLists();
    }
  }

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

  // Lists section state
  defaultWatchlist = signal<DashboardListSummary | null>(null);
  watchedList = signal<DashboardListSummary | null>(null);
  customWatchlists = signal<DashboardListSummary[]>([]);

  // Create List Dialog state
  showCreateListDialog = signal(false);
  isCreatingList = signal(false);

  showMemoryDialog = signal(false);
  memoryText = signal('');
  isDialogLoading = signal(false);
  dialogResult = signal<{ success: boolean; message: string; confidence?: number } | null>(null);

  // Friend Mealtime Roulette state
  showFriendDialog = signal(false);

  // Mood Recommendations state
  moodRecommendations = signal<MoodRecommendation[]>([]);
  isMoodRecsLoading = signal(false);
  moodRecsMode = signal<'match' | 'shift'>('match');
  includeWatched = signal(false);

  // Taste Match Dialog state
  showTasteMatchDialog = signal(false);
  tasteMatchTargetUser = signal<{ id: string; name: string } | null>(null);

  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  private observer: IntersectionObserver | null = null;
  isAnchorIntersecting = signal(false);

  ngOnInit(): void {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadFeed();
    this.loadDailyPick();
    this.loadMealtimePick();
    this.loadMoodRecommendations();
    this.loadLists();
    this.loadSavedActivityIds();
  }

  ngAfterViewInit(): void {
    const options = {
      root: null,
      rootMargin: '100px', // Preload before reaching bottom
      threshold: 0.1
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isAnchorIntersecting.set(entry.isIntersecting);
      });
    }, options);

    if (this.scrollAnchor) {
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  openCreateListDialog(): void {
    this.showCreateListDialog.set(true);
  }

  closeCreateListDialog(): void {
    this.showCreateListDialog.set(false);
  }

  handleCreateList(data: { name: string; icon: string }): void {
    this.isCreatingList.set(true);
    this.watchlistService.createCustomList(data.name, data.icon).subscribe({
      next: (response) => {
        if (response.success && response.data.watchlist) {
          // Add new list to custom lists
          const newSummary: DashboardListSummary = {
            _id: response.data.watchlist._id,
            name: response.data.watchlist.name,
            icon: response.data.watchlist.icon,
            itemCount: 0, // New list is empty
            isDefault: response.data.watchlist.isDefault
          };
          this.customWatchlists.update(lists => [...lists, newSummary]);
          this.closeCreateListDialog();
        }
        this.isCreatingList.set(false);
      },
      error: (err) => {
        console.error('Failed to create list', err);
        this.isCreatingList.set(false);
      }
    });
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

  loadLists(): void {
    this.watchlistService.getDashboardSummary().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          if (response.data.watchedList) {
            this.watchedList.set(response.data.watchedList);
          }
          if (response.data.defaultWatchlist) {
            this.defaultWatchlist.set(response.data.defaultWatchlist);
          }
          if (response.data.customList) {
            this.customWatchlists.set([response.data.customList]);
          } else {
            this.customWatchlists.set([]);
          }
        }
      },
      error: (err) => console.error('Failed to load lists summary', err)
    });
  }

  onFeedTypeChange(type: FeedType): void {
    this.activeFeedType.set(type);
    this.currentPage.set(1);
    this.activities.set([]);
    window.scrollTo(0, 0); // Reset scroll position
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
              response.data.pagination.page < response.data.pagination.pages
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

  // Friend Mealtime Roulette Methods
  openFriendDialog(): void {
    this.showFriendDialog.set(true);
  }

  closeFriendDialog(): void {
    this.showFriendDialog.set(false);
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

  loadMoodRecommendations(): void {
    this.isMoodRecsLoading.set(true);
    this.recommendationService.getMoodBasedRecommendations(this.moodRecsMode(), 1, this.includeWatched()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.moodRecommendations.set(response.data);
        }
        this.isMoodRecsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load mood recommendations:', err);
        this.isMoodRecsLoading.set(false);
      }
    });
  }

  toggleMoodRecsMode(): void {
    const newMode = this.moodRecsMode() === 'match' ? 'shift' : 'match';
    this.moodRecsMode.set(newMode);
    this.loadMoodRecommendations();
  }

  toggleIncludeWatched(): void {
    this.includeWatched.set(!this.includeWatched());
    this.loadMoodRecommendations();
  }

  getPosterUrl(path: string): string {
    if (!path) return '';
    return `https://image.tmdb.org/t/p/w300${path}`;
  }

  getYear(dateString: string): number {
    return new Date(dateString).getFullYear();
  }



  // Bookmark state - track bookmarked activity IDs
  bookmarkedActivities = signal<Set<string>>(new Set());

  loadSavedActivityIds(): void {
    this.activityService.getSavedActivities(1, 100).subscribe({
      next: (response) => {
        if (response.success && response.data?.activities) {
          const ids = new Set(response.data.activities.map(a => a._id));
          this.bookmarkedActivities.set(ids);
        }
      },
      error: (err) => {
        console.error('Failed to load saved activities:', err);
      }
    });
  }

  isActivityBookmarked(activityId: string): boolean {
    return this.bookmarkedActivities().has(activityId);
  }

  toggleBookmark(activity: Activity): void {
    if (!this.isAuthenticated()) return;

    const activityId = activity._id;
    const isCurrentlyBookmarked = this.isActivityBookmarked(activityId);

    // Optimistic update
    this.bookmarkedActivities.update(set => {
      const newSet = new Set(set);
      if (isCurrentlyBookmarked) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });

    this.activityService.toggleBookmark(activityId).subscribe({
      next: (response) => {
        if (response.success) {
          // Update based on server response
          this.bookmarkedActivities.update(set => {
            const newSet = new Set(set);
            if (response.data.bookmarked) {
              newSet.add(activityId);
            } else {
              newSet.delete(activityId);
            }
            return newSet;
          });
        }
      },
      error: () => {
        // Revert optimistic update on error
        this.bookmarkedActivities.update(set => {
          const newSet = new Set(set);
          if (isCurrentlyBookmarked) {
            newSet.add(activityId);
          } else {
            newSet.delete(activityId);
          }
          return newSet;
        });
      }
    });
  }

  // Taste Match Dialog Methods
  openTasteMatchDialog(userId: string, userName: string): void {
    // Don't open for own profile
    if (userId === this.user()?.id) return;

    this.tasteMatchTargetUser.set({ id: userId, name: userName });
    this.showTasteMatchDialog.set(true);
  }

  closeTasteMatchDialog(): void {
    this.showTasteMatchDialog.set(false);
  }
}

import { Component, ChangeDetectionStrategy, signal, computed, OnInit, AfterViewInit, inject, ViewChild, ElementRef, effect, HostListener, isDevMode } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService, UserProfile, Badge } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { TMDBService } from '../../core/services/tmdb.service';
import { MoodService, MoodVector, MoodTimelineEntry, MoodComparison } from '../../core/services/mood.service';
import { RecommendationService, MoodRecommendation } from '../../core/services/recommendation.service';
import { MoodChartComponent } from '../../shared/components/mood-chart/mood-chart.component';
import { MoodTimelineComponent } from '../../shared/components/mood-timeline/mood-timeline.component';
import { RateDialogComponent } from '../../shared/components/rate-dialog/rate-dialog.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { ShareDialogComponent } from '../../shared/components/share-dialog/share-dialog.component';
import { EditFavoritesDialogComponent } from '../../shared/components/edit-favorites-dialog/edit-favorites-dialog.component';
import { FavoritesService, FavoriteMovie, FavoriteTvShow } from '../../core/services/favorites.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslationService, TranslatePipe } from '../../core/i18n';
import { WatchedListService, WatchedList } from '../../core/services/watched-list.service';
import { WatchlistService, Watchlist } from '../../core/services/watchlist.service';
import { EditListDialogComponent, ListItem } from '../../shared/components/edit-list-dialog/edit-list-dialog.component';
import { WatchedReportsDialogComponent } from '../../shared/components/watched-reports-dialog/watched-reports-dialog.component';
import { forkJoin } from 'rxjs';

type TabType = 'profile' | 'watchlist' | 'lists' | 'reviews' | 'likes' | 'settings';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MoodChartComponent, MoodTimelineComponent, HeaderComponent, ShareDialogComponent, EditFavoritesDialogComponent, EditListDialogComponent, WatchedReportsDialogComponent, TranslatePipe, RateDialogComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit, AfterViewInit {
  isDev = isDevMode();
  private route = inject(ActivatedRoute);
  router = inject(Router);
  userService = inject(UserService);
  authService = inject(AuthService);
  tmdbService = inject(TMDBService);
  moodService = inject(MoodService);
  recommendationService = inject(RecommendationService);
  favoritesService = inject(FavoritesService);
  languageService = inject(LanguageService);
  translationService = inject(TranslationService);
  private watchedListService = inject(WatchedListService);
  private watchlistService = inject(WatchlistService);

  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<TabType>('profile');
  moodData = signal<MoodVector | null>(null);
  isLoadingMood = signal(false);
  moodTimeline = signal<MoodTimelineEntry[]>([]);
  isLoadingTimeline = signal(false);
  badges = signal<Badge[]>([]);
  isLoadingBadges = signal(false);
  moodRecommendations = signal<MoodRecommendation[]>([]);
  isLoadingRecommendations = signal(false);
  moodRecsMode = signal<'match' | 'shift'>('match');
  includeWatched = signal(false);

  // Unified loading state for all mood sections
  isRefreshingAllMood = signal(false);

  // Threshold state for AI recommendations (25 movies required)
  aiThresholdNotMet = signal(false);
  aiThresholdMeta = signal<{ currentCount: number; requiredCount: number; remaining: number } | null>(null);

  // Timeline needs at least 3 days of data to display properly
  hasEnoughTimelineData = computed(() => this.moodTimeline().length >= 3);

  // RL Feedback System - Track which cards have been rated
  ratedCards = signal<Set<number>>(new Set()); // Set of tmdbIds that have been liked/disliked
  replacementQuota = signal<{ remaining: number; total: number }>({ remaining: 3, total: 3 });

  // Rating dialog state (shown after like/dislike)
  showRatingDialog = signal(false);
  ratingDialogMovie = signal<MoodRecommendation | null>(null);
  ratingDialogAction = signal<'like' | 'dislike'>('like');
  selectedRating = signal(7); // Default rating

  // Watched list for Lists tab
  watched = signal<WatchedList | null>(null);

  // Watchlists for Lists tab
  defaultWatchlist = signal<Watchlist | null>(null);
  customWatchlists = signal<Watchlist[]>([]);
  listsViewMode = signal<'slider' | 'list'>('slider');

  // Privacy dropdown state
  activePrivacyDropdown = signal<string | null>(null);  // 'watched', 'watchlist', or list ID

  // Follow state
  isFollowing = signal(false);
  isFollowLoading = signal(false);

  // Carousel scroll visibility state
  isBadgesScrollable = signal(false);
  isPremiumDeckScrollable = signal(false);
  isMoviesFavoritesScrollable = signal(false);
  isTvFavoritesScrollable = signal(false);

  // Followers/Following dialog state
  showUserListDialog = signal(false);
  userListType = signal<'followers' | 'following'>('followers');
  userList = signal<Array<{ id: string; username: string; name: string }>>([]);
  isUserListLoading = signal(false);

  // Edit Profile state
  showEditProfileDialog = signal(false);
  editName = signal('');
  editUsername = signal('');
  editAvatar = signal('');
  editBanner = signal('');
  selectedFile: File | null = null;
  selectedBannerFile: File | null = null;
  isEditLoading = signal(false);
  isBannerLoading = signal(false);
  canChangeUsername = signal(true);
  canChangeUsernameAt = signal<string | null>(null);

  // Mood Comparison state
  showComparisonDialog = signal(false);
  moodComparison = signal<MoodComparison | null>(null);
  isLoadingComparison = signal(false);

  // Share Dialog state
  showShareDialog = signal(false);
  shareUrl = signal('');

  // Watched Reports state
  showReportsDialog = signal(false);

  // Edit Favorites Dialog state
  showEditFavoritesDialog = signal(false);
  editFavoritesTab = signal<'movies' | 'tv'>('movies');

  // Edit List Dialog state
  showEditListDialog = signal(false);
  selectedListForEdit = signal<Watchlist | null>(null);

  // CSV Import state
  isImporting = signal(false);
  importResult = signal<{ importedCount: number; skippedCount: number; failedCount: number; failedItems: string[]; estimatedProcessingSeconds: number } | null>(null);
  showFailedItems = signal(false);
  overwriteExisting = signal(false);

  // Helper method to get estimated processing time in minutes
  getEstimatedMinutes(): number {
    const result = this.importResult();
    if (!result?.estimatedProcessingSeconds) return 0;
    return Math.ceil(result.estimatedProcessingSeconds / 60);
  }

  currentYear = new Date().getFullYear();

  private previousLanguage = this.languageService.language();

  constructor() {
    effect(() => {
      // Track language changes
      const currentLang = this.languageService.language();

      // Only reload on actual language changes after initialization
      if (currentLang !== this.previousLanguage) {
        this.previousLanguage = currentLang;
        this.reloadLanguageDependentContent();
      }
    });
  }

  reloadLanguageDependentContent(): void {
    if (this.isOwnProfile()) {
      this.loadMoodRecommendations();
      this.loadLists();
      this.loadBadges();
      this.loadMoodTimeline();
    }
    // For other users' profile, we might want to reload the profile data itself if it contains translated fields
    // but usually TMDB data is what's translated.
    const username = this.username();
    if (username) {
      this.loadProfile(username);
    } else {
      this.loadCurrentProfile();
    }
  }

  readonly username = computed(() => {
    const param = this.route.snapshot.paramMap.get('username');
    return param || '';
  });

  readonly isOwnProfile = computed(() => {
    if (!this.username()) {
      return true; // No username means current user's profile
    }
    const currentUser = this.authService.user();
    return currentUser?.username === this.username();
  });

  ngOnInit(): void {
    const username = this.username();
    if (!username) {
      // No username in route, load current user's profile
      this.loadCurrentProfile();
    } else {
      this.loadProfile(username);
    }

    // Read tab from query params
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam && ['profile', 'lists', 'reviews', 'likes'].includes(tabParam)) {
      this.activeTab.set(tabParam as TabType);
    }

    // Load mood data if viewing own profile
    if (this.isOwnProfile()) {
      this.loadMood();
      this.loadMoodTimeline();
      this.loadBadges();
      this.loadMoodRecommendations();
      this.loadLists();
    }
  }

  ngAfterViewInit(): void {
    // Check scrollable status after view initializes (with longer delay for content to render)
    setTimeout(() => this.updateScrollableStatus(), 500);
  }

  // Effect to update scrollable status when content changes
  private scrollableEffect = effect(() => {
    // Track content changes that affect scrollability
    this.badges();
    this.moodRecommendations();
    this.profile();
    // Re-check scrollable status after content updates
    setTimeout(() => this.updateScrollableStatus(), 100);
  });

  @HostListener('window:resize')
  onResize(): void {
    this.updateScrollableStatus();
  }

  updateScrollableStatus(): void {
    // Check each carousel's scrollable status
    if (this.badgesContainer?.nativeElement) {
      const el = this.badgesContainer.nativeElement;
      this.isBadgesScrollable.set(el.scrollWidth > el.clientWidth);
    }
    if (this.premiumDeckGrid?.nativeElement) {
      const el = this.premiumDeckGrid.nativeElement;
      this.isPremiumDeckScrollable.set(el.scrollWidth > el.clientWidth);
    }
    if (this.moviesFavoritesGrid?.nativeElement) {
      const el = this.moviesFavoritesGrid.nativeElement;
      this.isMoviesFavoritesScrollable.set(el.scrollWidth > el.clientWidth);
    }
    if (this.tvFavoritesGrid?.nativeElement) {
      const el = this.tvFavoritesGrid.nativeElement;
      this.isTvFavoritesScrollable.set(el.scrollWidth > el.clientWidth);
    }
  }

  loadProfile(username: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    const lang = this.languageService.language();

    this.userService.getProfile(username, lang).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profile.set(response.data);
          // Set follow status from API response
          if (response.data.isFollowedByMe !== undefined) {
            this.isFollowing.set(response.data.isFollowedByMe);
          }
          // Sync with AuthService if it's our own profile
          if (this.isOwnProfile()) {
            this.authService.updateUser({
              name: response.data.user.name,
              avatar: response.data.user.avatar || undefined,
              banner: response.data.user.banner || undefined
            });
          }
        } else {
          this.error.set('Profile not found');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load profile');
        this.isLoading.set(false);
      }
    });
  }

  loadCurrentProfile(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const lang = this.languageService.language();

    this.userService.getCurrentProfile(lang).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.profile.set(response.data);
          this.authService.updateUser({
            name: response.data.user.name,
            avatar: response.data.user.avatar || undefined,
            banner: response.data.user.banner || undefined
          });
        } else {
          this.error.set('Failed to load profile');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load profile');
        this.isLoading.set(false);
      }
    });
  }

  checkFollowStatus(targetUserId: string): void {
    // We need to check via the current user's following list
    // For now, we'll rely on backend to tell us via profile API extension
    // Simplified: assume not following initially, adjusted in follow/unfollow actions
  }

  followUser(): void {
    const profileData = this.profile();
    if (!profileData) return;

    this.isFollowLoading.set(true);
    this.userService.followUser(profileData.user.id).subscribe({
      next: () => {
        this.isFollowing.set(true);
        // Update follower count locally
        this.profile.set({
          ...profileData,
          user: {
            ...profileData.user,
            followersCount: profileData.user.followersCount + 1
          }
        });
        this.isFollowLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to follow:', err);
        this.isFollowLoading.set(false);
      }
    });
  }

  unfollowUser(): void {
    const profileData = this.profile();
    if (!profileData) return;

    this.isFollowLoading.set(true);
    this.userService.unfollowUser(profileData.user.id).subscribe({
      next: () => {
        this.isFollowing.set(false);
        // Update follower count locally
        this.profile.set({
          ...profileData,
          user: {
            ...profileData.user,
            followersCount: Math.max(profileData.user.followersCount - 1, 0)
          }
        });
        this.isFollowLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to unfollow:', err);
        this.isFollowLoading.set(false);
      }
    });
  }

  onTabChange(tab: TabType): void {
    this.activeTab.set(tab);
    // Update URL query params without navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: ''
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return this.translationService.t('common.justNow');
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this.translationService.t(diffInMinutes === 1 ? 'common.minuteAgo' : 'common.minutesAgo', { count: diffInMinutes });
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this.translationService.t(diffInHours === 1 ? 'common.hourAgo' : 'common.hoursAgo', { count: diffInHours });
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return this.translationService.t(diffInDays === 1 ? 'common.dayAgo' : 'common.daysAgo', { count: diffInDays });
    }
    const diffInWeeks = Math.floor(diffInDays / 7);
    return this.translationService.t(diffInWeeks === 1 ? 'common.weekAgo' : 'common.weeksAgo', { count: diffInWeeks });
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  formatRuntime(minutes: number): string {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  loadMood(): void {
    this.isLoadingMood.set(true);
    this.moodService.getUserMood().subscribe({
      next: (response: any) => {
        // Handle NOT_ENOUGH_DATA threshold error
        if (response.error === 'NOT_ENOUGH_DATA' && response.meta) {
          this.aiThresholdNotMet.set(true);
          this.aiThresholdMeta.set(response.meta);
          this.moodData.set(null);
          this.isLoadingMood.set(false);
          return;
        }

        // Success case  
        this.aiThresholdNotMet.set(false);

        if (response.success && response.data) {
          this.moodData.set(response.data);
        }
        this.isLoadingMood.set(false);
      },
      error: () => {
        this.isLoadingMood.set(false);
      }
    });
  }

  /**
   * Refresh All Mood Data - Parallel API calls for better performance
   * Refreshes: Mood Chart, Mood Timeline, and Mood Recommendations
   */
  refreshMood(): void {
    // Set all loading states
    this.isRefreshingAllMood.set(true);
    this.isLoadingMood.set(true);
    this.isLoadingTimeline.set(true);
    this.isLoadingRecommendations.set(true);

    // Parallel API calls using forkJoin
    forkJoin({
      mood: this.moodService.getUserMood(true),
      timeline: this.moodService.getMoodTimeline(30),
      recommendations: this.recommendationService.getMoodBasedRecommendations(
        this.moodRecsMode(),
        5,
        this.includeWatched(),
        true // Force refresh (clears cache)
      )
    }).subscribe({
      next: (results) => {
        // Update Mood Chart
        if (results.mood.success && results.mood.data) {
          this.moodData.set(results.mood.data);
        }

        // Update Mood Timeline
        if (results.timeline.success && results.timeline.data) {
          this.moodTimeline.set(results.timeline.data);
        }

        // Update Recommendations
        if (results.recommendations.success && results.recommendations.data) {
          const recommendations = results.recommendations.data.map(rec => ({
            ...rec,
            score: Math.round(rec.moodSimilarity)
          }));
          this.moodRecommendations.set(recommendations);
        }

        // Clear all loading states
        this.isRefreshingAllMood.set(false);
        this.isLoadingMood.set(false);
        this.isLoadingTimeline.set(false);
        this.isLoadingRecommendations.set(false);
      },
      error: (error) => {
        console.error('[Mood Refresh] Error:', error);
        this.isRefreshingAllMood.set(false);
        this.isLoadingMood.set(false);
        this.isLoadingTimeline.set(false);
        this.isLoadingRecommendations.set(false);
      }
    });
  }

  loadWatchedList(): void {
    const limit = this.activeTab() === 'profile' ? 10 : undefined;
    this.watchedListService.getWatchedList(limit).subscribe({
      next: (response) => {
        if (response.success && response.data.watchedList) {
          this.watched.set(response.data.watchedList);
        }
      },
      error: (err) => console.error('Failed to load watched list', err)
    });
  }

  loadLists(): void {
    const limit = this.activeTab() === 'profile' ? 10 : undefined;

    // Load watched list
    this.loadWatchedList();

    // Load default watchlist
    this.watchlistService.getDefaultWatchlist(limit).subscribe({
      next: (response) => {
        if (response.success && response.data.watchlist) {
          this.defaultWatchlist.set(response.data.watchlist);
        }
      },
      error: (err) => console.error('Failed to load default watchlist', err)
    });

    // Load all watchlists to get custom lists
    this.watchlistService.getWatchlists(limit).subscribe({
      next: (response) => {
        if (response.success && response.data.watchlists) {
          const customLists = response.data.watchlists.filter(l => !l.isDefault);
          this.customWatchlists.set(customLists);
        }
      },
      error: (err) => console.error('Failed to load watchlists', err)
    });
  }

  @ViewChild('watchlistContainer') watchlistContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('premiumDeckGrid') premiumDeckGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('moviesFavoritesGrid') moviesFavoritesGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('tvFavoritesGrid') tvFavoritesGrid!: ElementRef<HTMLDivElement>;
  @ViewChild('badgesContainer') badgesContainer!: ElementRef<HTMLDivElement>;

  scrollWatchlist(direction: 'left' | 'right'): void {
    if (!this.watchlistContainer) return;

    const container = this.watchlistContainer.nativeElement;
    const scrollAmount = 300;

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  scrollPremiumDeck(direction: 'left' | 'right'): void {
    if (!this.premiumDeckGrid) return;

    const container = this.premiumDeckGrid.nativeElement;
    const scrollAmount = 300;

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  scrollCarousel(event: Event, direction: 'left' | 'right'): void {
    const button = event.currentTarget as HTMLElement;
    const container = button.parentElement?.querySelector('.carousel-grid') as HTMLElement;
    if (!container) return;

    const scrollAmount = 300;

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  scrollCustomList(containerId: string, direction: 'left' | 'right'): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scrollAmount = 300;

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.activePrivacyDropdown.set(null);
  }

  togglePrivacyDropdown(listId: string, event: Event): void {
    event.stopPropagation();
    if (this.activePrivacyDropdown() === listId) {
      this.activePrivacyDropdown.set(null);
    } else {
      this.activePrivacyDropdown.set(listId);
    }
  }

  closePrivacyDropdown(): void {
    this.activePrivacyDropdown.set(null);
  }

  updateWatchedPrivacy(privacyStatus: number): void {
    this.watchedListService.updatePrivacy(privacyStatus).subscribe({
      next: (response) => {
        if (response.success && response.data.watchedList) {
          this.watched.set(response.data.watchedList);
        }
      },
      error: (err) => console.error('Failed to update watched list privacy', err)
    });
    this.activePrivacyDropdown.set(null);
  }

  updateWatchlistPrivacy(watchlistId: string, privacyStatus: number): void {
    this.watchlistService.updatePrivacy(watchlistId, privacyStatus).subscribe({
      next: (response) => {
        if (response.success && response.data.watchlist) {
          const updated = response.data.watchlist;
          if (updated.isDefault) {
            this.defaultWatchlist.set(updated);
          } else {
            this.customWatchlists.update(lists =>
              lists.map(l => l._id === updated._id ? updated : l)
            );
          }
        }
      },
      error: (err) => console.error('Failed to update watchlist privacy', err)
    });
    this.activePrivacyDropdown.set(null);
  }

  getPrivacyIcon(privacyStatus: number | undefined): string {
    switch (privacyStatus) {
      case 1: return 'group';
      case 2: return 'lock';
      default: return 'public';
    }
  }

  getPrivacyLabel(privacyStatus: number | undefined): string {
    switch (privacyStatus) {
      case 1: return this.translationService.t('privacy.friends');
      case 2: return this.translationService.t('privacy.nobody');
      default: return this.translationService.t('privacy.everyone');
    }
  }

  loadMoodTimeline(): void {
    this.isLoadingTimeline.set(true);
    this.moodService.getMoodTimeline(30).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.moodTimeline.set(response.data);
        }
        this.isLoadingTimeline.set(false);
      },
      error: () => {
        this.isLoadingTimeline.set(false);
      }
    });
  }

  loadBadges(): void {
    this.isLoadingBadges.set(true);
    this.userService.getBadges(true).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.badges.set(response.data);
        }
        this.isLoadingBadges.set(false);
      },
      error: () => {
        this.isLoadingBadges.set(false);
      }
    });
  }

  scrollBadges(direction: 'left' | 'right'): void {
    if (!this.badgesContainer) return;

    const container = this.badgesContainer.nativeElement;
    const scrollAmount = 300; // Adjust scroll distance

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  loadMoodRecommendations(): void {
    this.isLoadingRecommendations.set(true);
    // Use signal values for mode and includeWatched
    this.recommendationService.getMoodBasedRecommendations(this.moodRecsMode(), 5, this.includeWatched()).subscribe({
      next: (response: any) => {
        // Handle NOT_ENOUGH_DATA threshold error
        if (response.error === 'NOT_ENOUGH_DATA' && response.meta) {
          this.aiThresholdNotMet.set(true);
          this.aiThresholdMeta.set(response.meta);
          this.moodRecommendations.set([]);
          this.isLoadingRecommendations.set(false);
          return;
        }

        // Success case
        this.aiThresholdNotMet.set(false);
        this.aiThresholdMeta.set(null);

        if (response.success && response.data) {
          const recommendations = response.data.map((rec: any) => ({
            ...rec,
            score: Math.round(rec.moodSimilarity)
          }));
          this.moodRecommendations.set(recommendations);
        }
        this.isLoadingRecommendations.set(false);
      },
      error: () => {
        this.isLoadingRecommendations.set(false);
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

  /**
   * Rate a recommendation card (like/dislike)
   * Opens rating dialog first, then submits feedback
   */
  rateCard(rec: MoodRecommendation, action: 'like' | 'dislike'): void {
    // Set default rating based on action
    this.selectedRating.set(action === 'like' ? 8 : 4);
    this.ratingDialogMovie.set(rec);
    this.ratingDialogAction.set(action);
    this.showRatingDialog.set(true);
  }

  /**
   * Confirm rating from dialog - submits feedback and adds to watched list
   */
  onRateRec(rating: number): void {
    const movie = this.ratingDialogMovie();
    const action = this.ratingDialogAction();

    if (!movie) return;

    // Add to rated set for UI feedback
    const newSet = new Set(this.ratedCards());
    newSet.add(movie.tmdbId);
    this.ratedCards.set(newSet);

    // Close dialog
    this.showRatingDialog.set(false);

    // Submit feedback to backend (trains AI)
    this.recommendationService.submitFeedback(movie.tmdbId, movie.title, action).subscribe({
      next: () => {
        console.log(`[Feedback] ${action.toUpperCase()} sent for ${movie.title}`);
      },
      error: (err) => {
        console.error('[Feedback] Error:', err);
      }
    });

    // Add to watched list with rating
    this.watchedListService.addItem({
      tmdbId: movie.tmdbId,
      mediaType: 'movie',
      title: movie.title,
      posterPath: movie.posterPath,
      runtime: 120, // Default runtime, could be fetched
      rating: rating
    }).subscribe({
      next: () => {
        console.log(`[Watched] Added ${movie.title} with rating ${rating}`);
      },
      error: (err) => {
        console.error('[Watched] Error:', err);
      }
    });
  }

  /**
   * Cancel rating dialog
   */
  cancelRating(): void {
    this.showRatingDialog.set(false);
    this.ratingDialogMovie.set(null);
  }

  /**
   * Replace a rated card with a new recommendation (uses quota)
   */
  replaceCard(tmdbIdToReplace: number): void {
    const currentRecs = this.moodRecommendations();
    const excludeIds = currentRecs.map(r => r.tmdbId);

    this.recommendationService.replaceCard(excludeIds).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Replace the card in the array
          const newRecs = currentRecs.map(r =>
            r.tmdbId === tmdbIdToReplace
              ? { ...response.data!, score: Math.round(response.data!.moodSimilarity) }
              : r
          );
          this.moodRecommendations.set(newRecs);

          // Remove from rated set
          const newSet = new Set(this.ratedCards());
          newSet.delete(tmdbIdToReplace);
          this.ratedCards.set(newSet);

          // Update quota
          if (response.remaining !== undefined) {
            this.replacementQuota.set({ remaining: response.remaining, total: 3 });
          }
        } else if (response.error === 'QUOTA_EXCEEDED') {
          console.warn('[Replace] Quota exceeded');
        }
      },
      error: (err) => {
        console.error('[Replace] Error:', err);
      }
    });
  }

  /**
   * Check if a card has been rated
   */
  isCardRated(tmdbId: number): boolean {
    return this.ratedCards().has(tmdbId);
  }

  @ViewChild('recommendationsContainer') recommendationsContainer!: ElementRef<HTMLDivElement>;

  scrollRecommendations(direction: 'left' | 'right'): void {
    if (!this.recommendationsContainer) return;

    const container = this.recommendationsContainer.nativeElement;
    const scrollAmount = 300; // Adjust scroll distance

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  @ViewChild('watchedContainer') watchedContainer!: ElementRef<HTMLDivElement>;

  scrollWatched(direction: 'left' | 'right'): void {
    if (!this.watchedContainer) return;

    const container = this.watchedContainer.nativeElement;
    const scrollAmount = 300;

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  openMoodComparison(): void {
    const profileData = this.profile();
    if (!profileData) return;

    this.showComparisonDialog.set(true);
    this.isLoadingComparison.set(true);
    this.moodComparison.set(null);

    this.moodService.getMoodComparison(profileData.user.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.moodComparison.set(response.data);
        }
        this.isLoadingComparison.set(false);
      },
      error: () => {
        this.isLoadingComparison.set(false);
      }
    });
  }

  openReports(): void {
    this.showReportsDialog.set(true);
  }

  closeComparisonDialog(): void {
    this.showComparisonDialog.set(false);
  }

  openShareDialog(): void {
    this.showShareDialog.set(true);
  }

  closeShareDialog = () => {
    this.showShareDialog.set(false);
  };

  getDimensionLabel(dim: string): string {
    return this.translationService.t(`mood.${dim}`);
  }

  openFollowers(): void {
    const profileData = this.profile();
    if (!profileData) return;

    this.userListType.set('followers');
    this.showUserListDialog.set(true);
    this.isUserListLoading.set(true);
    this.userList.set([]);

    this.userService.getFollowers(profileData.user.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.userList.set(response.data);
        }
        this.isUserListLoading.set(false);
      },
      error: () => {
        this.isUserListLoading.set(false);
      }
    });
  }

  openFollowing(): void {
    const profileData = this.profile();
    if (!profileData) return;

    this.userListType.set('following');
    this.showUserListDialog.set(true);
    this.isUserListLoading.set(true);
    this.userList.set([]);

    this.userService.getFollowing(profileData.user.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.userList.set(response.data);
        }
        this.isUserListLoading.set(false);
      },
      error: () => {
        this.isUserListLoading.set(false);
      }
    });
  }

  closeUserListDialog(): void {
    this.showUserListDialog.set(false);
    this.userList.set([]);
  }

  removeFromList(userId: string): void {
    this.userService.removeFollower(userId).subscribe({
      next: () => {
        // Remove from local list
        this.userList.update(list => list.filter(u => u.id !== userId));
        // Update follower count
        const profileData = this.profile();
        if (profileData) {
          this.profile.set({
            ...profileData,
            user: {
              ...profileData.user,
              followersCount: Math.max(profileData.user.followersCount - 1, 0)
            }
          });
        }
      },
      error: (err) => console.error('Failed to remove follower:', err)
    });
  }

  unfollowFromList(userId: string): void {
    this.userService.unfollowUser(userId).subscribe({
      next: () => {
        // Remove from local list
        this.userList.update(list => list.filter(u => u.id !== userId));
        // Update following count
        const profileData = this.profile();
        if (profileData) {
          this.profile.set({
            ...profileData,
            user: {
              ...profileData.user,
              followingCount: Math.max(profileData.user.followingCount - 1, 0)
            }
          });
        }
      },
      error: (err) => console.error('Failed to unfollow:', err)
    });
  }

  openEditProfile(): void {
    const profile = this.profile();
    if (!profile) return;

    this.editName.set(profile.user.name || '');
    this.editUsername.set(profile.user.username);
    this.editAvatar.set(profile.user.avatar || '');
    this.editBanner.set(profile.user.banner || '');
    this.selectedFile = null;
    this.selectedBannerFile = null;

    // Check if username can be changed
    if (profile.user.canChangeUsernameAt) {
      const canChangeAt = new Date(profile.user.canChangeUsernameAt);
      if (canChangeAt > new Date()) {
        this.canChangeUsername.set(false);
        this.canChangeUsernameAt.set(profile.user.canChangeUsernameAt);
      } else {
        this.canChangeUsername.set(true);
        this.canChangeUsernameAt.set(null);
      }
    } else {
      this.canChangeUsername.set(true);
      this.canChangeUsernameAt.set(null);
    }

    this.showEditProfileDialog.set(true);
  }

  onBannerSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(this.translationService.t('profile.bannerHint'));
        return;
      }
      this.selectedBannerFile = file;

      // Update preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editBanner.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }


  onBannerQuickUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(this.translationService.t('profile.bannerHint'));
        return;
      }

      this.isBannerLoading.set(true);
      const formData = new FormData();
      formData.append('banner', file);

      this.userService.updateProfile(formData).subscribe({
        next: (response) => {
          if (response.success) {
            // Reload profile or update signal
            this.loadCurrentProfile();
          } else {
            alert(response.message || 'Failed to update banner');
          }
          this.isBannerLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to update banner:', err);
          alert(err.error?.message || 'Failed to update banner');
          this.isBannerLoading.set(false);
        }
      });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert(this.translationService.t('profile.avatarHint'));
        return;
      }
      this.selectedFile = file;

      // Update preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editAvatar.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  closeEditProfile(): void {
    this.showEditProfileDialog.set(false);
    this.editName.set('');
    this.editUsername.set('');
    this.editAvatar.set('');
    this.editBanner.set('');
    this.selectedFile = null;
    this.selectedBannerFile = null;
  }

  saveProfile(): void {
    const profile = this.profile();
    if (!profile) return;

    this.isEditLoading.set(true);

    const formData = new FormData();
    let hasChanges = false;

    if (this.editName() !== (profile.user.name || '')) {
      formData.append('name', this.editName());
      hasChanges = true;
    }
    if (this.canChangeUsername() && this.editUsername() !== profile.user.username) {
      formData.append('username', this.editUsername());
      hasChanges = true;
    }
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile);
      hasChanges = true;
    }
    if (this.selectedBannerFile) {
      formData.append('banner', this.selectedBannerFile);
      hasChanges = true;
    }

    if (!hasChanges) {
      this.closeEditProfile();
      this.isEditLoading.set(false);
      return;
    }

    this.userService.updateProfile(formData).subscribe({
      next: (response) => {
        if (response.success) {
          // Simplest is to reload the current profile to get synchronized data
          this.loadCurrentProfile();
          this.closeEditProfile();
        } else {
          alert(response.message);
        }
        this.isEditLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to update profile:', err);
        alert(err.error?.message || 'Failed to update profile');
        this.isEditLoading.set(false);
      }
    });
  }

  openEditFavorites(tab: 'movies' | 'tv' = 'movies'): void {
    this.editFavoritesTab.set(tab);
    this.showEditFavoritesDialog.set(true);
  }

  closeEditFavoritesDialog = () => {
    this.showEditFavoritesDialog.set(false);
  }

  saveFavorites(data: { movies: FavoriteMovie[], tvShows: FavoriteTvShow[] }) {
    this.favoritesService.saveFavorites({
      favoriteMovies: data.movies,
      favoriteTvShows: data.tvShows
    }).subscribe({
      next: (res) => {
        if (res.success) {
          // Update local profile directly to reflect changes immediately
          this.profile.update(p => {
            if (!p) return null;
            return {
              ...p,
              user: {
                ...p.user,
                favoriteMovies: data.movies,
                favoriteTvShows: data.tvShows
              }
            };
          });
          this.closeEditFavoritesDialog();
        } else {
          alert('Failed to save favorites');
        }
      },
      error: (err) => {
        console.error('Failed to save favorites:', err);
        alert('Failed to save favorites');
      }
    });
  }

  openEditList(list: Watchlist): void {
    this.selectedListForEdit.set(list);
    this.showEditListDialog.set(true);
  }

  saveCustomList(data: { items: ListItem[], name?: string, icon?: string }): void {
    const list = this.selectedListForEdit();
    if (!list) return;

    const orderedTmdbIds = data.items.map(item => item.tmdbId);
    this.watchlistService.reorderItems(list._id, orderedTmdbIds, data.name, data.icon).subscribe({
      next: (res) => {
        if (res.success && res.data.watchlist) {
          // Update local state
          this.customWatchlists.update(lists =>
            lists.map(l => l._id === res.data.watchlist._id ? res.data.watchlist : l)
          );
          this.showEditListDialog.set(false);
          this.selectedListForEdit.set(null);
        }
      }
    });
  }

  getEditListItems(list: Watchlist | null): ListItem[] {
    if (!list) return [];
    return list.items.map(item => ({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      posterPath: item.posterPath,
      rating: (item as any).rating
    }));
  }

  // CSV Import handler
  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.name.endsWith('.csv')) {
      console.error('Invalid file type');
      return;
    }

    this.isImporting.set(true);
    this.importResult.set(null);
    this.showFailedItems.set(false);

    this.userService.uploadWatchHistoryCsv(file, this.overwriteExisting()).subscribe({
      next: (response) => {
        console.log('[Import] Response received:', response);
        if (response.success && response.data) {
          console.log('[Import] Setting importResult with estimatedProcessingSeconds:', response.data.estimatedProcessingSeconds);
          this.importResult.set(response.data);
          // Reload watched list to show new items
          this.loadWatchedList();
        }
        this.isImporting.set(false);
      },
      error: (err) => {
        console.error('Import failed:', err);
        this.importResult.set({
          importedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          failedItems: [],
          estimatedProcessingSeconds: 0
        });
        this.isImporting.set(false);
      }
    });

    // Reset input so same file can be selected again
    input.value = '';
  }

  toggleFailedItems(): void {
    this.showFailedItems.set(!this.showFailedItems());
  }
}


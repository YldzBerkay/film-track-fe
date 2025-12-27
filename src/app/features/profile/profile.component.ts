import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject, ViewChild, ElementRef, effect, HostListener } from '@angular/core';
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
import { HeaderComponent } from '../../layout/header/header.component';
import { ShareDialogComponent } from '../../shared/components/share-dialog/share-dialog.component';
import { EditFavoritesDialogComponent } from '../../shared/components/edit-favorites-dialog/edit-favorites-dialog.component';
import { FavoritesService, FavoriteMovie, FavoriteTvShow } from '../../core/services/favorites.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslationService, TranslatePipe } from '../../core/i18n';
import { WatchedListService, WatchedList } from '../../core/services/watched-list.service';
import { WatchlistService, Watchlist } from '../../core/services/watchlist.service';

type TabType = 'profile' | 'watchlist' | 'lists' | 'reviews' | 'likes';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MoodChartComponent, MoodTimelineComponent, HeaderComponent, ShareDialogComponent, EditFavoritesDialogComponent, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
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

  // Edit Favorites Dialog state
  showEditFavoritesDialog = signal(false);
  editFavoritesTab = signal<'movies' | 'tv'>('movies');

  constructor() {
    effect(() => {
      // Reload language-dependent content when language changes
      this.languageService.language();
      this.reloadLanguageDependentContent();
    });
  }

  reloadLanguageDependentContent(): void {
    if (this.isOwnProfile()) {
      this.loadMoodRecommendations();
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
      this.loadMoodTimeline();
      this.loadBadges();
      this.loadMoodRecommendations();
      this.loadLists();
    }
  }

  loadProfile(username: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.userService.getProfile(username).subscribe({
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

    this.userService.getCurrentProfile().subscribe({
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
      queryParamsHandling: 'merge'
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

  loadMood(): void {
    this.isLoadingMood.set(true);
    this.moodService.getUserMood().subscribe({
      next: (response) => {
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

  loadWatchedList(): void {
    this.watchedListService.getWatchedList().subscribe({
      next: (response) => {
        if (response.success && response.data.watchedList) {
          this.watched.set(response.data.watchedList);
        }
      },
      error: (err) => console.error('Failed to load watched list', err)
    });
  }

  loadLists(): void {
    // Load watched list
    this.loadWatchedList();

    // Load default watchlist
    this.watchlistService.getDefaultWatchlist().subscribe({
      next: (response) => {
        if (response.success && response.data.watchlist) {
          this.defaultWatchlist.set(response.data.watchlist);
        }
      },
      error: (err) => console.error('Failed to load default watchlist', err)
    });

    // Load all watchlists to get custom lists
    this.watchlistService.getWatchlists().subscribe({
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

  @ViewChild('badgesContainer') badgesContainer!: ElementRef<HTMLDivElement>;

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
    this.recommendationService.getMoodBasedRecommendations(this.moodRecsMode(), 10, this.includeWatched()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const recommendations = response.data.map(rec => ({
            ...rec,
            score: Math.round(rec.moodSimilarity * 100)
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
    if (!profileData || this.isOwnProfile()) return;

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
}


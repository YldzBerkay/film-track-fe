import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { TMDBService } from '../../core/services/tmdb.service';
import { MoodService, MoodVector } from '../../core/services/mood.service';
import { MoodChartComponent } from '../../shared/components/mood-chart/mood-chart.component';
import { HeaderComponent } from '../../layout/header/header.component';

type TabType = 'profile' | 'watchlist' | 'lists' | 'reviews' | 'likes';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MoodChartComponent, HeaderComponent],
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

  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<TabType>('profile');
  moodData = signal<MoodVector | null>(null);
  isLoadingMood = signal(false);

  // Follow state
  isFollowing = signal(false);
  isFollowLoading = signal(false);

  // Followers/Following dialog state
  showUserListDialog = signal(false);
  userListType = signal<'followers' | 'following'>('followers');
  userList = signal<Array<{ id: string; username: string; nickname: string }>>([]);
  isUserListLoading = signal(false);

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

    // Load mood data if viewing own profile
    if (this.isOwnProfile()) {
      this.loadMood();
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
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
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
}


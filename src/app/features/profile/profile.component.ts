import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, RouterModule, FormsModule, MoodChartComponent, HeaderComponent],
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
  canChangeUsername = signal(true);
  canChangeUsernameAt = signal<string | null>(null);


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
        alert('File size exceeds 2MB limit');
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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        alert('File size exceeds 1MB limit');
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
}


import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService, UserProfile } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { TMDBService } from '../../core/services/tmdb.service';
import { MoodService, MoodVector } from '../../core/services/mood.service';
import { MoodChartComponent } from '../../shared/components/mood-chart/mood-chart.component';

type TabType = 'profile' | 'watchlist' | 'lists' | 'reviews' | 'likes';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MoodChartComponent],
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
}


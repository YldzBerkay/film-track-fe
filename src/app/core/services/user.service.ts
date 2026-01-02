import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubscriptionTier } from '../models/subscription.types';

export interface MoodVector {
  adrenaline: number;
  melancholy: number;
  joy: number;
  tension: number;
  intellect: number;
  romance: number;
  wonder: number;
  nostalgia: number;
  darkness: number;
  inspiration: number;
}

export interface UserProfile {
  user: {
    id: string;
    username: string;
    name?: string;
    avatar: string | null;
    banner: string | null;
    // Private fields - only present on /me endpoint
    email?: string;
    subscription?: {
      tier: SubscriptionTier;
      startedAt: string;
      expiresAt: string | null;
    };
    usernameLastChanged?: string | null;
    canChangeUsernameAt?: string | null;
    // Public fields - always present
    stats: {
      moviesWatched: number;
      episodesWatched: number;
      totalRuntime: number;
      ratingDist?: Record<number, number>;
    };
    followersCount: number;
    followingCount: number;
    favoriteMovies: Array<{
      tmdbId: number;
      title: string;
      posterPath: string;
      releaseDate: string;
    }>;
    favoriteTvShows: Array<{
      tmdbId: number;
      name: string;
      posterPath: string;
      firstAirDate: string;
    }>;
    streak?: {
      current: number;
      lastLoginDate: string | null;
    };
    createdAt: string;
  };
  recentActivities?: Array<{
    _id: string;
    type: string;
    mediaType: string;
    tmdbId: number;
    mediaTitle: string;
    mediaPosterPath: string | null;
    rating?: number;
    createdAt: string;
  }>;
  reviewCount: number;
  mastery?: {
    level: number;
    title: string;
    score: number;
    nextLevelScore: number;
    scoreToNextLevel: number;
    progressPercent: number;
  };
  // Public profiles only
  isFollowedByMe?: boolean;
  isFriend?: boolean;  // true if mutual followers
  privacySettings?: {
    mood: 'public' | 'friends' | 'private';
    library: 'public' | 'friends' | 'private';
    activity: 'public' | 'friends' | 'private';
    stats: 'public' | 'friends' | 'private';
  };
  moodVector?: MoodVector;
  // Private profiles only
  recommendationQuota?: {
    remaining: number;
    total: number;
    lastResetDate: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface UserSearchResults {
  users: Array<{
    id: string;
    username: string;
    name?: string;
    avatar: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
  progress?: number;
  threshold?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = 'http://localhost:3000/api/users';
  private readonly badgeApiUrl = 'http://localhost:3000/api/badges';

  constructor(private http: HttpClient) { }

  getProfile(username: string, lang?: string): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.apiUrl}/${username}`, {
      params: lang ? { lang } : undefined
    });
  }

  getCurrentProfile(lang?: string): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.apiUrl}/profile/me`, {
      params: lang ? { lang } : undefined
    });
  }

  searchUsers(query: string, page: number = 1): Observable<ApiResponse<UserSearchResults>> {
    return this.http.get<ApiResponse<UserSearchResults>>(`${this.apiUrl}/search`, {
      params: { query, page: page.toString() }
    });
  }

  followUser(userId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${userId}/follow`, {});
  }

  unfollowUser(userId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${userId}/follow`);
  }

  getFollowers(userId: string): Observable<ApiResponse<Array<{ id: string; username: string; name: string }>>> {
    return this.http.get<ApiResponse<Array<{ id: string; username: string; name: string }>>>(`${this.apiUrl}/${userId}/followers`);
  }

  getFollowing(userId: string): Observable<ApiResponse<Array<{ id: string; username: string; name: string }>>> {
    return this.http.get<ApiResponse<Array<{ id: string; username: string; name: string }>>>(`${this.apiUrl}/${userId}/following`);
  }

  removeFollower(userId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${userId}/follower`);
  }

  deleteAccount(): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/me`);
  }

  updateProfile(data: FormData): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/profile/me`, data);
  }

  getBadges(showAll: boolean = false, userId?: string): Observable<ApiResponse<Badge[]>> {
    let params = new HttpParams().set('all', showAll.toString());
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.get<ApiResponse<Badge[]>>(this.badgeApiUrl, { params });
  }

  uploadWatchHistoryCsv(file: File, overwriteExisting: boolean = false): Observable<ApiResponse<{
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    failedItems: string[];
    estimatedProcessingSeconds: number;
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwriteExisting', String(overwriteExisting));
    return this.http.post<ApiResponse<{
      importedCount: number;
      skippedCount: number;
      failedCount: number;
      failedItems: string[];
      estimatedProcessingSeconds: number;
    }>>('http://localhost:3000/api/import/watch-history', formData);
  }

  updatePrivacySettings(settings: {
    mood?: 'public' | 'friends' | 'private';
    library?: 'public' | 'friends' | 'private';
    activity?: 'public' | 'friends' | 'private';
    stats?: 'public' | 'friends' | 'private';
  }): Observable<ApiResponse<{ privacySettings: any }>> {
    return this.http.patch<ApiResponse<{ privacySettings: any }>>(`${this.apiUrl}/profile/privacy`, settings);
  }

  /**
   * Get another user's public lists (respects privacy settings)
   */
  getUserPublicLists(userId: string, lang?: string, limit?: number): Observable<ApiResponse<{
    watchedList: {
      list: {
        _id: string;
        userId: string;
        name: string;
        isDefault: boolean;
        privacyStatus: number;
        items: Array<{
          tmdbId: number;
          mediaType: 'movie' | 'tv';
          title: string;
          posterPath?: string;
          runtime: number;
          rating?: number;
          watchedAt: string;
          addedAt: string;
        }>;
        totalRuntime: number;
        createdAt: string;
        updatedAt: string;
      } | null;
      totalCount: number;
    };
    defaultWatchlist: {
      list: {
        _id: string;
        userId: string;
        name: string;
        icon?: string;
        isDefault: boolean;
        privacyStatus: number;
        items: Array<{
          tmdbId: number;
          mediaType: 'movie' | 'tv';
          title: string;
          posterPath?: string;
          addedAt: string;
        }>;
        createdAt: string;
        updatedAt: string;
      } | null;
      totalCount: number;
    };
    customWatchlists: Array<{
      list: {
        _id: string;
        userId: string;
        name: string;
        icon?: string;
        isDefault: boolean;
        privacyStatus: number;
        items: Array<{
          tmdbId: number;
          mediaType: 'movie' | 'tv';
          title: string;
          posterPath?: string;
          addedAt: string;
        }>;
        createdAt: string;
        updatedAt: string;
      };
      totalCount: number;
    }>;
  }>> {
    let params = new HttpParams();
    if (lang) {
      params = params.set('lang', lang);
    }
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<ApiResponse<{
      watchedList: { list: any; totalCount: number };
      defaultWatchlist: { list: any; totalCount: number };
      customWatchlists: Array<{ list: any; totalCount: number }>;
    }>>(`${this.apiUrl}/${userId}/lists`, { params });
  }

  /**
   * Get a specific list for a user with privacy filtering
   */
  getUserListDetail(userId: string, listType: string, lang?: string): Observable<ApiResponse<{
    list: any | null;
    type: 'watched' | 'watchlist' | 'custom';
    ownerUsername: string;
    ownerAvatar: string | null;
    canView: boolean;
    privacyMessage?: string;
  }>> {
    let params = new HttpParams();
    if (lang) {
      params = params.set('lang', lang);
    }
    return this.http.get<ApiResponse<{
      list: any;
      type: 'watched' | 'watchlist' | 'custom';
      ownerUsername: string;
      ownerAvatar: string | null;
      canView: boolean;
      privacyMessage?: string;
    }>>(`${this.apiUrl}/${userId}/lists/${listType}`, { params });
  }
}


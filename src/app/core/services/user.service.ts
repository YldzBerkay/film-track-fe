import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubscriptionTier } from '../models/subscription.types';

export interface UserProfile {
  user: {
    id: string;
    username: string;
    name?: string;
    avatar: string | null;
    banner: string | null;
    email: string;
    subscription: {
      tier: SubscriptionTier;
      startedAt: string;
      expiresAt: string | null;
    };
    stats: {
      moviesWatched: number;
      episodesWatched: number;
      totalRuntime: number;
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
    streak: {
      current: number;
      lastLoginDate: string | null;
    };
    usernameLastChanged: string | null;
    canChangeUsernameAt: string | null;
    createdAt: string;
  };
  recentActivities: Array<{
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
  isFollowedByMe?: boolean;
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

  updateProfile(data: FormData): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/profile/me`, data);
  }

  getBadges(showAll: boolean = false): Observable<ApiResponse<Badge[]>> {
    return this.http.get<ApiResponse<Badge[]>>(this.badgeApiUrl, {
      params: { all: showAll.toString() }
    });
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
}


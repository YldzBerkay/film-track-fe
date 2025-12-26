import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  user: {
    id: string;
    username: string;
    name?: string;
    avatar: string | null;
    banner: string | null;
    email: string;
    stats: {
      moviesWatched: number;
      episodesWatched: number;
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

  getProfile(username: string): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.apiUrl}/${username}`);
  }

  getCurrentProfile(): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.apiUrl}/profile/me`);
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
}


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserProfile {
  user: {
    id: string;
    username: string;
    nickname: string;
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
    nickname: string;
    avatar: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = 'http://localhost:3000/api/users';

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
}


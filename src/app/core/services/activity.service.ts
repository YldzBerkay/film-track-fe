import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Activity {
  _id: string;
  userId: {
    _id: string;
    username: string;
    nickname: string;
  };
  type: 'movie_watched' | 'tv_episode_watched' | 'tv_show_watched' | 'review' | 'rating';
  mediaType: 'movie' | 'tv_show' | 'tv_episode';
  tmdbId: number;
  mediaTitle: string;
  mediaPosterPath: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  rating?: number;
  reviewText?: string;
  isSpoiler: boolean;
  genres?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  activities: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly apiUrl = 'http://localhost:3000/api/activities';

  constructor(private http: HttpClient) {}

  getFeed(
    feedType: 'following' | 'friends' | 'global' = 'following',
    page: number = 1,
    limit: number = 20
  ): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('feedType', feedType)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<FeedResponse>>(`${this.apiUrl}/feed`, { params });
  }

  getUserActivities(page: number = 1, limit: number = 20): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<FeedResponse>>(`${this.apiUrl}/user`, { params });
  }

  createActivity(data: {
    type: 'movie_watched' | 'tv_episode_watched' | 'tv_show_watched' | 'review' | 'rating';
    mediaType: 'movie' | 'tv_show' | 'tv_episode';
    tmdbId: number;
    mediaTitle: string;
    mediaPosterPath?: string | null;
    seasonNumber?: number;
    episodeNumber?: number;
    episodeTitle?: string;
    rating?: number;
    reviewText?: string;
    isSpoiler?: boolean;
    genres?: string[];
  }): Observable<ApiResponse<Activity>> {
    return this.http.post<ApiResponse<Activity>>(`${this.apiUrl}`, data);
  }
}


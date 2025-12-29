import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Activity {
  _id: string;
  userId: {
    _id: string;
    username: string;
    name: string;
    mastery?: {
      score: number;
      level: number;
      title: string;
    };
    avatar?: string;
  };
  type: 'movie_watched' | 'tv_episode_watched' | 'tv_show_watched' | 'review' | 'rating' | 'bulk_import' | 'comment';
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
  isMoodPick?: boolean;
  genres?: string[];
  createdAt: string;
  updatedAt: string;
  likes: string[]; // Array of user IDs
  dislikes: string[];
  likesCount: number;
  dislikesCount: number;
  commentCount: number;
  // Virtual properties for comment activities
  originalActivityType?: 'movie_watched' | 'tv_episode_watched' | 'tv_show_watched' | 'review' | 'rating' | 'bulk_import';
  commentText?: string;
  commentCreatedAt?: string;
  // Reply-specific properties
  parentId?: string;
  parentCommentText?: string;
  replyToUser?: {
    _id: string;
    username: string;
    name: string;
    avatar?: string;
  };
  // For comment activities, reference to the root activity
  activityId?: string | { _id: string };
  // Bookmark status
  isBookmarked?: boolean;
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

  constructor(private http: HttpClient) { }

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

  getUserActivities(page: number = 1, limit: number = 20, filter: string = 'ALL'): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('filter', filter);

    return this.http.get<ApiResponse<FeedResponse>>(`${this.apiUrl}/user`, { params });
  }

  getProfileActivities(userId: string, page: number = 1, limit: number = 20, filter: string = 'ALL'): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('filter', filter);

    // Call /api/users/:userId/activities
    // Note: apiUrl is 'http://localhost:3000/api/activities'
    // We need to construct 'http://localhost:3000/api/users/:userId/activities'
    const baseUrl = this.apiUrl.replace('/activities', '/users');
    return this.http.get<ApiResponse<FeedResponse>>(`${baseUrl}/${userId}/activities`, { params });
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

  likeActivity(activityId: string): Observable<ApiResponse<Activity>> {
    return this.http.post<ApiResponse<Activity>>(`${this.apiUrl}/${activityId}/like`, {});
  }

  unlikeActivity(activityId: string): Observable<ApiResponse<Activity>> {
    return this.http.post<ApiResponse<Activity>>(`${this.apiUrl}/${activityId}/unlike`, {});
  }

  commentOnActivity(activityId: string, text: string): Observable<ApiResponse<Activity>> {
    return this.http.post<ApiResponse<Activity>>(`${this.apiUrl}/${activityId}/comments`, { text });
  }
  getMediaActivities(
    mediaType: 'movie' | 'tv',
    tmdbId: number,
    page: number = 1,
    limit: number = 20
  ): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<FeedResponse>>(`${this.apiUrl}/media/${mediaType}/${tmdbId}`, { params });
  }

  getActivityById(activityId: string): Observable<ApiResponse<Activity>> {
    return this.http.get<ApiResponse<Activity>>(`${this.apiUrl}/${activityId}`);
  }

  toggleBookmark(activityId: string): Observable<ApiResponse<{ bookmarked: boolean }>> {
    return this.http.post<ApiResponse<{ bookmarked: boolean }>>(`${this.apiUrl}/${activityId}/bookmark`, {});
  }

  getSavedActivities(page: number = 1, limit: number = 20): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<FeedResponse>>(`${this.apiUrl}/saved`, { params });
  }

  getUserLikedActivities(userId: string, page: number = 1, limit: number = 20): Observable<ApiResponse<FeedResponse>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<FeedResponse>>(`${this.apiUrl}/user/${userId}/likes`, { params });
  }
}


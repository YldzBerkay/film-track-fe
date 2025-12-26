import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

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

export interface MoodTimelineEntry {
  date: string;
  mood: MoodVector;
  triggerMediaTitle?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface MoodComparison {
  user1Mood: MoodVector;
  user2Mood: MoodVector;
  similarity: number;
  dimensionComparison: Array<{
    dimension: string;
    user1Value: number;
    user2Value: number;
    difference: number;
  }>;
  commonStrengths: string[];
  uniqueStrengths: {
    user1: string[];
    user2: string[];
  };
}

export interface MoodTrend {
  date: string;
  value: number;
}

export interface GenreCorrelation {
  genre: string;
  dominantMoods: Partial<MoodVector>;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class MoodService {
  private readonly apiUrl = 'http://localhost:3000/api/mood';
  private readonly analyticsUrl = 'http://localhost:3000/api/analytics';

  private currentMoodSubject = new BehaviorSubject<MoodVector | null>(null);
  currentMood$ = this.currentMoodSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshMood();
  }

  refreshMood(): void {
    this.getUserMood().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentMoodSubject.next(response.data);
        }
      },
      error: (err) => console.error('Failed to refresh mood:', err)
    });
  }

  getUserMood(forceRecalculate: boolean = false): Observable<ApiResponse<MoodVector>> {
    const params = new HttpParams().set('forceRecalculate', forceRecalculate.toString());
    return this.http.get<ApiResponse<MoodVector>>(`${this.apiUrl}/user`, { params });
  }

  getMoodTimeline(days: number = 30): Observable<ApiResponse<MoodTimelineEntry[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<MoodTimelineEntry[]>>(`${this.apiUrl}/timeline`, { params });
  }

  updateUserMood(): Observable<ApiResponse<MoodVector>> {
    return this.http.post<ApiResponse<MoodVector>>(`${this.apiUrl}/update`, {});
  }

  analyzeMovie(tmdbId: number, title: string, overview?: string): Observable<ApiResponse<MoodVector>> {
    return this.http.post<ApiResponse<MoodVector>>(`${this.apiUrl}/analyze`, {
      tmdbId,
      title,
      overview
    });
  }

  getMoodComparison(targetUserId: string): Observable<ApiResponse<MoodComparison>> {
    return this.http.get<ApiResponse<MoodComparison>>(`${this.apiUrl}/compare/${targetUserId}`);
  }

  getMoodEvolution(days: number = 30): Observable<ApiResponse<Record<keyof MoodVector, MoodTrend[]>>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<Record<keyof MoodVector, MoodTrend[]>>>(`${this.analyticsUrl}/evolution`, { params });
  }

  getDayOfWeekPatterns(): Observable<ApiResponse<Record<string, number[]>>> {
    return this.http.get<ApiResponse<Record<string, number[]>>>(`${this.analyticsUrl}/patterns`);
  }

  getGenreCorrelations(): Observable<ApiResponse<GenreCorrelation[]>> {
    return this.http.get<ApiResponse<GenreCorrelation[]>>(`${this.analyticsUrl}/genre-correlations`);
  }
}


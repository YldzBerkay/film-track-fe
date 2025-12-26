import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MoodVector {
  adrenaline: number;
  melancholy: number;
  joy: number;
  tension: number;
  intellect: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class MoodService {
  private readonly apiUrl = 'http://localhost:3000/api/mood';

  constructor(private http: HttpClient) {}

  getUserMood(forceRecalculate: boolean = false): Observable<ApiResponse<MoodVector>> {
    const params = new HttpParams().set('forceRecalculate', forceRecalculate.toString());
    return this.http.get<ApiResponse<MoodVector>>(`${this.apiUrl}/user`, { params });
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
}


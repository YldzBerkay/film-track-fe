import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MealtimeRecommendation {
    showTitle: string;
    showPoster: string;
    episodeTitle: string;
    seasonNumber: number;
    episodeNumber: number;
    runtime: number;
    overview: string;
    stillPath: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface DailyPick {
    tmdbId: number;
    title: string;
    year: number;
    genre: string;
    backdropUrl: string;
    overview: string;
}

@Injectable({
    providedIn: 'root'
})
export class RecommendationService {
    private readonly apiUrl = 'http://localhost:3000/api/recommendations';

    constructor(private http: HttpClient) { }

    getMealtimePick(): Observable<ApiResponse<MealtimeRecommendation>> {
        return this.http.get<ApiResponse<MealtimeRecommendation>>(`${this.apiUrl}/mealtime`);
    }

    getDailyPick(): Observable<ApiResponse<DailyPick>> {
        return this.http.get<ApiResponse<DailyPick>>(`${this.apiUrl}/daily`);
    }
}

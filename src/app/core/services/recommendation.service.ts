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

export interface FriendMealtimeRecommendation extends MealtimeRecommendation {
    sharedWith: string[];
}

export interface Friend {
    id: string;
    username: string;
    name: string;
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
    watched: boolean;
}

export interface MemoryVerificationResult {
    watched: boolean;
    confidence: number;
    reasoning: string;
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

    getFriends(): Observable<ApiResponse<Friend[]>> {
        return this.http.get<ApiResponse<Friend[]>>(`${this.apiUrl}/friends`);
    }

    getFriendMealtimePick(friendIds: string[]): Observable<ApiResponse<FriendMealtimeRecommendation>> {
        return this.http.post<ApiResponse<FriendMealtimeRecommendation>>(`${this.apiUrl}/mealtime/friends`, {
            friendIds
        });
    }

    verifyMemory(filmTitle: string, filmOverview: string, userMemory: string): Observable<ApiResponse<MemoryVerificationResult>> {
        return this.http.post<ApiResponse<MemoryVerificationResult>>('http://localhost:3000/api/ai/verify-memory', {
            filmTitle,
            filmOverview,
            userMemory
        });
    }
}

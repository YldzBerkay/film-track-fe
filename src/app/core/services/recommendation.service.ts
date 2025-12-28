import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LanguageService } from './language.service';

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
    runtime: number;
    backdropUrl: string;
    overview: string;
    watched: boolean;
}

export interface MemoryVerificationResult {
    watched: boolean;
    confidence: number;
    reasoning: string;
}

export interface MoodVector {
    adrenaline: number;
    melancholy: number;
    joy: number;
    tension: number;
    intellect: number;
}

export interface MoodRecommendation {
    tmdbId: number;
    title: string;
    posterPath: string;
    backdropPath: string;
    overview: string;
    releaseDate: string;
    moodVector: MoodVector;
    moodSimilarity: number;
    moodMatchType: 'match' | 'shift';
    score?: number;
}

@Injectable({
    providedIn: 'root'
})
export class RecommendationService {
    private readonly apiUrl = 'http://localhost:3000/api/recommendations';
    private http = inject(HttpClient);
    private languageService = inject(LanguageService);

    private getParams(additionalParams?: Record<string, string>): HttpParams {
        let params = new HttpParams().set('lang', this.languageService.langCode());
        if (additionalParams) {
            Object.entries(additionalParams).forEach(([key, value]) => {
                params = params.set(key, value);
            });
        }
        return params;
    }

    getMealtimePick(): Observable<ApiResponse<MealtimeRecommendation>> {
        const params = this.getParams();
        return this.http.get<ApiResponse<MealtimeRecommendation>>(`${this.apiUrl}/mealtime`, { params });
    }

    getDailyPick(): Observable<ApiResponse<DailyPick>> {
        const params = this.getParams();
        return this.http.get<ApiResponse<DailyPick>>(`${this.apiUrl}/daily`, { params });
    }

    getFriends(): Observable<ApiResponse<Friend[]>> {
        return this.http.get<ApiResponse<Friend[]>>(`${this.apiUrl}/friends`);
    }

    getFriendMealtimePick(friendIds: string[]): Observable<ApiResponse<FriendMealtimeRecommendation>> {
        const params = this.getParams();
        return this.http.post<ApiResponse<FriendMealtimeRecommendation>>(`${this.apiUrl}/mealtime/friends`, {
            friendIds
        }, { params });
    }

    verifyMemory(filmTitle: string, filmOverview: string, userMemory: string): Observable<ApiResponse<MemoryVerificationResult>> {
        return this.http.post<ApiResponse<MemoryVerificationResult>>('http://localhost:3000/api/ai/verify-memory', {
            filmTitle,
            filmOverview,
            userMemory
        });
    }

    getMoodBasedRecommendations(
        mode: 'match' | 'shift' = 'match',
        limit: number = 5,
        includeWatched: boolean = false,
        forceRefresh: boolean = false
    ): Observable<ApiResponse<MoodRecommendation[]>> {
        const params = this.getParams({
            mode,
            limit: limit.toString(),
            includeWatched: includeWatched.toString(),
            forceRefresh: forceRefresh.toString()
        });
        return this.http.get<ApiResponse<MoodRecommendation[]>>(`${this.apiUrl}/mood-based`, { params });
    }

    /**
     * Submit feedback (like/dislike) on a recommendation
     * This trains the AI to better match user preferences
     */
    submitFeedback(tmdbId: number, title: string, action: 'like' | 'dislike'): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/feedback`, {
            tmdbId,
            title,
            action
        });
    }

    /**
     * Get a single replacement recommendation (uses monthly quota)
     */
    replaceCard(excludeIds: number[]): Observable<{ success: boolean; data?: MoodRecommendation; error?: string; remaining?: number }> {
        const params = this.getParams({
            excludeIds: excludeIds.join(',')
        });
        return this.http.get<{ success: boolean; data?: MoodRecommendation; error?: string; remaining?: number }>(
            `${this.apiUrl}/replace`,
            { params }
        );
    }

    /**
     * Get user's current replacement quota
     */
    getQuota(): Observable<ApiResponse<{ remaining: number; total: number }>> {
        return this.http.get<ApiResponse<{ remaining: number; total: number }>>(`${this.apiUrl}/quota`);
    }
}

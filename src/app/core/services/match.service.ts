import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Archetype {
    name: string;
    displayName: string;
    emoji: string;
}

export interface TasteMatchResult {
    matchScore: number;
    verdict: string;
    sharedFavorites: string[];
    theirArchetype: Archetype;
    yourArchetype: Archetype;
    breakdown: {
        moodSimilarity: number;
        ratingAgreement: number | null;
        sharedMoviesCount: number;
    };
    radarData?: {
        user: number[];
        target: number[];
    };
    commonStrengths?: string[];
    recommendedMovie?: {
        id: number;
        title: string;
        posterPath: string;
        backdropPath?: string;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class MatchService {
    private readonly apiUrl = 'http://localhost:3000/api/match';

    constructor(private http: HttpClient) { }

    /**
     * Get taste match compatibility with another user
     */
    getTasteMatch(targetUserId: string): Observable<ApiResponse<TasteMatchResult>> {
        return this.http.get<ApiResponse<TasteMatchResult>>(`${this.apiUrl}/${targetUserId}`);
    }
}

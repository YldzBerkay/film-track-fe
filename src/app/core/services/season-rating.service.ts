import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SeasonRatingResponse {
    success: boolean;
    data: {
        tvId?: number;
        seasonNumber?: number;
        rating: number | null;
    };
}

export interface ShowSeasonRatingsResponse {
    success: boolean;
    data: {
        ratings: Record<number, number>;
    };
}

export interface SeasonStatsResponse {
    success: boolean;
    data: {
        count: number;
        averageRating: number;
    };
}

export interface ShowSeasonStatsResponse {
    success: boolean;
    data: {
        stats: Record<number, { count: number; averageRating: number }>;
    };
}

@Injectable({
    providedIn: 'root'
})
export class SeasonRatingService {
    private readonly apiUrl = 'http://localhost:3000/api/seasons';
    private http = inject(HttpClient);

    rateSeason(tvId: number, seasonNumber: number, rating: number): Observable<SeasonRatingResponse> {
        return this.http.post<SeasonRatingResponse>(`${this.apiUrl}/rate`, {
            tvId,
            seasonNumber,
            rating
        });
    }

    getUserRating(tvId: number, seasonNumber: number): Observable<SeasonRatingResponse> {
        return this.http.get<SeasonRatingResponse>(
            `${this.apiUrl}/rating/${tvId}/${seasonNumber}`
        );
    }

    getUserRatingsForShow(tvId: number): Observable<ShowSeasonRatingsResponse> {
        return this.http.get<ShowSeasonRatingsResponse>(
            `${this.apiUrl}/ratings/${tvId}`
        );
    }

    getPublicStats(tvId: number, seasonNumber: number): Observable<SeasonStatsResponse> {
        return this.http.get<SeasonStatsResponse>(
            `${this.apiUrl}/stats/${tvId}/${seasonNumber}`
        );
    }

    getShowPublicStats(tvId: number): Observable<ShowSeasonStatsResponse> {
        return this.http.get<ShowSeasonStatsResponse>(
            `${this.apiUrl}/show-stats/${tvId}`
        );
    }

    removeRating(tvId: number, seasonNumber: number): Observable<{ success: boolean; data: { removed: boolean } }> {
        return this.http.delete<{ success: boolean; data: { removed: boolean } }>(
            `${this.apiUrl}/rating/${tvId}/${seasonNumber}`
        );
    }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EpisodeRatingResponse {
    success: boolean;
    data: {
        tvId?: number;
        seasonNumber?: number;
        episodeNumber?: number;
        rating: number | null;
    };
}

export interface SeasonEpisodeRatingsResponse {
    success: boolean;
    data: {
        ratings: Record<number, number>;
    };
}

export interface EpisodeStatsResponse {
    success: boolean;
    data: {
        count: number;
        averageRating: number;
    };
}

export interface SeasonEpisodeStatsResponse {
    success: boolean;
    data: {
        stats: Record<number, { count: number; averageRating: number }>;
    };
}

@Injectable({
    providedIn: 'root'
})
export class EpisodeRatingService {
    private readonly apiUrl = 'http://localhost:3000/api/episodes';
    private http = inject(HttpClient);

    rateEpisode(tvId: number, seasonNumber: number, episodeNumber: number, rating: number): Observable<EpisodeRatingResponse> {
        return this.http.post<EpisodeRatingResponse>(`${this.apiUrl}/rate`, {
            tvId,
            seasonNumber,
            episodeNumber,
            rating
        });
    }

    getUserRating(tvId: number, seasonNumber: number, episodeNumber: number): Observable<EpisodeRatingResponse> {
        return this.http.get<EpisodeRatingResponse>(
            `${this.apiUrl}/rating/${tvId}/${seasonNumber}/${episodeNumber}`
        );
    }

    getUserRatingsForSeason(tvId: number, seasonNumber: number): Observable<SeasonEpisodeRatingsResponse> {
        return this.http.get<SeasonEpisodeRatingsResponse>(
            `${this.apiUrl}/ratings/${tvId}/${seasonNumber}`
        );
    }

    getPublicStats(tvId: number, seasonNumber: number, episodeNumber: number): Observable<EpisodeStatsResponse> {
        return this.http.get<EpisodeStatsResponse>(
            `${this.apiUrl}/stats/${tvId}/${seasonNumber}/${episodeNumber}`
        );
    }

    getSeasonPublicStats(tvId: number, seasonNumber: number): Observable<SeasonEpisodeStatsResponse> {
        return this.http.get<SeasonEpisodeStatsResponse>(
            `${this.apiUrl}/season-stats/${tvId}/${seasonNumber}`
        );
    }

    removeRating(tvId: number, seasonNumber: number, episodeNumber: number): Observable<{ success: boolean; data: { removed: boolean } }> {
        return this.http.delete<{ success: boolean; data: { removed: boolean } }>(
            `${this.apiUrl}/rating/${tvId}/${seasonNumber}/${episodeNumber}`
        );
    }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WatchedItem {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    runtime: number;
    numberOfEpisodes?: number;
    numberOfSeasons?: number;
    rating?: number;
    watchedAt: string;
    addedAt: string;
}

export interface WatchedList {
    _id: string;
    userId: string;
    name: string;
    isDefault: boolean;
    privacyStatus: number; // 0=everyone, 1=friends, 2=nobody
    items: WatchedItem[];
    totalRuntime: number;
    createdAt: string;
    updatedAt: string;
}

export interface WatchedListResponse {
    success: boolean;
    data: {
        watchedList: WatchedList;
    };
}

export interface CheckWatchedResponse {
    success: boolean;
    data: {
        isWatched: boolean;
        rating?: number;
    };
}

export interface WatchedStatsResponse {
    success: boolean;
    data: {
        stats: {
            totalRuntime: number;
            totalMovies: number;
            totalTvShows: number;
            averageRating: number | null;
        };
    };
}

export interface PublicStatsResponse {
    success: boolean;
    data: {
        count: number;
        averageRating: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class WatchedListService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/watched';

    /**
     * Get user's watched list
     */
    getWatchedList(): Observable<WatchedListResponse> {
        return this.http.get<WatchedListResponse>(this.apiUrl);
    }

    /**
     * Add an item to the watched list
     */
    addItem(item: {
        tmdbId: number;
        mediaType: 'movie' | 'tv';
        title: string;
        posterPath?: string;
        runtime: number;
        numberOfEpisodes?: number;
        numberOfSeasons?: number;
        rating?: number;
        watchedAt?: string;
    }): Observable<WatchedListResponse> {
        return this.http.post<WatchedListResponse>(`${this.apiUrl}/items`, item);
    }

    /**
     * Update item rating
     */
    updateRating(
        tmdbId: number,
        mediaType: 'movie' | 'tv',
        rating: number
    ): Observable<WatchedListResponse> {
        return this.http.patch<WatchedListResponse>(
            `${this.apiUrl}/items/${tmdbId}/rating`,
            { mediaType, rating }
        );
    }

    /**
     * Remove an item from the watched list
     */
    removeItem(
        tmdbId: number,
        mediaType: 'movie' | 'tv'
    ): Observable<WatchedListResponse> {
        return this.http.delete<WatchedListResponse>(
            `${this.apiUrl}/items/${tmdbId}?mediaType=${mediaType}`
        );
    }

    /**
     * Check if an item is watched
     */
    checkItem(
        tmdbId: number,
        mediaType: 'movie' | 'tv'
    ): Observable<CheckWatchedResponse> {
        return this.http.get<CheckWatchedResponse>(
            `${this.apiUrl}/check/${tmdbId}?mediaType=${mediaType}`
        );
    }

    /**
     * Get watch statistics
     */
    getStats(): Observable<WatchedStatsResponse> {
        return this.http.get<WatchedStatsResponse>(`${this.apiUrl}/stats`);
    }

    /**
     * Format runtime as hours and minutes
     */
    formatRuntime(minutes: number): string {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    /**
     * Update the privacy status of the watched list
     */
    updatePrivacy(privacyStatus: number): Observable<WatchedListResponse> {
        return this.http.patch<WatchedListResponse>(
            `${this.apiUrl}/privacy`,
            { privacyStatus }
        );
    }

    reorderItems(orderedTmdbIds: number[]): Observable<WatchedListResponse> {
        return this.http.patch<WatchedListResponse>(
            `${this.apiUrl}/reorder`,
            { orderedTmdbIds }
        );
    }

    /**
     * Get public aggregated rating stats
     */
    getPublicStats(tmdbId: number, mediaType: 'movie' | 'tv'): Observable<PublicStatsResponse> {
        return this.http.get<PublicStatsResponse>(`${this.apiUrl}/public/stats/${mediaType}/${tmdbId}`);
    }
}

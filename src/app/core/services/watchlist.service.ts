import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LanguageService } from './language.service';
import { WatchedList } from './watched-list.service';

export interface WatchlistItem {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    numberOfEpisodes?: number;
    numberOfSeasons?: number;
    addedAt: string;
}

export interface Watchlist {
    _id: string;
    userId: string;
    name: string;
    icon?: string;
    isDefault: boolean;
    privacyStatus: number;  // 0=everyone, 1=friends, 2=nobody
    items: WatchlistItem[];
    createdAt: string;
    updatedAt: string;
    totalCount?: number;
}

export interface WatchlistsResponse {
    success: boolean;
    data: {
        watchlists: Watchlist[];
    };
}

export interface WatchlistResponse {
    success: boolean;
    data: {
        watchlist: Watchlist;
        totalCount?: number;
    };
}

export interface DashboardListSummary {
    _id: string;
    name: string;
    itemCount: number;
    icon?: string;
    isDefault?: boolean;
}

export interface DashboardSummaryResponse {
    success: boolean;
    data: {
        watchedList: DashboardListSummary | null;
        defaultWatchlist: DashboardListSummary | null;
        customList: DashboardListSummary | null;
    };
}

export interface CheckWatchlistResponse {
    success: boolean;
    data: {
        inWatchlist: boolean;
        watchlistId?: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class WatchlistService {
    private http = inject(HttpClient);
    private languageService = inject(LanguageService);
    private apiUrl = 'http://localhost:3000/api/watchlists';

    /**
     * Get dashboard summary of lists
     */
    getDashboardSummary(): Observable<DashboardSummaryResponse> {
        return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/dashboard-summary`);
    }

    /**
     * Get all watchlists for the current user
     */
    getWatchlists(limit?: number): Observable<WatchlistsResponse> {
        let params = new HttpParams().set('lang', this.languageService.langCode());
        if (limit) {
            params = params.set('limit', limit.toString());
        }
        return this.http.get<WatchlistsResponse>(this.apiUrl, { params });
    }

    /**
     * Create a custom watchlist
     */
    createCustomList(name: string, icon: string = 'list'): Observable<WatchlistResponse> {
        return this.http.post<WatchlistResponse>(this.apiUrl, { name, icon });
    }

    /**
     * Get the user's default watchlist
     */
    getDefaultWatchlist(limit?: number): Observable<WatchlistResponse> {
        let params = new HttpParams().set('lang', this.languageService.langCode());
        if (limit) {
            params = params.set('limit', limit.toString());
        }
        return this.http.get<WatchlistResponse>(`${this.apiUrl}/default`, { params });
    }

    /**
     * Get a specific watchlist by ID
     */
    getWatchlist(id: string, limit?: number): Observable<WatchlistResponse> {
        let params = new HttpParams().set('lang', this.languageService.langCode());
        if (limit) {
            params = params.set('limit', limit.toString());
        }
        return this.http.get<WatchlistResponse>(`${this.apiUrl}/${id}`, { params });
    }

    /**
     * Add an item to a watchlist
     */
    addItem(
        watchlistId: string,
        item: {
            tmdbId: number;
            mediaType: 'movie' | 'tv';
            title: string;
            posterPath?: string;
            numberOfEpisodes?: number;
            numberOfSeasons?: number;
        }
    ): Observable<WatchlistResponse> {
        return this.http.post<WatchlistResponse>(
            `${this.apiUrl}/${watchlistId}/items`,
            item
        );
    }

    /**
     * Remove an item from a watchlist
     */
    removeItem(
        watchlistId: string,
        tmdbId: number,
        mediaType: 'movie' | 'tv'
    ): Observable<WatchlistResponse> {
        return this.http.delete<WatchlistResponse>(
            `${this.apiUrl}/${watchlistId}/items/${tmdbId}?mediaType=${mediaType}`
        );
    }

    /**
     * Check if an item is in any watchlist
     */
    checkItem(
        tmdbId: number,
        mediaType: 'movie' | 'tv'
    ): Observable<CheckWatchlistResponse> {
        return this.http.get<CheckWatchlistResponse>(
            `${this.apiUrl}/check/${tmdbId}?mediaType=${mediaType}`
        );
    }

    /**
     * Update privacy status of a watchlist
     */
    updatePrivacy(watchlistId: string, privacyStatus: number): Observable<WatchlistResponse> {
        return this.http.patch<WatchlistResponse>(
            `${this.apiUrl}/${watchlistId}/privacy`,
            { privacyStatus }
        );
    }

    reorderItems(watchlistId: string, orderedTmdbIds?: number[], name?: string, icon?: string): Observable<WatchlistResponse> {
        return this.http.patch<WatchlistResponse>(
            `${this.apiUrl}/${watchlistId}/reorder`,
            { orderedTmdbIds, name, icon }
        );
    }
}

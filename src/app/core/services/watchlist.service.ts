import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WatchlistItem {
    tmdbId: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    addedAt: string;
}

export interface Watchlist {
    _id: string;
    userId: string;
    name: string;
    icon?: string;
    isDefault: boolean;
    items: WatchlistItem[];
    createdAt: string;
    updatedAt: string;
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
    private apiUrl = 'http://localhost:3000/api/watchlists';

    /**
     * Get all watchlists for the current user
     */
    getWatchlists(): Observable<WatchlistsResponse> {
        return this.http.get<WatchlistsResponse>(this.apiUrl);
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
    getDefaultWatchlist(): Observable<WatchlistResponse> {
        return this.http.get<WatchlistResponse>(`${this.apiUrl}/default`);
    }

    /**
     * Get a specific watchlist by ID
     */
    getWatchlist(id: string): Observable<WatchlistResponse> {
        return this.http.get<WatchlistResponse>(`${this.apiUrl}/${id}`);
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
}

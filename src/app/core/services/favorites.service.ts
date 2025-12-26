import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FavoriteMovie {
  tmdbId: number;
  title: string;
  posterPath: string;
  releaseDate: string;
}

export interface FavoriteTvShow {
  tmdbId: number;
  name: string;
  posterPath: string;
  firstAirDate: string;
}

export interface SaveFavoritesRequest {
  favoriteMovies: FavoriteMovie[];
  favoriteTvShows: FavoriteTvShow[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly apiUrl = 'http://localhost:3000/api/favorites';

  constructor(private http: HttpClient) {}

  saveFavorites(data: SaveFavoritesRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}`, data);
  }

  getFavorites(): Observable<ApiResponse<{
    favoriteMovies: FavoriteMovie[];
    favoriteTvShows: FavoriteTvShow[];
    onboardingCompleted: boolean;
  }>> {
    return this.http.get<ApiResponse<{
      favoriteMovies: FavoriteMovie[];
      favoriteTvShows: FavoriteTvShow[];
      onboardingCompleted: boolean;
    }>>(`${this.apiUrl}`);
  }
}


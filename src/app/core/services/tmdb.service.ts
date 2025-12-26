import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TMDBMovie {
  id: number;
  title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  backdrop_path: string | null;
}

export interface TMDBTvShow {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  overview: string;
  backdrop_path: string | null;
}

export interface TMDBSearchResponse<T> {
  results: T[];
  total_results: number;
  total_pages: number;
  page: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  runtime?: number;
  budget?: number;
  revenue?: number;
  status?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path: string | null;
  }>;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      profile_path: string | null;
    }>;
  };
  videos?: {
    results: Array<{
      key: string;
      name: string;
      site: string;
      type: string;
    }>;
  };
  similar?: {
    results: TMDBMovie[];
  };
}

export interface TMDBTvShowDetails extends TMDBTvShow {
  number_of_seasons: number;
  number_of_episodes: number;
  status?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path: string | null;
  }>;
  seasons: Array<{
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    poster_path: string | null;
    air_date: string;
  }>;
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      profile_path: string | null;
    }>;
  };
}

export interface TMDBSeasonDetails {
  id: number;
  name: string;
  season_number: number;
  air_date: string;
  episodes: Array<{
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string;
    vote_average: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class TMDBService {
  private readonly apiUrl = 'http://localhost:3000/api/tmdb';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p';

  constructor(private http: HttpClient) {}

  searchMovies(query: string, page: number = 1): Observable<ApiResponse<TMDBSearchResponse<TMDBMovie>>> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString());

    return this.http.get<ApiResponse<TMDBSearchResponse<TMDBMovie>>>(`${this.apiUrl}/movies/search`, { params });
  }

  searchTvShows(query: string, page: number = 1): Observable<ApiResponse<TMDBSearchResponse<TMDBTvShow>>> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString());

    return this.http.get<ApiResponse<TMDBSearchResponse<TMDBTvShow>>>(`${this.apiUrl}/tv/search`, { params });
  }

  getPopularMovies(page: number = 1): Observable<ApiResponse<TMDBSearchResponse<TMDBMovie>>> {
    const params = new HttpParams().set('page', page.toString());
    return this.http.get<ApiResponse<TMDBSearchResponse<TMDBMovie>>>(`${this.apiUrl}/movies/popular`, { params });
  }

  getPopularTvShows(page: number = 1): Observable<ApiResponse<TMDBSearchResponse<TMDBTvShow>>> {
    const params = new HttpParams().set('page', page.toString());
    return this.http.get<ApiResponse<TMDBSearchResponse<TMDBTvShow>>>(`${this.apiUrl}/tv/popular`, { params });
  }

  getPosterUrl(posterPath: string | null, size: string = 'w500'): string {
    if (!posterPath) {
      return 'https://via.placeholder.com/500x750?text=No+Image';
    }
    return `${this.imageBaseUrl}/${size}${posterPath}`;
  }

  getBackdropUrl(backdropPath: string | null, size: string = 'original'): string {
    if (!backdropPath) {
      return 'https://via.placeholder.com/1920x1080?text=No+Image';
    }
    return `${this.imageBaseUrl}/${size}${backdropPath}`;
  }

  getMovieDetails(tmdbId: string): Observable<ApiResponse<TMDBMovieDetails>> {
    return this.http.get<ApiResponse<TMDBMovieDetails>>(`${this.apiUrl}/movies/${tmdbId}`);
  }

  getShowDetails(tmdbId: string): Observable<ApiResponse<TMDBTvShowDetails>> {
    return this.http.get<ApiResponse<TMDBTvShowDetails>>(`${this.apiUrl}/tv/${tmdbId}`);
  }

  getSeasonDetails(tvId: string, seasonNumber: number): Observable<ApiResponse<TMDBSeasonDetails>> {
    return this.http.get<ApiResponse<TMDBSeasonDetails>>(
      `${this.apiUrl}/tv/${tvId}/season/${seasonNumber}`
    );
  }
}


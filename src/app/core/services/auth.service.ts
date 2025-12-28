import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, finalize, switchMap, throwError, map } from 'rxjs';
import { Router } from '@angular/router';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    name?: string;
    avatar?: string;
    banner?: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface User {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  banner?: string;
  email: string;
  onboardingCompleted?: boolean;
  streak?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api';
  private readonly accessTokenKey = 'cinetrack_access_token';
  private readonly refreshTokenKey = 'cinetrack_refresh_token';
  private readonly userKey = 'cinetrack_user';

  private currentUser = signal<User | null>(null);
  private accessToken = signal<string | null>(null);
  private refreshToken = signal<string | null>(null);
  private isRefreshing = signal(false);

  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly user = computed(() => this.currentUser());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredAuth();
  }

  register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/register`, data)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setAuth(response.data);
          }
        })
      );
  }

  login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/login`, data)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.setAuth(response.data);
          }
        })
      );
  }

  changePassword(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/change-password`, data);
  }

  logout(): void {
    const refreshTokenValue = this.refreshToken();

    // Revoke refresh token on backend
    if (refreshTokenValue) {
      this.http
        .post(`${this.apiUrl}/auth/logout`, { refreshToken: refreshTokenValue })
        .subscribe({
          error: () => {
            // Continue with logout even if API call fails
          }
        });
    }

    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    return this.refreshToken();
  }

  private refreshRequest$: Observable<string | null> | null = null;

  refreshAccessToken(): Observable<string | null> {
    // If a refresh request is already in progress, return the existing observable
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const refreshTokenValue = this.refreshToken();
    if (!refreshTokenValue) {
      this.logout();
      return new Observable<string | null>((observer) => {
        observer.next(null);
        observer.complete();
      });
    }

    this.isRefreshing.set(true);

    this.refreshRequest$ = this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/refresh`, {
        refreshToken: refreshTokenValue
      })
      .pipe(
        switchMap((response) => {
          if (response.success && response.data) {
            this.setAuth(response.data);
            return new Observable<string>((observer) => {
              observer.next(response.data.accessToken);
              observer.complete();
            });
          }
          this.logout();
          return new Observable<string | null>((observer) => {
            observer.next(null);
            observer.complete();
          });
        }),
        catchError((error) => {
          this.logout();
          return throwError(() => error);
        }),
        finalize(() => {
          this.isRefreshing.set(false);
          this.refreshRequest$ = null;
        })
      );

    return this.refreshRequest$;
  }

  checkAuth(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return new Observable<boolean>(obs => {
        obs.next(true);
        obs.complete();
      });
    }

    if (this.refreshToken() || this.isRefreshing()) {
      return this.refreshAccessToken().pipe(
        map(token => !!token),
        catchError(() => {
          return new Observable<boolean>(obs => {
            obs.next(false);
            obs.complete();
          });
        })
      );
    }

    return new Observable<boolean>(obs => {
      obs.next(false);
      obs.complete();
    });
  }

  updateUser(partialUser: Partial<User>): void {
    const current = this.currentUser();
    if (current) {
      const updated = { ...current, ...partialUser };
      this.currentUser.set(updated);
      localStorage.setItem(this.userKey, JSON.stringify(updated));
    }
  }

  isTokenExpired(token: string | null): boolean {
    if (!token) {
      return true;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      // Consider token expired if it expires in less than 1 minute
      return exp - now < 60000;
    } catch {
      return true;
    }
  }

  private setAuth(authData: AuthResponse): void {
    this.accessToken.set(authData.accessToken);
    this.refreshToken.set(authData.refreshToken);
    this.currentUser.set(authData.user);
    localStorage.setItem(this.accessTokenKey, authData.accessToken);
    localStorage.setItem(this.refreshTokenKey, authData.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(authData.user));
  }

  private loadStoredAuth(): void {
    const storedAccessToken = localStorage.getItem(this.accessTokenKey);
    const storedRefreshToken = localStorage.getItem(this.refreshTokenKey);
    const storedUser = localStorage.getItem(this.userKey);

    if (storedAccessToken && storedRefreshToken && storedUser) {
      try {
        // Check if access token is expired
        if (this.isTokenExpired(storedAccessToken)) {
          // Try to refresh token
          this.refreshToken.set(storedRefreshToken);
          this.currentUser.set(JSON.parse(storedUser));
          this.refreshAccessToken().subscribe({
            error: () => {
              // Refresh failed, logout will be handled by interceptor
            }
          });
        } else {
          this.accessToken.set(storedAccessToken);
          this.refreshToken.set(storedRefreshToken);
          this.currentUser.set(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        this.logout();
      }
    }
  }
}


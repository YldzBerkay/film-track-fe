import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Skip auth for login/register/refresh endpoints
  const skipAuth = req.url.includes('/auth/login') || 
                   req.url.includes('/auth/register') ||
                   req.url.includes('/auth/refresh');

  // Get access token
  const accessToken = authService.getAccessToken();

  // Check if token is expired and refresh if needed
  if (!skipAuth && accessToken && authService.isTokenExpired(accessToken)) {
    // Token is expired, try to refresh
    return authService.refreshAccessToken().pipe(
      switchMap((newToken) => {
        if (newToken) {
          // Retry request with new token
          const clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`
            }
          });
          return next(clonedReq);
        } else {
          // Refresh failed, logout
          authService.logout();
          return throwError(() => new Error('Authentication failed'));
        }
      }),
      catchError((error) => {
        authService.logout();
        return throwError(() => error);
      })
    );
  }

  // Add authorization header if token exists
  let clonedReq = req;
  if (!skipAuth && accessToken) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  }

  // Handle 401 errors (unauthorized)
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !skipAuth) {
        // Try to refresh token
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          return authService.refreshAccessToken().pipe(
            switchMap((newToken) => {
              if (newToken) {
                // Retry original request with new token
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(retryReq);
              } else {
                authService.logout();
                return throwError(() => new Error('Authentication failed'));
              }
            }),
            catchError((err) => {
              authService.logout();
              return throwError(() => err);
            })
          );
        } else {
          authService.logout();
        }
      }
      return throwError(() => error);
    })
  );
};


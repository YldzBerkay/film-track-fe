import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    map((isAuthenticated: boolean) => {
      if (isAuthenticated) {
        return true;
      }
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    })
  );
};


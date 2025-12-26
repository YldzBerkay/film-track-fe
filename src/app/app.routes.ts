import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/landing/landing.component').then((m) => m.LandingComponent)
  },
  {
    path: 'features',
    loadComponent: () =>
      import('./layout/features/features.component').then((m) => m.FeaturesComponent)
  },
  {
    path: 'community',
    loadComponent: () =>
      import('./layout/community/community.component').then((m) => m.CommunityComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/favorites-selection/favorites-selection.component').then(
        (m) => m.FavoritesSelectionComponent
      ),
    canActivate: [authGuard]
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'movies/:id',
    loadComponent: () =>
      import('./features/movies/movie-detail/movie-detail.component').then(
        (m) => m.MovieDetailComponent
      )
  },
  {
    path: 'tv/:id',
    loadComponent: () =>
      import('./features/tv-shows/tv-show-detail/tv-show-detail.component').then(
        (m) => m.TvShowDetailComponent
      )
  },
  {
    path: 'profile/:username',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent)
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent)
  }
];

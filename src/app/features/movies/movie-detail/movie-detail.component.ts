import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TMDBService, TMDBMovieDetails } from '../../../core/services/tmdb.service';
import { ActivityService } from '../../../core/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  tmdbService = inject(TMDBService);
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private location = inject(Location);

  movie = signal<TMDBMovieDetails | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isLoggedIn = signal(false);

  readonly tmdbId = computed(() => this.route.snapshot.paramMap.get('id') || '');

  ngOnInit(): void {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    const id = this.tmdbId();
    if (!id) {
      this.router.navigate(['/']);
      return;
    }
    this.loadMovieDetails(id);
  }

  loadMovieDetails(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.tmdbService.getMovieDetails(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.movie.set(response.data);
        } else {
          this.error.set('Movie not found');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load movie details');
        this.isLoading.set(false);
      }
    });
  }

  getStars(rating: number): number[] {
    const normalizedRating = rating / 2; // TMDB uses 10-point scale, convert to 5
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating % 1 >= 0.5;
    const stars: number[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(1);
    }
    if (hasHalfStar) {
      stars.push(0.5);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(0);
    }
    return stars;
  }

  formatRuntime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  }

  onLogClick(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    // TODO: Open log modal
  }

  onAddToList(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    // TODO: Open add to list modal
  }

  goBack(): void {
    this.location.back();
  }
}


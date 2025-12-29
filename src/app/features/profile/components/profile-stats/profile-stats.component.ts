import {
    Component,
    ChangeDetectionStrategy,
    input,
    output,
    inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n';

export interface UserStats {
    moviesWatched: number;
    episodesWatched: number;
    totalRuntime: number;
}

@Component({
    selector: 'app-profile-stats',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './profile-stats.component.html',
    styleUrl: './profile-stats.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileStatsComponent {
    private router = inject(Router);

    /** User stats object */
    stats = input.required<UserStats>();

    /** Number of reviews */
    reviewCount = input.required<number>();

    /** Followers count */
    followersCount = input.required<number>();

    /** Following count */
    followingCount = input.required<number>();

    /** Emitted when watched stat is clicked */
    onWatchedClick = output<void>();

    /** Emitted when followers stat is clicked */
    onFollowersClick = output<void>();

    /** Emitted when following stat is clicked */
    onFollowingClick = output<void>();

    /** Total watched items (movies + episodes) */
    get totalWatched(): number {
        const s = this.stats();
        return s.moviesWatched + s.episodesWatched;
    }

    /** Format runtime as Xh Ym */
    formatRuntime(minutes: number): string {
        if (!minutes) return '0h 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }

    /** Format large numbers (e.g., 1500 -> 1.5k) */
    formatNumber(num: number): string {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }

    navigateToWatched(): void {
        this.router.navigate(['/lists/watched']);
        this.onWatchedClick.emit();
    }
}

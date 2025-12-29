import {
    Component,
    ChangeDetectionStrategy,
    input,
    output,
    inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TMDBService } from '../../../core/services/tmdb.service';

@Component({
    selector: 'app-media-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './media-card.component.html',
    styleUrl: './media-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaCardComponent {
    private tmdbService = inject(TMDBService);

    /** Title of the media item */
    title = input.required<string>();

    /** TMDB poster path (without base URL) */
    posterPath = input.required<string | null>();

    /** Rating to display (0-10 scale) */
    rating = input<number>();

    /** Optional subtitle (e.g., year, episode info) */
    subtitle = input<string>();

    /** Icon to show on hover overlay */
    overlayIcon = input<string>('visibility');

    /** Match score percentage (for recommendation cards) */
    matchScore = input<number>();

    /** Whether the card is in a "rated" state */
    isRated = input<boolean>(false);

    /** Emitted when the card is clicked */
    cardClick = output<void>();

    /** Computed poster URL */
    get posterUrl(): string {
        return this.tmdbService.getPosterUrl(this.posterPath(), 'w300');
    }
}

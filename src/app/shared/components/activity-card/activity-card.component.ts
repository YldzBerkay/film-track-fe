import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Activity } from '../../../core/services/activity.service';
import { ReviewCardComponent } from '../review-card/review-card.component';
import { TMDBService } from '../../../core/services/tmdb.service';
import { TranslatePipe } from '../../../core/i18n';

@Component({
    selector: 'app-activity-card',
    standalone: true,
    imports: [CommonModule, RouterModule, ReviewCardComponent, TranslatePipe],
    templateUrl: './activity-card.component.html',
    styleUrl: './activity-card.component.scss'
})
export class ActivityCardComponent {
    @Input({ required: true }) activity!: Activity;
    @Input() viewMode: 'feed' | 'detail' = 'feed';
    @Input() highlightCommentId?: string;
    @Input() showReaction?: 'like' | 'dislike'; // Show reaction badge when set

    private router = inject(Router);
    tmdbService = inject(TMDBService);

    // Helper to determine accurate type including virtual types
    activityType = computed(() => {
        return this.activity.type;
    });

    get posterUrl() {
        return this.tmdbService.getPosterUrl(this.activity.mediaPosterPath, 'w200');
    }

    get profileLink() {
        return ['/profile', this.activity.userId.username];
    }

    get mediaLink() {
        const type = this.activity.mediaType === 'tv_show' ? 'tv_shows' : 'movies';
        return [`/${type}`, this.activity.tmdbId];
    }

    // Navigate to activity detail on card click (only in feed mode)
    onCardClick(): void {
        if (this.viewMode === 'detail') return; // Already on detail page

        // If it's a comment activity, navigate to the parent activity and highlight the comment
        if (this.activity.type === 'comment' && this.activity.activityId) {
            const parentId = typeof this.activity.activityId === 'string'
                ? this.activity.activityId
                : this.activity.activityId._id;

            this.router.navigate(['/activity', parentId], {
                queryParams: { highlight: this.activity._id }
            });
            return;
        }

        this.router.navigate(['/activity', this.activity._id]);
    }

    // Prevent card navigation when clicking interactive elements
    onInteractiveClick(event: Event): void {
        event.stopPropagation();
    }
}

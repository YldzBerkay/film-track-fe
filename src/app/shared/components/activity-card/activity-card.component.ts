import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
}

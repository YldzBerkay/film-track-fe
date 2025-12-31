import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    computed,
    OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n';
import { ProfileStateService } from '../../../../core/services/profile-state.service';
import { MoodService, MoodVector, MoodTimelineEntry } from '../../../../core/services/mood.service';
import { RecommendationService, MoodRecommendation } from '../../../../core/services/recommendation.service';
import { TMDBService } from '../../../../core/services/tmdb.service';
import { Badge } from '../../../../core/services/user.service';
import { MoodChartComponent } from '../../../../shared/components/mood-chart/mood-chart.component';
import { MoodTimelineComponent } from '../../../../shared/components/mood-timeline/mood-timeline.component';
import { MediaCardComponent } from '../../../../shared/components/media-card/media-card.component';
import { AppCarouselComponent } from '../../../../shared/components/app-carousel/app-carousel.component';

@Component({
    selector: 'app-profile-overview',
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        MoodChartComponent,
        MoodTimelineComponent,
        MediaCardComponent,
        AppCarouselComponent
    ],
    templateUrl: './profile-overview.component.html',
    styleUrl: './profile-overview.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileOverviewComponent implements OnInit {
    // Component logic for profile overview tab
    private profileState = inject(ProfileStateService);
    private moodService = inject(MoodService);
    private recommendationService = inject(RecommendationService);
    router = inject(Router);
    tmdbService = inject(TMDBService);

    // State from parent
    profile = this.profileState.profile;
    isOwnProfile = this.profileState.isOwnProfile;
    user = this.profileState.user;

    // Mood state
    moodData = signal<MoodVector | null>(null);
    isLoadingMood = signal(false);
    moodTimeline = signal<MoodTimelineEntry[]>([]);
    isLoadingTimeline = signal(false);

    // AI threshold state
    aiThresholdNotMet = signal(false);
    aiThresholdMeta = signal<{ currentCount: number; requiredCount: number; remaining: number } | null>(null);

    // Recommendations state
    moodRecommendations = signal<MoodRecommendation[]>([]);
    isLoadingRecommendations = signal(false);
    moodRecsMode = signal<'match' | 'shift'>('match');
    includeWatched = signal(false);

    // Badges state
    badges = signal<Badge[]>([]);
    isLoadingBadges = signal(false);

    // Feedback state for recommendation cards
    ratedCards = signal<Set<number>>(new Set());

    // Computed
    hasEnoughTimelineData = computed(() => this.moodTimeline().length >= 3);

    ngOnInit(): void {
        if (this.isOwnProfile()) {
            this.loadMoodData();
            this.loadRecommendations();
        }
    }

    private loadMoodData(): void {
        this.isLoadingMood.set(true);
        this.isLoadingTimeline.set(true);

        this.moodService.getUserMood().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.moodData.set(response.data);
                }
                this.isLoadingMood.set(false);
            },
            error: () => this.isLoadingMood.set(false)
        });

        this.moodService.getMoodTimeline().subscribe({
            next: (response) => {
                if (response.success) {
                    this.moodTimeline.set(response.data);
                }
                this.isLoadingTimeline.set(false);
            },
            error: () => this.isLoadingTimeline.set(false)
        });
    }

    private loadRecommendations(): void {
        this.isLoadingRecommendations.set(true);
        this.recommendationService.getMoodBasedRecommendations(this.moodRecsMode(), 5, this.includeWatched()).subscribe({
            next: (response) => {
                if (response.success) {
                    this.moodRecommendations.set(response.data);
                }
                this.isLoadingRecommendations.set(false);
            },
            error: () => this.isLoadingRecommendations.set(false)
        });
    }

    toggleMoodRecsMode(): void {
        this.moodRecsMode.update(mode => mode === 'match' ? 'shift' : 'match');
        this.loadRecommendations();
    }

    toggleIncludeWatched(): void {
        this.includeWatched.update(v => !v);
        this.loadRecommendations();
    }

    trackByBadgeId = (index: number, badge: Badge): string => badge.id;

    // Check if a card has been rated
    isCardRated(tmdbId: number): boolean {
        return this.ratedCards().has(tmdbId);
    }

    // Rate a recommendation card (like/dislike)
    rateCard(rec: MoodRecommendation, action: 'like' | 'dislike'): void {
        this.ratedCards.update(set => {
            const newSet = new Set(set);
            newSet.add(rec.tmdbId);
            return newSet;
        });

        this.recommendationService.submitFeedback(rec.tmdbId, rec.title, action).subscribe({
            error: (err) => console.error('Feedback failed:', err)
        });
    }
}

import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Activity } from '../../../core/services/activity.service';
import { TMDBService } from '../../../core/services/tmdb.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReactionBarComponent } from '../reaction-bar/reaction-bar.component';
import { CommentListComponent } from '../comments/comment-list/comment-list.component';
import { TranslatePipe, TranslationService } from '../../../core/i18n';

@Component({
    selector: 'app-feed-card',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactionBarComponent, CommentListComponent, TranslatePipe],
    templateUrl: './feed-card.component.html',
    styleUrls: ['./feed-card.component.scss']
})
export class FeedCardComponent {
    @Input({ required: true }) activity!: Activity;
    @Input() viewMode: 'feed' | 'detail' = 'feed';
    @Input() highlightCommentId?: string;

    @Output() cardClick = new EventEmitter<Activity>();

    private router = inject(Router);
    private authService = inject(AuthService);
    private translationService = inject(TranslationService);
    tmdbService = inject(TMDBService);

    showComments = signal(false);
    currentUser = computed(() => this.authService.user());

    ngOnInit(): void {
        // In detail mode, auto-expand comments
        if (this.viewMode === 'detail') {
            this.showComments.set(true);
        }
    }

    ngAfterViewInit(): void {
        if (this.highlightCommentId) {
            setTimeout(() => {
                const el = document.getElementById(this.highlightCommentId!);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('flash-highlight');
                }
            }, 500);
        }
    }

    onCardClick(): void {
        if (this.viewMode === 'detail') return;

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

    onInteractiveClick(event: Event): void {
        event.stopPropagation();
    }

    toggleComments(event?: Event): void {
        if (event) event.stopPropagation();
        this.showComments.set(!this.showComments());
    }

    getUserVote(): 'like' | 'dislike' | null {
        const userId = this.currentUser()?.id;
        if (!userId) return null;
        if (this.activity.likes?.includes(userId)) return 'like';
        if (this.activity.dislikes?.includes(userId)) return 'dislike';
        return null;
    }

    getTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return this.translationService.t('common.justNow');
        }
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return this.translationService.t(diffInMinutes === 1 ? 'common.minuteAgo' : 'common.minutesAgo', { count: diffInMinutes });
        }
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return this.translationService.t(diffInHours === 1 ? 'common.hourAgo' : 'common.hoursAgo', { count: diffInHours });
        }
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return this.translationService.t(diffInDays === 1 ? 'common.dayAgo' : 'common.daysAgo', { count: diffInDays });
        }
        const diffInWeeks = Math.floor(diffInDays / 7);
        return this.translationService.t(diffInWeeks === 1 ? 'common.weekAgo' : 'common.weeksAgo', { count: diffInWeeks });
    }

    get profileLink() {
        return ['/profile', this.activity.userId.username];
    }

    get mediaLink() {
        const type = this.activity.mediaType === 'tv_show' ? 'tv' : 'movies';
        return [`/${type}`, this.activity.tmdbId];
    }
}

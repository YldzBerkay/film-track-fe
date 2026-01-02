import { Component, Input, computed, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Activity } from '../../../core/services/activity.service';
import { ReviewCardComponent } from '../review-card/review-card.component';
import { TMDBService } from '../../../core/services/tmdb.service';
import { TranslatePipe } from '../../../core/i18n';
import { ReactionBarComponent } from '../reaction-bar/reaction-bar.component';
import { CommentListComponent } from '../comments/comment-list/comment-list.component';
import { User } from '../../../core/services/auth.service';

@Component({
    selector: 'app-activity-card',
    standalone: true,
    imports: [CommonModule, RouterModule, ReviewCardComponent, TranslatePipe, ReactionBarComponent, CommentListComponent],
    templateUrl: './activity-card.component.html',
    styleUrl: './activity-card.component.scss'
})
export class ActivityCardComponent {
    @Input({ required: true }) activity!: Activity;
    @Input() viewMode: 'feed' | 'detail' = 'feed';
    @Input() highlightCommentId?: string;
    @Input() showReaction?: 'like' | 'dislike';
    @Input() currentUser: User | null = null;
    @Input() isBookmarked = false;

    @Output() bookmarkToggle = new EventEmitter<Activity>();
    @Output() tasteMatch = new EventEmitter<{ id: string, name: string }>();

    isCommentsExpanded = signal(false);

    private router = inject(Router);
    tmdbService = inject(TMDBService);

    activityType = computed(() => this.activity.type);

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

    toggleComments(): void {
        this.isCommentsExpanded.update(v => !v);
    }

    onBookmarkClick(event: Event): void {
        event.stopPropagation();
        this.bookmarkToggle.emit(this.activity);
    }

    onTasteMatchClick(event: Event): void {
        event.stopPropagation();
        const user = this.activity.userId;
        this.tasteMatch.emit({
            id: typeof user === 'string' ? user : user._id,
            name: (typeof user !== 'string' && (user.name || user.username)) || ''
        });
    }

    getUserVote(): 'like' | 'dislike' | null {
        if (!this.currentUser) return null;
        const userId = this.currentUser.id;

        if (this.activity.likes && this.activity.likes.includes(userId)) return 'like';
        if (this.activity.dislikes && this.activity.dislikes.includes(userId)) return 'dislike';
        return null;
    }

    // Helper methods for template
    getYear(dateString?: string): number {
        if (!dateString) return 0;
        return new Date(dateString).getFullYear();
    }

    getTimeAgo(dateString?: string): string {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    }

    onCommentAdded(): void {
        this.activity.commentCount = (this.activity.commentCount || 0) + 1;
    }
}

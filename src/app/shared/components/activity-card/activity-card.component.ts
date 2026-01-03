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
import { GenreTranslatePipe } from '../../pipes/genre-translate.pipe';

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
        // Fix: Use 'tv' route instead of invalid 'tv_shows'
        // Handle both 'tv_show' and 'tv_episode' types to point to the show
        const isTv = this.activity.mediaType === 'tv_show' || this.activity.mediaType === 'tv_episode';
        const type = isTv ? 'tv' : 'movies';
        return [`/${type}`, this.activity.tmdbId];
    }

    toggleComments(event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
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

    navigateToActivity(): void {
        this.router.navigate(['/activity', this.activity._id]);
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

    getGenreTranslationKey(genre: string): string {
        if (!genre) return '';
        // Normalize string: Science Fiction -> SCIENCE_FICTION
        const key = genre
            .toUpperCase()
            .replace(/&/g, 'AND')
            .replace(/[^A-Z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        return `genres.${key}`;
    }

    getMasteryTranslationKey(title: string | undefined): string {
        if (!title) return '';

        // Map legacy/human-readable titles to translation keys
        const titleMap: Record<string, string> = {
            'Novice': 'novice',
            'Ticket Holder': 'ticketHolder',
            'Movie Buff': 'movieBuff',
            'Amateur Critic': 'criticAmateur',
            'Cinephile': 'cinephile',
            'Culture Guardian': 'cultureGuardian',
            'Grandmaster': 'grandmaster',
            // Turkish fallback just in case
            'Acemi İzleyici': 'novice',
            'Biletçi': 'ticketHolder',
            'Film Tutkunu': 'movieBuff',
            'Amatör Eleştirmen': 'criticAmateur',
            'Sinefil': 'cinephile',
            'Kültür Bekçisi': 'cultureGuardian',
            'Sinema Üstadı': 'grandmaster'
        };

        const key = titleMap[title] || title;
        return `masterRank.${key}`;
    }
}

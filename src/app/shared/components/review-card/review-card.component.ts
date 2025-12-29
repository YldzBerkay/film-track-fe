import { Component, Input, computed, inject, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactionBarComponent } from '../reaction-bar/reaction-bar.component';
import { CommentListComponent } from '../comments/comment-list/comment-list.component';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { TranslatePipe } from '../../../core/i18n';
import { AuthService } from '../../../core/services/auth.service';
import { Activity } from '../../../core/services/activity.service';

@Component({
    selector: 'app-review-card',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        TimeAgoPipe,
        ReactionBarComponent,
        CommentListComponent,
        TranslatePipe
    ],
    templateUrl: './review-card.component.html',
    styleUrls: ['./review-card.component.scss']
})
export class ReviewCardComponent implements OnInit, AfterViewInit {
    @Input({ required: true }) activity!: Activity;
    @Input() isFeedView = false;
    @Input() viewMode: 'feed' | 'detail' = 'feed';
    @Input() highlightCommentId?: string;

    private authService = inject(AuthService);
    currentUser = computed(() => this.authService.user());

    showSpoilers = signal(false);
    isExpanded = signal(false);
    showComments = signal(false);

    // Truncation limit
    readonly CHAR_LIMIT = 300;

    get isTruncated(): boolean {
        return (this.activity.reviewText?.length || 0) > this.CHAR_LIMIT;
    }

    get displayedText(): string {
        const text = this.activity.reviewText || '';
        if (this.isTruncated && !this.isExpanded()) {
            return text.slice(0, this.CHAR_LIMIT) + '...';
        }
        return text;
    }

    toggleSpoiler(e: Event) {
        e.stopPropagation();
        this.showSpoilers.set(!this.showSpoilers());
    }

    toggleExpand(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        this.isExpanded.set(!this.isExpanded());
    }

    toggleComments() {
        this.showComments.set(!this.showComments());
    }

    // Helper for star rating display
    getStars(rating: number): number[] {
        const fullStars = Math.floor(rating / 2); // 10 scale to 5 stars
        const halfStar = (rating % 2) >= 1 ? 0.5 : 0;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        return [...Array(fullStars).fill(1), ...(halfStar ? [0.5] : []), ...Array(emptyStars).fill(0)];
    }

    get displayRating(): string {
        return this.activity.rating ? `${this.activity.rating}/10` : '';
    }

    ngOnInit(): void {
        // In detail mode, auto-expand text and comments
        if (this.viewMode === 'detail') {
            this.isExpanded.set(true);
            this.showComments.set(true);
        }
    }

    ngAfterViewInit(): void {
        // Handle comment deep linking
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
}

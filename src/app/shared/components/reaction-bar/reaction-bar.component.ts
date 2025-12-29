import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { InteractionService } from '../../../core/services/interaction.service';

interface VoteAction {
    targetId: string;
    targetType: 'activity' | 'comment';
    reactionType: 'like' | 'dislike';
}

@Component({
    selector: 'app-reaction-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reaction-bar.component.html',
    styleUrls: ['./reaction-bar.component.scss']
})
export class ReactionBarComponent implements OnInit, OnDestroy {
    @Input() likesCount: number = 0;
    @Input() dislikesCount: number = 0;
    @Input() userVote: 'like' | 'dislike' | null = null;
    @Input() targetId!: string;
    @Input() targetType!: 'activity' | 'comment';

    // Debounce subject for vote actions
    private voteSubject = new Subject<VoteAction>();
    private voteSubscription?: Subscription;

    // Store previous state for revert on error
    private previousState = {
        likesCount: 0,
        dislikesCount: 0,
        userVote: null as 'like' | 'dislike' | null
    };

    isVoting = false;

    constructor(private interactionService: InteractionService) { }

    ngOnInit(): void {
        // Subscribe to debounced vote actions
        this.voteSubscription = this.voteSubject.pipe(
            debounceTime(1000), // Wait 1 second after the LAST click
            switchMap(action => this.interactionService.toggleReaction(
                action.targetId,
                action.targetType,
                action.reactionType
            ))
        ).subscribe({
            next: (res) => {
                this.isVoting = false;
                if (res.success && res.data) {
                    // Sync with server truth
                    this.likesCount = res.data.likesCount;
                    this.dislikesCount = res.data.dislikesCount;
                    this.userVote = res.data.userVote;
                }
            },
            error: (err) => {
                this.isVoting = false;
                // Revert optimistic UI on error
                this.revertOptimisticUI();

                if (err.status === 429) {
                    console.warn('Rate limited: Too many reaction attempts');
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.voteSubscription?.unsubscribe();
    }

    vote(type: 'like' | 'dislike') {
        // Store previous state before optimistic update
        this.previousState = {
            likesCount: this.likesCount,
            dislikesCount: this.dislikesCount,
            userVote: this.userVote
        };

        // Optimistic UI Update (immediate)
        if (this.userVote === type) {
            // Toggle OFF
            this.userVote = null;
            if (type === 'like') this.likesCount--;
            else this.dislikesCount--;
        } else {
            // Toggle ON (or Switch)
            if (this.userVote === 'like') {
                // Switching from Like to Dislike
                this.likesCount--;
                this.dislikesCount++;
            } else if (this.userVote === 'dislike') {
                // Switching from Dislike to Like
                this.dislikesCount--;
                this.likesCount++;
            } else {
                // New Vote
                if (type === 'like') this.likesCount++;
                else this.dislikesCount++;
            }
            this.userVote = type;
        }

        this.isVoting = true;

        // Push to debounced subject (NOT direct API call)
        this.voteSubject.next({
            targetId: this.targetId,
            targetType: this.targetType,
            reactionType: type
        });
    }

    private revertOptimisticUI(): void {
        this.likesCount = this.previousState.likesCount;
        this.dislikesCount = this.previousState.dislikesCount;
        this.userVote = this.previousState.userVote;
    }
}

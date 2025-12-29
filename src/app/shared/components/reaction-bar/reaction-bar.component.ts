import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../../../core/services/interaction.service';

@Component({
    selector: 'app-reaction-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reaction-bar.component.html',
    styleUrls: ['./reaction-bar.component.scss']
})
export class ReactionBarComponent {
    @Input() likesCount: number = 0;
    @Input() dislikesCount: number = 0;
    @Input() userVote: 'like' | 'dislike' | null = null;
    @Input() targetId!: string;
    @Input() targetType!: 'activity' | 'comment';

    // Signals for internal state handling (optional, but good for reactivity)
    // For now using simple properties, but let's be consistent.

    isVoting = false;

    constructor(private interactionService: InteractionService) { }

    vote(type: 'like' | 'dislike') {
        if (this.isVoting) return;

        // Optimistic Update
        const previousState = {
            likesCount: this.likesCount,
            dislikesCount: this.dislikesCount,
            userVote: this.userVote
        };

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
        this.interactionService.toggleReaction(this.targetId, this.targetType, type).subscribe({
            next: (res) => {
                this.isVoting = false;
                if (res.success && res.data) {
                    // Sync with server truth
                    this.likesCount = res.data.likesCount;
                    this.dislikesCount = res.data.dislikesCount;
                    this.userVote = res.data.userVote;
                }
            },
            error: () => {
                // Revert
                this.isVoting = false;
                this.likesCount = previousState.likesCount;
                this.dislikesCount = previousState.dislikesCount;
                this.userVote = previousState.userVote;
            }
        });
    }
}

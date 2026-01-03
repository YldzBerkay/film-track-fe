import { Component, Input, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { InteractionService } from '../../../core/services/interaction.service';
import { ToastService } from '../../../core/services/toast.service';

interface ReactionPayload {
    action: 'like' | 'dislike' | 'none';
    targetId: string;
    targetType: 'activity' | 'comment';
}

@Component({
    selector: 'app-reaction-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reaction-bar.component.html',
    styleUrls: ['./reaction-bar.component.scss']
})
export class ReactionBarComponent implements OnInit, OnDestroy {
    @Input() targetId!: string;
    @Input() targetType!: 'activity' | 'comment';

    // Inputs for initial state - using setters to init signals
    @Input() set likesCount(val: number) {
        this._initialLikes = val;
        if (this.currentStatus() === 'none') this.displayLikes.set(val); // Only set if not already modified?
        // Actually, inputs might update from parent when list refreshes.
        // We should respect parent update BUT if user is interacting, we might have local conflict.
        // For now, accept parent input as truth if we are not "dirty"? 
        // Or simpler: Just update _initial and re-calc.
        this.updateCounts();
    }
    @Input() set dislikesCount(val: number) {
        this._initialDislikes = val;
        this.updateCounts();
    }
    @Input() set userVote(val: 'like' | 'dislike' | null) {
        const status = val || 'none';
        this._initialVote = status;
        this.serverState = status; // Assume input mirrors server

        // If we are not actively voting (or maybe even if we are?), sync current status?
        // If user is clicking, we shouldn't jump?
        // But usually input updates happen on load.
        // Let's set currentStatus only if it's the first load or explicit refresh.
        // For simplicity: Update signals.
        this.currentStatus.set(status);
        this.updateCounts();
    }

    // Internal state management
    private _initialLikes = 0;
    private _initialDislikes = 0;
    private _initialVote: 'like' | 'dislike' | 'none' = 'none';

    // Signals for UI
    currentStatus = signal<'like' | 'dislike' | 'none'>('none');
    displayLikes = signal(0);
    displayDislikes = signal(0);

    isVoting = signal(false);

    private reactionSubject = new Subject<ReactionPayload>();
    private subscription?: Subscription;

    // Track the last confirmed server state
    private serverState: 'like' | 'dislike' | 'none' = 'none';

    constructor(
        private interactionService: InteractionService,
        private toastService: ToastService
    ) { }

    ngOnInit(): void {
        this.subscription = this.reactionSubject.pipe(
            debounceTime(1000), // Wait for user to settle
            distinctUntilChanged((prev, curr) => prev.action === curr.action), // Don't send if same as last sent
            switchMap(payload => {
                this.isVoting.set(true);
                return this.interactionService.toggleReaction(payload.targetId, payload.targetType, payload.action);
            })
        ).subscribe({
            next: (res) => {
                this.isVoting.set(false);
                if (res.success && res.data) {
                    // Sync successful
                    this.serverState = res.data.userVote || 'none';
                    // Optional: Update initial baselines from server response to be precise
                    if (res.data.likesCount !== undefined) this._initialLikes = res.data.likesCount;
                    if (res.data.dislikesCount !== undefined) this._initialDislikes = res.data.dislikesCount;
                    // Note: We need to adjust _initialLikes carefully. 
                    // The server response includes the user's vote.
                    // Our calculate logic assumes _initial is "without user vote"? No, usually Input is "current total".
                    // Let's rely on standard inputs or just use returned values if they match state.

                    if (this.currentStatus() === this.serverState) {
                        this.displayLikes.set(res.data.likesCount);
                        this.displayDislikes.set(res.data.dislikesCount);
                    }
                }
            },
            error: (err) => {
                this.isVoting.set(false);
                // Rollback UI to last known server state
                this.currentStatus.set(this.serverState);
                this.updateCounts();

                if (err.status === 429) {
                    const msg = err.error?.message || 'Rate limit exceeded';
                    this.toastService.show(msg, 'error');
                } else {
                    this.toastService.show('Connection failed, vote reverted', 'error');
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

    onReact(action: 'like' | 'dislike', event?: Event) {
        if (event) {
            event.stopPropagation();
        }
        const oldState = this.currentStatus();
        let newState: 'like' | 'dislike' | 'none' = action;

        if (oldState === action) {
            newState = 'none'; // Toggle off
        }

        // 1. Update UI Signal Immediately (Optimistic)
        this.currentStatus.set(newState);
        this.updateCounts();

        // 2. Queue network request
        this.reactionSubject.next({
            action: newState,
            targetId: this.targetId,
            targetType: this.targetType
        });
    }

    private updateCounts() {
        const current = this.currentStatus();
        const initial = this._initialVote;

        let likes = this._initialLikes;
        let dislikes = this._initialDislikes;

        // Logic:
        // Start from _initial counts (which include _initialVote).
        // If generic state changed, adjust generic counts.

        // Remove initial vote contribution
        if (initial === 'like') likes--;
        if (initial === 'dislike') dislikes--;

        // Add current vote contribution
        if (current === 'like') likes++;
        if (current === 'dislike') dislikes++;

        // Safety: don't go below 0
        if (likes < 0) likes = 0;
        if (dislikes < 0) dislikes = 0;

        this.displayLikes.set(likes);
        this.displayDislikes.set(dislikes);
    }
}

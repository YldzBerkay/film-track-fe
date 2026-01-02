import { Component, ChangeDetectionStrategy, signal, inject, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n';
import { RecommendationService, Friend, FriendMealtimeRecommendation } from '../../../../core/services/recommendation.service';

@Component({
    selector: 'app-friend-mealtime-dialog',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './friend-mealtime-dialog.component.html',
    styleUrl: './friend-mealtime-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendMealtimeDialogComponent {
    private recommendationService = inject(RecommendationService);

    isOpen = input.required<boolean>();
    close = output<void>();

    friendsList = signal<Friend[]>([]);
    selectedFriends = signal<Set<string>>(new Set());
    isFriendsLoading = signal(false);

    friendPickResult = signal<FriendMealtimeRecommendation | null>(null);
    isFriendPickLoading = signal(false);

    constructor() {
        // Reset state and load friends when dialog opens
        effect(() => {
            if (this.isOpen()) {
                this.resetState();
                this.loadFriends();
            }
        }, { allowSignalWrites: true });
    }

    private resetState() {
        this.friendPickResult.set(null);
        this.selectedFriends.set(new Set());
        this.isFriendPickLoading.set(false);
    }

    loadFriends(): void {
        this.isFriendsLoading.set(true);
        this.recommendationService.getFriends().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.friendsList.set(response.data);
                }
                this.isFriendsLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load friends:', err);
                this.isFriendsLoading.set(false);
            }
        });
    }

    toggleFriendSelection(friendId: string): void {
        const current = new Set(this.selectedFriends());
        if (current.has(friendId)) {
            current.delete(friendId);
        } else {
            current.add(friendId);
        }
        this.selectedFriends.set(current);
    }

    isFriendSelected(friendId: string): boolean {
        return this.selectedFriends().has(friendId);
    }

    submitFriendPick(): void {
        const selected = Array.from(this.selectedFriends());
        if (selected.length === 0) return;

        this.isFriendPickLoading.set(true);
        this.recommendationService.getFriendMealtimePick(selected).subscribe({
            next: (response) => {
                this.isFriendPickLoading.set(false);
                if (response.success && response.data) {
                    this.friendPickResult.set(response.data);
                }
            },
            error: (err) => {
                console.error('Failed to get friend mealtime pick:', err);
                this.isFriendPickLoading.set(false);
            }
        });
    }
}

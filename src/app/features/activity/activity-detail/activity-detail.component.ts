import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Activity, ActivityService } from '../../../core/services/activity.service';
import { TranslatePipe } from '../../../core/i18n';
import { HeaderComponent } from '../../../layout/header/header.component';
import { AuthService } from '../../../core/services/auth.service';
import { TasteMatchDialogComponent } from '../../dashboard/components/taste-match-dialog/taste-match-dialog.component';
import { ActivityCardComponent } from '../../../shared/components/activity-card/activity-card.component';

@Component({
    selector: 'app-activity-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe, HeaderComponent, TasteMatchDialogComponent, ActivityCardComponent],
    templateUrl: './activity-detail.component.html',
    styleUrls: ['./activity-detail.component.scss']
})
export class ActivityDetailComponent implements OnInit {
    activity = signal<Activity | null>(null);
    isLoading = signal(true);
    error = signal<string | null>(null);
    highlightCommentId = signal<string | null>(null);

    private route = inject(ActivatedRoute);
    private activityService = inject(ActivityService);
    private location = inject(Location);
    private authService = inject(AuthService);

    readonly user = computed(() => this.authService.user());
    readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

    // Bookmark state
    bookmarkedActivities = signal<Set<string>>(new Set());

    // Taste Match Dialog state
    showTasteMatchDialog = signal(false);
    tasteMatchTargetUser = signal<{ id: string; name: string } | null>(null);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        this.highlightCommentId.set(this.route.snapshot.queryParamMap.get('highlight'));

        if (id) {
            this.loadActivity(id);
        } else {
            this.error.set('Activity ID not found');
            this.isLoading.set(false);
        }
    }

    loadActivity(id: string): void {
        this.activityService.getActivityById(id).subscribe({
            next: (res) => {
                if (res.success) {
                    this.activity.set(res.data);
                    if (this.isAuthenticated()) {
                        this.checkIfBookmarked(res.data._id);
                    }
                } else {
                    this.error.set('Activity not found');
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Failed to load activity');
                this.isLoading.set(false);
            }
        });
    }

    goBack(): void {
        this.location.back();
    }

    // Bookmark Logic
    checkIfBookmarked(activityId: string): void {
        // Since we only show one activity, we can check just this one or fetch all.
        // For consistency with Dashboard, we'll fetch saved activities to populate the set.
        // Or cleaner: just check this specific one if API supports it?
        // API getSavedActivities returns a list.
        // Let's just assume we want to maintain the Set pattern for compatibility with the template.
        this.activityService.getSavedActivities(1, 100).subscribe({
            next: (res) => {
                if (res.success && res.data?.activities) {
                    const ids = new Set(res.data.activities.map(a => a._id));
                    this.bookmarkedActivities.set(ids);
                }
            }
        });
    }

    isActivityBookmarked(activityId: string): boolean {
        return this.bookmarkedActivities().has(activityId);
    }

    toggleBookmark(activity: Activity): void {
        if (!this.isAuthenticated()) return;

        const activityId = activity._id;
        const isCurrentlyBookmarked = this.isActivityBookmarked(activityId);

        // Optimistic update
        this.bookmarkedActivities.update(set => {
            const newSet = new Set(set);
            if (isCurrentlyBookmarked) {
                newSet.delete(activityId);
            } else {
                newSet.add(activityId);
            }
            return newSet;
        });

        this.activityService.toggleBookmark(activityId).subscribe({
            next: (response) => {
                if (response.success) {
                    this.bookmarkedActivities.update(set => {
                        const newSet = new Set(set);
                        if (response.data.bookmarked) {
                            newSet.add(activityId);
                        } else {
                            newSet.delete(activityId);
                        }
                        return newSet;
                    });
                }
            },
            error: () => {
                // Revert
                this.bookmarkedActivities.update(set => {
                    const newSet = new Set(set);
                    if (isCurrentlyBookmarked) {
                        newSet.add(activityId);
                    } else {
                        newSet.delete(activityId);
                    }
                    return newSet;
                });
            }
        });
    }

    // Taste Match Logic
    openTasteMatchDialog(userId: string, userName: string): void {
        if (userId === this.user()?.id) return;
        this.tasteMatchTargetUser.set({ id: userId, name: userName });
        this.showTasteMatchDialog.set(true);
    }

    closeTasteMatchDialog(): void {
        this.showTasteMatchDialog.set(false);
    }
}

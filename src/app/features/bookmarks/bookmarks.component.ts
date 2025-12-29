import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivityService, Activity } from '../../core/services/activity.service';
import { ActivityCardComponent } from '../../shared/components/activity-card/activity-card.component';
import { DashboardLayoutComponent } from '../../shared/components/dashboard-layout/dashboard-layout.component';
import { TranslatePipe } from '../../core/i18n';

@Component({
    selector: 'app-bookmarks',
    standalone: true,
    imports: [CommonModule, RouterModule, ActivityCardComponent, DashboardLayoutComponent, TranslatePipe],
    templateUrl: './bookmarks.component.html',
    styleUrl: './bookmarks.component.scss'
})
export class BookmarksComponent implements OnInit {
    private activityService = inject(ActivityService);

    activities = signal<Activity[]>([]);
    isLoading = signal(true);
    currentPage = signal(1);
    hasMore = signal(true);

    ngOnInit(): void {
        this.loadBookmarks();
    }

    loadBookmarks(): void {
        this.isLoading.set(true);
        this.activityService.getSavedActivities(this.currentPage(), 20).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    if (this.currentPage() === 1) {
                        this.activities.set(response.data.activities);
                    } else {
                        this.activities.set([...this.activities(), ...response.data.activities]);
                    }
                    this.hasMore.set(
                        response.data.pagination.page < response.data.pagination.totalPages
                    );
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    loadMore(): void {
        if (this.isLoading() || !this.hasMore()) return;
        this.currentPage.set(this.currentPage() + 1);
        this.loadBookmarks();
    }

    removeBookmark(activity: Activity): void {
        this.activityService.toggleBookmark(activity._id).subscribe({
            next: (response) => {
                if (response.success && !response.data.bookmarked) {
                    this.activities.set(this.activities().filter(a => a._id !== activity._id));
                }
            }
        });
    }
}

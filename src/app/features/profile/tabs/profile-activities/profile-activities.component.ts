import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n';
import { ProfileStateService } from '../../../../core/services/profile-state.service';
import { ActivityService, Activity } from '../../../../core/services/activity.service';
import { ActivityCardComponent } from '../../../../shared/components/activity-card/activity-card.component';

type ActivityFilter = 'ALL' | 'REVIEWS' | 'COMMENTS' | 'RATINGS' | 'IMPORTS';

@Component({
    selector: 'app-profile-activities',
    standalone: true,
    imports: [CommonModule, TranslatePipe, ActivityCardComponent],
    templateUrl: './profile-activities.component.html',
    styleUrl: './profile-activities.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileActivitiesComponent implements OnInit {
    private profileState = inject(ProfileStateService);
    private activityService = inject(ActivityService);

    user = this.profileState.user;

    activities = signal<Activity[]>([]);
    isLoading = signal(false);
    activityFilter = signal<ActivityFilter>('ALL');
    currentPage = signal(1);
    hasMore = signal(true);

    ngOnInit(): void {
        this.loadActivities();
    }

    setFilter(filter: ActivityFilter): void {
        if (this.activityFilter() === filter) return;
        this.activityFilter.set(filter);
        this.currentPage.set(1);
        this.activities.set([]);
        this.loadActivities();
    }

    loadActivities(): void {
        const userId = this.user()?.id;
        if (!userId) return;

        this.isLoading.set(true);
        const filter = this.activityFilter();
        const page = this.currentPage();

        this.activityService.getProfileActivities(userId, page, 20, filter === 'ALL' ? 'ALL' : filter).subscribe({
            next: (response) => {
                if (response.success) {
                    const activities = response.data.activities;
                    if (page === 1) {
                        this.activities.set(activities);
                    } else {
                        this.activities.update(current => [...current, ...activities]);
                    }
                    this.hasMore.set(activities.length === 20);
                }
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    loadMore(): void {
        this.currentPage.update(p => p + 1);
        this.loadActivities();
    }
}

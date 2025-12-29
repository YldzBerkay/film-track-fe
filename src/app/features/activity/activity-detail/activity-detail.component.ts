import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Activity, ActivityService } from '../../../core/services/activity.service';
import { FeedCardComponent } from '../../../shared/components/feed-card/feed-card.component';
import { TranslatePipe } from '../../../core/i18n';
import { HeaderComponent } from '../../../layout/header/header.component';

@Component({
    selector: 'app-activity-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, FeedCardComponent, TranslatePipe, HeaderComponent],
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
}

import {
    Component,
    ChangeDetectionStrategy,
    input,
    output,
    inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../core/i18n';

export interface ProfileUser {
    id: string;
    username: string;
    name?: string | null;
    email?: string;  // Optional - only present on own profile
    avatar?: string | null;
    banner?: string | null;
    followersCount: number;
    followingCount: number;
    stats: {
        moviesWatched: number;
        episodesWatched: number;
        totalRuntime: number;
    };
}

@Component({
    selector: 'app-profile-header',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './profile-header.component.html',
    styleUrl: './profile-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileHeaderComponent {
    /** User profile data */
    user = input.required<ProfileUser>();

    /** Whether this is the current user's own profile */
    isOwnProfile = input.required<boolean>();

    /** Whether the current user is following this profile */
    isFollowing = input<boolean>(false);

    /** Loading state for follow button */
    isFollowLoading = input<boolean>(false);

    /** Loading state for banner upload */
    isBannerLoading = input<boolean>(false);

    /** Emitted when edit profile button is clicked */
    onEdit = output<void>();

    /** Emitted when follow button is clicked */
    onFollow = output<void>();

    /** Emitted when unfollow button is clicked */
    onUnfollow = output<void>();

    /** Emitted when share button is clicked */
    onShare = output<void>();

    /** Emitted when reports button is clicked */
    onReport = output<void>();

    /** Emitted when compare mood button is clicked */
    onCompareMood = output<void>();

    /** Emitted when a new banner file is selected */
    onBannerChange = output<File>();

    handleBannerUpload(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files?.length) {
            const file = input.files[0];
            if (file.size <= 2 * 1024 * 1024) {
                this.onBannerChange.emit(file);
            }
        }
        input.value = ''; // Reset for re-selection
    }
}

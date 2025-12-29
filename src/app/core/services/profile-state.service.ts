import { Injectable, signal, computed } from '@angular/core';
import { UserProfile } from './user.service';

/**
 * Shared state service for profile data between parent ProfileComponent 
 * and child tab route components
 */
@Injectable({ providedIn: 'root' })
export class ProfileStateService {
    private _profile = signal<UserProfile | null>(null);
    private _isOwnProfile = signal<boolean>(false);
    private _isLoading = signal<boolean>(true);

    /** Current profile data */
    readonly profile = this._profile.asReadonly();

    /** Whether viewing own profile */
    readonly isOwnProfile = this._isOwnProfile.asReadonly();

    /** Loading state */
    readonly isLoading = this._isLoading.asReadonly();

    /** Profile user data (convenience accessor) */
    readonly user = computed(() => this._profile()?.user ?? null);

    setProfile(profile: UserProfile | null): void {
        this._profile.set(profile);
    }

    setIsOwnProfile(isOwn: boolean): void {
        this._isOwnProfile.set(isOwn);
    }

    setLoading(loading: boolean): void {
        this._isLoading.set(loading);
    }

    /** Update profile user data (e.g., after follow/unfollow) */
    updateUser(updates: Partial<UserProfile['user']>): void {
        const current = this._profile();
        if (current) {
            this._profile.set({
                ...current,
                user: { ...current.user, ...updates }
            });
        }
    }

    /** Clear state (e.g., when navigating away) */
    clear(): void {
        this._profile.set(null);
        this._isOwnProfile.set(false);
        this._isLoading.set(true);
    }
}

import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslationService } from '../../../../core/i18n';
import { ProfileStateService } from '../../../../core/services/profile-state.service';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { SubscriptionTier } from '../../../../core/models/subscription.types';
import { DialogComponent } from '../../../../shared/components/dialog/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ImportDialogComponent } from '../../../../shared/components/import-dialog/import-dialog.component';

export interface ImportResult {
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    failedItems: string[];
    estimatedProcessingSeconds?: number;
}

interface PasswordData {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

@Component({
    selector: 'app-profile-settings',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, DialogComponent],
    templateUrl: './profile-settings.component.html',
    styleUrl: './profile-settings.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileSettingsComponent {
    private profileState = inject(ProfileStateService);
    private userService = inject(UserService);
    private authService = inject(AuthService);
    private translationService = inject(TranslationService);
    private dialog = inject(MatDialog);


    isOwnProfile = this.profileState.isOwnProfile;

    // CSV Import state
    isImporting = signal(false);
    importResult = signal<ImportResult | null>(null);
    overwriteExisting = signal(false);
    showFailedItems = signal(false);

    // Import List state
    isImportingList = signal(false);
    importListResult = signal<{ listId: string; listName: string; importedCount: number; failedCount: number; failedItems: string[] } | null>(null);
    showListFailedItems = signal(false);

    // Import confirmation dialog state
    showImportDialog = signal(false);
    pendingImportFile = signal<File | null>(null);

    // Password state
    passwordData = signal<PasswordData>({ oldPassword: '', newPassword: '', confirmPassword: '' });
    isUpdatingPassword = signal(false);
    passwordMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);


    // Privacy state
    privacySettings = signal({
        mood: 'public',
        library: 'public',
        activity: 'public',
        stats: 'public'
    });
    isUpdatingPrivacy = signal(false);
    privacyMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

    currentYear = new Date().getFullYear();

    // Subscription state
    promoCode = signal('');
    isRedeeming = signal(false);
    subscriptionMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);
    user = this.authService.user;
    SubscriptionTier = SubscriptionTier; // For template access
    private subscriptionService = inject(SubscriptionService);

    // ... existing methods ...

    // ... existing methods ...

    constructor() {
        // Initialize privacy settings from profile when it loads
        effect(() => {
            const profile = this.profileState.profile();
            if (profile?.privacySettings) {
                this.privacySettings.set({
                    mood: profile.privacySettings.mood || 'public',
                    library: profile.privacySettings.library || 'public',
                    activity: profile.privacySettings.activity || 'public',
                    stats: profile.privacySettings.stats || 'public'
                });
            }
        });
    }

    updatePrivacySetting(section: 'mood' | 'library' | 'activity' | 'stats', value: string): void {
        this.privacySettings.update(s => ({ ...s, [section]: value }));
    }

    savePrivacySettings(): void {
        this.isUpdatingPrivacy.set(true);
        this.privacyMessage.set(null);

        const settings = this.privacySettings();

        // Map string values to allowed union types
        const payload = {
            mood: settings.mood as 'public' | 'friends' | 'private',
            library: settings.library as 'public' | 'friends' | 'private',
            activity: settings.activity as 'public' | 'friends' | 'private',
            stats: settings.stats as 'public' | 'friends' | 'private'
        };

        this.userService.updatePrivacySettings(payload).subscribe({
            next: (response) => {
                if (response.success && response.data?.privacySettings) {
                    this.privacyMessage.set({
                        type: 'success',
                        text: this.translationService.t('settings.privacyUpdated')
                    });
                    // Update auth user state
                    this.authService.updateUser({ privacySettings: response.data.privacySettings });
                }
                this.isUpdatingPrivacy.set(false);
            },
            error: (err) => {
                this.privacyMessage.set({
                    type: 'error',
                    text: err.error?.message || this.translationService.t('settings.privacyUpdateFailed')
                });
                this.isUpdatingPrivacy.set(false);
            }
        });
    }

    async redeemCode(): Promise<void> {
        const code = this.promoCode().trim();
        if (!code) {
            this.subscriptionMessage.set({
                type: 'error',
                text: this.translationService.t('settings.codeRequired')
            });
            return;
        }

        this.isRedeeming.set(true);
        this.subscriptionMessage.set(null);

        this.subscriptionService.redeem(code).subscribe({
            next: (response) => {
                if (response.success) {
                    this.subscriptionMessage.set({
                        type: 'success',
                        text: this.translationService.t('settings.redeemSuccess')
                    });
                    this.authService.refreshAccessToken().subscribe();
                    this.promoCode.set('');
                }
                this.isRedeeming.set(false);
            },
            error: (err) => {
                this.subscriptionMessage.set({
                    type: 'error',
                    text: err.error?.message || this.translationService.t('settings.redeemFailed')
                });
                this.isRedeeming.set(false);
            }
        });
    }

    onCsvFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];

        this.dialog.open(ImportDialogComponent, {
            data: {
                file,
                mode: 'watch-history',
                overwriteExisting: this.overwriteExisting(),
                onlyRated: false // Default for watch history
            },
            disableClose: true,
            minWidth: '450px',
            panelClass: 'glass-dialog'
        });

        input.value = ''; // Reset for re-selection
    }

    closeImportDialog(): void {
        this.showImportDialog.set(false);
        this.pendingImportFile.set(null);
    }

    confirmListImport(onlyRated: boolean): void {
        const file = this.pendingImportFile();
        if (!file) return;

        this.showImportDialog.set(false); // Close confirmation modal

        this.dialog.open(ImportDialogComponent, {
            data: {
                file,
                mode: 'custom-list',
                onlyRated,
                // Asking for list name? The backend now extracts it or accepts it.
                // The current pendingImportFile logic doesn't capture list name input.
                // We'll trust the filename extraction for now or add list name support later.
            },
            disableClose: true,
            minWidth: '450px',
            panelClass: 'glass-dialog'
        });

        this.pendingImportFile.set(null);
    }

    toggleFailedItems(): void {
        this.showFailedItems.update(v => !v);
    }

    toggleListFailedItems(): void {
        this.showListFailedItems.update(v => !v);
    }

    onListCsvFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        this.pendingImportFile.set(file);
        this.showImportDialog.set(true);

        input.value = ''; // Reset for re-selection
    }

    getEstimatedMinutes(): number {
        const seconds = this.importResult()?.estimatedProcessingSeconds || 0;
        return Math.ceil(seconds / 60);
    }

    updatePasswordField(field: keyof PasswordData, value: string): void {
        this.passwordData.update(data => ({ ...data, [field]: value }));
    }

    updatePassword(): void {
        const data = this.passwordData();

        if (!data.oldPassword || !data.newPassword || !data.confirmPassword) {
            this.passwordMessage.set({
                type: 'error',
                text: this.translationService.t('settings.allFieldsRequired')
            });
            return;
        }

        if (data.newPassword !== data.confirmPassword) {
            this.passwordMessage.set({
                type: 'error',
                text: this.translationService.t('settings.passwordsDoNotMatch')
            });
            return;
        }

        if (data.newPassword.length < 6) {
            this.passwordMessage.set({
                type: 'error',
                text: this.translationService.t('settings.passwordTooShort')
            });
            return;
        }

        this.isUpdatingPassword.set(true);
        this.passwordMessage.set(null);

        this.authService.changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword }).subscribe({
            next: (response: { success: boolean; message?: string }) => {
                if (response.success) {
                    this.passwordMessage.set({
                        type: 'success',
                        text: this.translationService.t('settings.passwordUpdated')
                    });
                    this.passwordData.set({ oldPassword: '', newPassword: '', confirmPassword: '' });
                } else {
                    this.passwordMessage.set({
                        type: 'error',
                        text: response.message || 'Failed to update password'
                    });
                }
                this.isUpdatingPassword.set(false);
            },
            error: (err: { error?: { message?: string } }) => {
                this.passwordMessage.set({
                    type: 'error',
                    text: err.error?.message || 'Failed to update password'
                });
                this.isUpdatingPassword.set(false);
            }
        });
    }
    // Delete Account State
    showDeleteModal = signal(false);
    isDeletingAccount = signal(false);

    openDeleteModal(): void {
        this.showDeleteModal.set(true);
    }

    closeDeleteModal(): void {
        this.showDeleteModal.set(false);
    }

    onDeleteConfirmed(): void {
        this.isDeletingAccount.set(true);
        this.userService.deleteAccount().subscribe({
            next: () => {
                this.authService.logout();
                window.location.href = '/';
            },
            error: (err) => {
                console.error('Delete account failed', err);
                this.isDeletingAccount.set(false);
                this.closeDeleteModal();
                alert('Failed to delete account. Please try again.');
            }
        });
    }
}

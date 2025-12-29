import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslationService } from '../../../../core/i18n';
import { ProfileStateService } from '../../../../core/services/profile-state.service';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';

interface ImportResult {
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
    imports: [CommonModule, FormsModule, TranslatePipe],
    templateUrl: './profile-settings.component.html',
    styleUrl: './profile-settings.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileSettingsComponent {
    private profileState = inject(ProfileStateService);
    private userService = inject(UserService);
    private authService = inject(AuthService);
    private translationService = inject(TranslationService);

    isOwnProfile = this.profileState.isOwnProfile;

    // CSV Import state
    isImporting = signal(false);
    importResult = signal<ImportResult | null>(null);
    overwriteExisting = signal(false);
    showFailedItems = signal(false);

    // Password state
    passwordData = signal<PasswordData>({ oldPassword: '', newPassword: '', confirmPassword: '' });
    isUpdatingPassword = signal(false);
    passwordMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

    currentYear = new Date().getFullYear();

    onCsvFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        this.isImporting.set(true);
        this.importResult.set(null);

        this.userService.uploadWatchHistoryCsv(file, this.overwriteExisting()).subscribe({
            next: (response) => {
                if (response.success) {
                    this.importResult.set(response.data);
                }
                this.isImporting.set(false);
            },
            error: (err: { error?: { message?: string } }) => {
                console.error('Import failed:', err);
                this.importResult.set({
                    importedCount: 0,
                    skippedCount: 0,
                    failedCount: 1,
                    failedItems: [err.error?.message || 'Import failed']
                });
                this.isImporting.set(false);
            }
        });

        input.value = ''; // Reset for re-selection
    }

    toggleFailedItems(): void {
        this.showFailedItems.update(v => !v);
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
}

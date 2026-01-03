import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../core/services/user.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription, Observable } from 'rxjs';

export interface ImportDialogData {
    file: File;
    mode: 'watch-history' | 'custom-list';
    overwriteExisting?: boolean;
    onlyRated?: boolean;
    listName?: string;
}

@Component({
    selector: 'app-import-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatProgressBarModule, MatButtonModule, MatIconModule],
    templateUrl: './import-dialog.component.html',
    styleUrl: './import-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportDialogComponent implements OnInit, OnDestroy {
    private dialogRef = inject(MatDialogRef<ImportDialogComponent>);
    private userService = inject(UserService);
    private socketService = inject(SocketService);
    data = inject<ImportDialogData>(MAT_DIALOG_DATA);

    // State
    status = signal<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
    progress = signal(0);
    currentProcessingItem = signal<string>('');
    error = signal<string | null>(null);
    stats = signal<{ imported: number; queued: number; failed: number } | null>(null);

    private socketSub?: Subscription;

    ngOnInit() {
        if (this.data.file) {
            this.startImport();
        }
    }

    ngOnDestroy() {
        this.socketSub?.unsubscribe();
    }

    startImport() {
        this.status.set('uploading');
        this.dialogRef.disableClose = true; // Prevent closing while running

        // 1. Upload File
        let uploadObs: Observable<any>;
        if (this.data.mode === 'watch-history') {
            uploadObs = this.userService.uploadWatchHistoryCsv(
                this.data.file,
                this.data.overwriteExisting || false,
                this.data.onlyRated || false
            );
        } else {
            uploadObs = this.userService.uploadListCsv(
                this.data.file,
                this.data.listName,
                this.data.onlyRated || false
            );
        }

        uploadObs.subscribe({
            next: (response) => {
                if (response.success && response.data?.processingInBackground) {
                    this.status.set('processing');
                    this.listenToProgress();
                } else {
                    // Fallback for sync or immediate failure
                    this.status.set('completed');
                    this.stats.set(response.data);
                    this.dialogRef.disableClose = false;
                }
            },
            error: (err) => {
                this.status.set('failed');
                this.error.set(err.error?.message || 'Upload failed');
                this.dialogRef.disableClose = false;
            }
        });
    }

    listenToProgress() {
        this.socketSub = this.socketService.listenToImportProgress().subscribe({
            next: (event: { percent: number; item: string; status: string }) => {
                if (event.status === 'processing' || event.status === 'success') {
                    this.progress.set(event.percent);
                    this.currentProcessingItem.set(event.item);
                }

                if (event.percent === 100) {
                    this.status.set('completed');
                    this.currentProcessingItem.set('Finished!');
                    this.dialogRef.disableClose = false;
                    // We might want to fetch final stats here?
                    // Or just confirm completion.
                }
            },
            error: (err) => {
                // If socket error, we might still be running? 
                // Or true failure.
                console.error('Socket error', err);
                // Don't fail the UI excessively, maybe just warn.
            }
        });
    }

    runInBackground() {
        this.dialogRef.close('background');
        // Toast should be handled by caller or global service?
        // Since we unsubscribe on destroy, the progress listener stops for THIS component.
        // But the backend continues.
    }

    close() {
        this.dialogRef.close();
    }
}

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { TranslatePipe, TranslationService } from '../../core/i18n';
import { HeaderComponent } from '../../layout/header/header.component';

@Component({
    selector: 'app-import-report',
    standalone: true,
    imports: [CommonModule, RouterModule, TranslatePipe, HeaderComponent],
    template: `
        <div class="app-container">
            <!-- Floating Ambient Orbs -->
            <div class="floating-orb floating-orb--primary"></div>
            <div class="floating-orb floating-orb--accent"></div>
            <div class="floating-orb floating-orb--secondary"></div>

            <app-header></app-header>

            <main class="main-content">
                <div class="import-report-page">
                    <div class="report-header">
                        <button class="back-btn" (click)="goBack()">
                            <span class="material-symbols-outlined">arrow_back</span>
                            {{ 'common.back' | translate }}
                        </button>
                        <h1>{{ 'importReport.title' | translate }}</h1>
                    </div>

                    @if (notification()) {
                        <div class="report-content">
                            <!-- Summary Card -->
                            <div class="summary-card">
                                <div class="summary-item success">
                                    <span class="material-symbols-outlined">check_circle</span>
                                    <div class="summary-details">
                                        <span class="summary-value">{{ notification()!.data?.count || 0 }}</span>
                                        <span class="summary-label">{{ 'importReport.itemsImported' | translate }}</span>
                                    </div>
                                </div>
                                
                                @if (notification()!.data?.skipped > 0) {
                                    <div class="summary-item warning">
                                        <span class="material-symbols-outlined">warning</span>
                                        <div class="summary-details">
                                            <span class="summary-value">{{ notification()!.data?.skipped }}</span>
                                            <span class="summary-label">{{ 'importReport.itemsSkipped' | translate }}</span>
                                        </div>
                                    </div>
                                }
                            </div>

                            <!-- Mode Info -->
                            <div class="info-card">
                                <span class="material-symbols-outlined">info</span>
                                <p>{{ 'importReport.modeInfo' | translate:{ mode: getTranslatedMode() } }}</p>
                            </div>

                            <!-- Skipped Items List -->
                            @if (notification()!.data?.failedItems?.length > 0) {
                                <div class="skipped-section">
                                    <h2>{{ 'importReport.skippedItemsTitle' | translate }}</h2>
                                    <p class="section-desc">{{ 'importReport.skippedItemsDesc' | translate }}</p>
                                    <ul class="skipped-list">
                                        @for (item of notification()!.data!.failedItems; track item) {
                                            <li>
                                                <span class="material-symbols-outlined">movie</span>
                                                {{ item }}
                                            </li>
                                        }
                                    </ul>
                                </div>
                            }

                            <!-- Timestamp -->
                            <div class="timestamp">
                                {{ 'importReport.completedAt' | translate }}: {{ formatDate(notification()!.createdAt) }}
                            </div>
                        </div>
                    } @else {
                        <div class="not-found">
                            <span class="material-symbols-outlined">search_off</span>
                            <p>{{ 'importReport.notFound' | translate }}</p>
                            <button class="primary-btn" routerLink="/dashboard">
                                {{ 'importReport.goToDashboard' | translate }}
                            </button>
                        </div>
                    }
                </div>
            </main>
        </div>
    `,
    styles: [`
        .app-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: var(--color-background);
            color: var(--color-text-main);
            position: relative;
            overflow-x: hidden;
        }

        .app-container::before {
            content: '';
            position: fixed;
            inset: 0;
            background:
                radial-gradient(ellipse 80% 50% at 20% 40%, rgba(0, 224, 84, 0.04) 0%, transparent 50%),
                radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 97, 255, 0.03) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }

        .floating-orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.15;
            pointer-events: none;
            z-index: 0;
        }

        .floating-orb--primary {
            width: 500px;
            height: 500px;
            background: #00E054;
            top: -10%;
            right: -10%;
            animation: orb-float-1 25s ease-in-out infinite;
        }

        .floating-orb--accent {
            width: 400px;
            height: 400px;
            background: #7b61ff;
            bottom: 10%;
            left: -10%;
            animation: orb-float-2 30s ease-in-out infinite;
        }

        .floating-orb--secondary {
            width: 350px;
            height: 350px;
            background: #FF8000;
            top: 50%;
            left: 30%;
            animation: orb-float-1 28s ease-in-out infinite reverse;
        }

        @keyframes orb-float-1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-20px, 20px) scale(1.05); }
        }

        @keyframes orb-float-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(15px, -15px) scale(0.95); }
        }

        .import-report-page {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
            min-height: calc(100vh - 80px);
        }

        .report-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;

            h1 {
                font-size: 24px;
                font-weight: 600;
                color: #fff;
                margin: 0;
            }
        }

        .back-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            color: #fff;
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .material-symbols-outlined {
                font-size: 20px;
            }
        }

        .report-content {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .summary-card {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px 24px;
            flex: 1;
            min-width: 200px;

            .material-symbols-outlined {
                font-size: 40px;
            }

            &.success {
                border-left: 4px solid #00E054;
                .material-symbols-outlined { color: #00E054; }
            }

            &.warning {
                border-left: 4px solid #ffb800;
                .material-symbols-outlined { color: #ffb800; }
            }
        }

        .summary-details {
            display: flex;
            flex-direction: column;
        }

        .summary-value {
            font-size: 32px;
            font-weight: 700;
            color: #fff;
        }

        .summary-label {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
        }

        .info-card {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(0, 224, 84, 0.1);
            border: 1px solid rgba(0, 224, 84, 0.2);
            border-radius: 12px;
            padding: 16px 20px;
            color: rgba(255, 255, 255, 0.8);

            .material-symbols-outlined {
                color: #00E054;
                font-size: 24px;
            }

            p {
                margin: 0;
                font-size: 14px;
            }
        }

        .skipped-section {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 20px 24px;

            h2 {
                font-size: 18px;
                font-weight: 600;
                color: #fff;
                margin: 0 0 8px 0;
            }

            .section-desc {
                font-size: 14px;
                color: rgba(255, 255, 255, 0.5);
                margin: 0 0 16px 0;
            }
        }

        .skipped-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;

            li {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: rgba(255, 184, 0, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;

                .material-symbols-outlined {
                    color: #ffb800;
                    font-size: 20px;
                }
            }
        }

        .timestamp {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.4);
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .not-found {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 64px 24px;
            text-align: center;

            .material-symbols-outlined {
                font-size: 64px;
                color: rgba(255, 255, 255, 0.3);
            }

            p {
                color: rgba(255, 255, 255, 0.6);
                font-size: 16px;
                margin: 0;
            }
        }

        .primary-btn {
            background: #00E054;
            color: #000;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
                background: #00c94a;
            }
        }
    `]
})
export class ImportReportComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private socketService = inject(SocketService);
    private translationService = inject(TranslationService);

    notificationId = signal<string | null>(null);

    notification = computed(() => {
        const id = this.notificationId();
        if (!id) return null;
        return this.socketService.notifications().find(n => n.id === id) || null;
    });

    ngOnInit(): void {
        this.notificationId.set(this.route.snapshot.paramMap.get('id'));
    }

    goBack(): void {
        this.router.navigate(['/dashboard']);
    }

    getTranslatedMode(): string {
        const mode = this.notification()?.data?.mode || 'watch-history';
        return this.translationService.t(`notifications.modes.${mode}`);
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
}

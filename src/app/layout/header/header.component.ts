import { Component, inject, signal, Output, EventEmitter, HostListener, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService, SupportedLanguage } from '../../core/services/language.service';
import { MoodWidgetComponent } from '../../shared/components/mood-widget/mood-widget.component';
import { TranslatePipe, TranslationService } from '../../core/i18n';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, MoodWidgetComponent, TranslatePipe],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    router = inject(Router);
    socketService = inject(SocketService);
    authService = inject(AuthService);
    languageService = inject(LanguageService);
    elementRef = inject(ElementRef);
    private translationService = inject(TranslationService);
    user = this.authService.user;

    currentLanguage = computed(() => this.languageService.language());

    searchQuery = signal<string>('');
    showNotificationMenu = signal(false);
    showProfileMenu = signal(false);

    @Output() logClick = new EventEmitter<void>();

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const isClickInside = this.elementRef.nativeElement.contains(target);

        if (!isClickInside) {
            this.showNotificationMenu.set(false);
            this.showProfileMenu.set(false);
        }
    }

    onSearch(): void {
        const query = this.searchQuery();
        if (query.trim()) {
            this.router.navigate(['/search'], { queryParams: { q: query } });
        }
    }

    onLogClick(): void {
        this.logClick.emit();
    }

    toggleNotificationMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.showProfileMenu.set(false);
        this.showNotificationMenu.update(v => !v);
        if (this.showNotificationMenu()) {
            this.socketService.markAllAsRead();
        }
    }

    closeNotificationMenu(): void {
        this.showNotificationMenu.set(false);
    }

    toggleProfileMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.showNotificationMenu.set(false);
        this.showProfileMenu.update(v => !v);
    }

    closeProfileMenu(): void {
        this.showProfileMenu.set(false);
    }

    onLogout(): void {
        this.authService.logout();
        this.closeProfileMenu();
    }

    navigateToUser(username: string): void {
        this.router.navigate(['/profile', username]);
        this.closeNotificationMenu();
    }

    toggleLanguage(): void {
        this.languageService.toggleLanguage();
    }

    formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) {
            return this.translationService.t('common.justNow');
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            if (minutes === 1) return this.translationService.t('common.minuteAgo');
            return this.translationService.t('common.minutesAgo', { count: minutes });
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            if (hours === 1) return this.translationService.t('common.hourAgo');
            return this.translationService.t('common.hoursAgo', { count: hours });
        }

        const days = Math.floor(hours / 24);
        if (days < 7) {
            if (days === 1) return this.translationService.t('common.dayAgo');
            return this.translationService.t('common.daysAgo', { count: days });
        }

        const weeks = Math.floor(days / 7);
        if (weeks === 1) return this.translationService.t('common.weekAgo');
        return this.translationService.t('common.weeksAgo', { count: weeks });
    }

    clearAllNotifications(): void {
        this.socketService.clearAllNotifications();
    }
}

import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../../core/services/socket.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    router = inject(Router);
    socketService = inject(SocketService);

    searchQuery = signal<string>('');
    showNotificationMenu = signal(false);

    @Output() logClick = new EventEmitter<void>();

    onSearch(): void {
        const query = this.searchQuery();
        if (query.trim()) {
            this.router.navigate(['/search'], { queryParams: { q: query } });
        }
    }

    onLogClick(): void {
        this.logClick.emit();
    }

    toggleNotificationMenu(): void {
        this.showNotificationMenu.update(v => !v);
        if (this.showNotificationMenu()) {
            this.socketService.markAllAsRead();
        }
    }

    closeNotificationMenu(): void {
        this.showNotificationMenu.set(false);
    }

    navigateToUser(username: string): void {
        this.router.navigate(['/profile', username]);
        this.closeNotificationMenu();
    }
}

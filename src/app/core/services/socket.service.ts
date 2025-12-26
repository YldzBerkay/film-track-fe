import { Injectable, signal, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

export interface Notification {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'mention';
    message: string;
    fromUser: {
        id: string;
        username: string;
        nickname: string;
    };
    createdAt: string;
    read?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: Socket | null = null;
    private authService = inject(AuthService);

    // Signals for reactive state
    notifications = signal<Notification[]>([]);
    unreadCount = signal<number>(0);
    isConnected = signal<boolean>(false);

    /**
     * Connect to WebSocket server
     */
    connect(): void {
        const token = this.authService.getAccessToken();
        if (!token) {
            console.log('No auth token, skipping socket connection');
            return;
        }

        if (this.socket?.connected) {
            console.log('Socket already connected');
            return;
        }

        this.socket = io('http://localhost:3000', {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
            this.isConnected.set(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.isConnected.set(false);
        });

        this.socket.on('notification', (data: Notification) => {
            console.log('Received notification:', data);
            // Add to notifications list
            this.notifications.update(current => [data, ...current]);
            this.unreadCount.update(count => count + 1);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected.set(false);
        }
    }

    /**
     * Get the latest notification (for toast display)
     */
    getLatestNotification(): Notification | null {
        const all = this.notifications();
        return all.length > 0 ? all[0] : null;
    }

    /**
     * Clear a notification from the list
     */
    clearNotification(id: string): void {
        this.notifications.update(current =>
            current.filter(n => n.id !== id)
        );
    }

    /**
     * Mark all as read
     */
    markAllAsRead(): void {
        this.unreadCount.set(0);
    }
}

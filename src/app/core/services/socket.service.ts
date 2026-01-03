import { Injectable, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

export interface Notification {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'mention' | 'new_episode';
    message: string;
    fromUser: {
        id: string;
        username: string;
        name: string;
    };
    createdAt: string;
    read?: boolean;
    data?: any;
}

interface NotificationsResponse {
    success: boolean;
    data: {
        notifications: Notification[];
        unreadCount: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: Socket | null = null;
    private authService = inject(AuthService);
    private http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api/notifications';

    // Signals for reactive state
    notifications = signal<Notification[]>([]);
    unreadCount = signal<number>(0);
    isConnected = signal<boolean>(false);
    newNotification = signal<Notification | null>(null); // For toast display

    /**
     * Connect to WebSocket server and load existing notifications
     */
    connect(): void {
        const token = this.authService.getAccessToken();
        if (!token) {
            console.log('No auth token, skipping socket connection');
            return;
        }

        // Load existing notifications from API
        this.loadNotifications();

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
            // Signal for toast display (only real-time notifications)
            this.newNotification.set(data);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    /**
     * Load notifications from API
     */
    private loadNotifications(): void {
        this.http.get<NotificationsResponse>(this.apiUrl).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.notifications.set(response.data.notifications);
                    this.unreadCount.set(response.data.unreadCount);
                }
            },
            error: (err) => console.error('Failed to load notifications:', err)
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
     * Delete a notification
     */
    deleteNotification(id: string): void {
        this.http.delete(`${this.apiUrl}/${id}`).subscribe({
            next: () => {
                this.notifications.update(current =>
                    current.filter(n => n.id !== id)
                );
            },
            error: (err) => console.error('Failed to delete notification:', err)
        });
    }

    /**
     * Mark all as read (calls backend API)
     */
    markAllAsRead(): void {
        this.http.post(`${this.apiUrl}/read`, {}).subscribe({
            next: () => {
                this.unreadCount.set(0);
                this.notifications.update(current =>
                    current.map(n => ({ ...n, read: true }))
                );
            },
            error: (err) => console.error('Failed to mark as read:', err)
        });
    }

    /**
     * Clear all notifications (calls backend API)
     */
    clearAllNotifications(): void {
        this.http.delete(`${this.apiUrl}/all`).subscribe({
            next: () => {
                this.notifications.set([]);
                this.unreadCount.set(0);
            },
            error: (err) => console.error('Failed to clear notifications:', err)
        });
    }

    /**
     * Listen to import progress
     */
    listenToImportProgress(): Observable<{ percent: number; item: string; status: string; error?: string }> {
        return new Observable(observer => {
            if (!this.socket) {
                // Try to connect if not connected
                this.connect();
                // If still not connected (async), we might miss events? 
                // connect() is sync logic mostly.
            }

            // Ensure socket is ready
            if (!this.socket) {
                // Fallback if connect() failed or no token
                observer.error('Socket not available');
                return;
            }

            this.socket.on('import:progress', (data) => observer.next(data));
            this.socket.on('import:error', (data) => observer.error(data));

            return () => {
                // Do not disconnect socket, just remove listeners if needed specific to this obs?
                // this.socket?.off('import:progress'); 
                // Removing listener globally might affect other components? 
                // Angular components usually specific. Safe to remove.
                this.socket?.off('import:progress');
                this.socket?.off('import:error');
            };
        });
    }
}

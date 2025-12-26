import { Component, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService, Notification } from '../../../core/services/socket.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (currentToast()) {
      <div class="toast-container">
        <div class="toast" [class]="'toast--' + currentToast()!.type">
          <div class="toast-icon">
            @switch (currentToast()!.type) {
              @case ('follow') {
                <span class="material-symbols-outlined">person_add</span>
              }
              @case ('like') {
                <span class="material-symbols-outlined">favorite</span>
              }
              @default {
                <span class="material-symbols-outlined">notifications</span>
              }
            }
          </div>
          <div class="toast-content">
            <p class="toast-message">{{ currentToast()!.message }}</p>
            <span class="toast-time">Just now</span>
          </div>
          <button class="toast-close" (click)="dismissToast()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: rgba(20, 24, 28, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      min-width: 320px;
      max-width: 400px;
    }

    .toast--follow {
      border-left: 3px solid #00E054;
    }

    .toast--like {
      border-left: 3px solid #ff6b6b;
    }

    .toast-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(0, 224, 84, 0.15);

      .material-symbols-outlined {
        font-size: 22px;
        color: #00E054;
      }
    }

    .toast--like .toast-icon {
      background: rgba(255, 107, 107, 0.15);
      
      .material-symbols-outlined {
        color: #ff6b6b;
      }
    }

    .toast-content {
      flex: 1;
    }

    .toast-message {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      line-height: 1.4;
    }

    .toast-time {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .toast-close {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.5);
      transition: color 0.2s;

      &:hover {
        color: #fff;
      }

      .material-symbols-outlined {
        font-size: 20px;
      }
    }
  `]
})
export class ToastComponent {
  private socketService = inject(SocketService);

  currentToast = signal<Notification | null>(null);
  private toastTimeout: any;

  constructor() {
    // React to NEW real-time notifications only (not ones loaded from DB)
    effect(() => {
      const newNotification = this.socketService.newNotification();
      if (newNotification) {
        this.showToast(newNotification);
      }
    });
  }

  showToast(notification: Notification): void {
    this.currentToast.set(notification);

    // Auto-dismiss after 5 seconds
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.dismissToast();
    }, 5000);
  }

  dismissToast(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.currentToast.set(null);
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { SocketService } from './core/services/socket.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('cinetrack-temp');

  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Connect to WebSocket if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.socketService.connect();
    }

    // Subscribe to auth changes (for login/logout)
    // This is a simple approach; could be improved with proper auth state management
  }
}

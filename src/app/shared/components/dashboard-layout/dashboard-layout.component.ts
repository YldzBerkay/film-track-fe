import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../layout/header/header.component';
import { TranslatePipe } from '../../../core/i18n';

@Component({
    selector: 'app-dashboard-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, HeaderComponent, TranslatePipe],
    templateUrl: './dashboard-layout.component.html',
    styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent {
    @Input() activeNav: string = 'dashboard';

    private router = inject(Router);

    isActive(route: string): boolean {
        return this.activeNav === route || this.router.url.startsWith('/' + route);
    }
}

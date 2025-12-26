import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
    router = inject(Router);

    searchQuery = signal<string>('');

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
}

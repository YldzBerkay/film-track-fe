import {
    Component,
    ChangeDetectionStrategy,
    input,
    signal,
    ViewChild,
    ElementRef,
    effect,
    HostListener,
    ContentChild,
    TemplateRef,
    AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-carousel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './app-carousel.component.html',
    styleUrl: './app-carousel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCarouselComponent<T> implements AfterViewInit {
    /** Array of items to display in the carousel */
    items = input.required<T[]>();

    /** Loading state to show skeleton/spinner */
    loading = input<boolean>(false);

    /** Amount to scroll on button click (in pixels) */
    scrollAmount = input<number>(300);

    /** Optional empty state message */
    emptyMessage = input<string>('');

    /** Template ref for custom item rendering */
    @ContentChild('itemTemplate') itemTemplate?: TemplateRef<{ $implicit: T; index: number }>;

    @ViewChild('container') container!: ElementRef<HTMLDivElement>;

    /** Whether the carousel content overflows and needs scroll buttons */
    isScrollable = signal(false);

    private scrollableEffect = effect(() => {
        // Track items changes to re-check scrollability
        this.items();
        setTimeout(() => this.updateScrollableStatus(), 100);
    });

    ngAfterViewInit(): void {
        setTimeout(() => this.updateScrollableStatus(), 500);
    }

    @HostListener('window:resize')
    onResize(): void {
        this.updateScrollableStatus();
    }

    scroll(direction: 'left' | 'right'): void {
        if (!this.container?.nativeElement) return;

        const container = this.container.nativeElement;
        const amount = this.scrollAmount();

        container.scrollBy({
            left: direction === 'left' ? -amount : amount,
            behavior: 'smooth'
        });
    }

    private updateScrollableStatus(): void {
        if (!this.container?.nativeElement) return;

        const el = this.container.nativeElement;
        this.isScrollable.set(el.scrollWidth > el.clientWidth);
    }
}

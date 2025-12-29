import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'timeAgo',
    standalone: true
})
export class TimeAgoPipe implements PipeTransform {

    transform(value: string | Date | undefined): string {
        if (!value) return '';

        const date = new Date(value);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) {
            return 'just now';
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h`;
        }

        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days}d`;
        }

        const weeks = Math.floor(days / 7);
        if (weeks < 52) {
            return `${weeks}w`;
        }

        return `${Math.floor(weeks / 52)}y`;
    }
}

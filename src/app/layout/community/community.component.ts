import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Activity {
    user: {
        name: string;
        username: string;
        avatar: string;
    };
    action: 'watched' | 'reviewed' | 'rated' | 'added';
    media: {
        title: string;
        year: number;
        poster: string;
        type: 'movie' | 'tv';
    };
    rating?: number;
    reviewSnippet?: string;
    timeAgo: string;
}

interface TrendingItem {
    title: string;
    year: number;
    poster: string;
    rating: number;
    watchCount: number;
    type: 'movie' | 'tv';
}

interface TopReviewer {
    name: string;
    username: string;
    avatar: string;
    reviewCount: number;
    followers: number;
    badge: 'gold' | 'silver' | 'bronze';
}

@Component({
    selector: 'app-community',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './community.component.html',
    styleUrl: './community.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommunityComponent {
    readonly activities: Activity[] = [
        {
            user: { name: 'Sarah Chen', username: 'sarahwatches', avatar: 'https://i.pravatar.cc/150?img=1' },
            action: 'reviewed',
            media: { title: 'Dune: Part Two', year: 2024, poster: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', type: 'movie' },
            rating: 5,
            reviewSnippet: 'A visual masterpiece that surpasses the original...',
            timeAgo: '2 hours ago'
        },
        {
            user: { name: 'Marcus Johnson', username: 'marcusj', avatar: 'https://i.pravatar.cc/150?img=3' },
            action: 'watched',
            media: { title: 'The Bear', year: 2022, poster: 'https://image.tmdb.org/t/p/w200/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg', type: 'tv' },
            timeAgo: '3 hours ago'
        },
        {
            user: { name: 'Emma Wilson', username: 'emmaw', avatar: 'https://i.pravatar.cc/150?img=5' },
            action: 'rated',
            media: { title: 'Oppenheimer', year: 2023, poster: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', type: 'movie' },
            rating: 4.5,
            timeAgo: '5 hours ago'
        },
        {
            user: { name: 'Alex Rivera', username: 'alexr', avatar: 'https://i.pravatar.cc/150?img=8' },
            action: 'added',
            media: { title: 'Severance', year: 2022, poster: 'https://image.tmdb.org/t/p/w200/lFf6LLrQjYldcZItzOkGmMMigP7.jpg', type: 'tv' },
            timeAgo: '6 hours ago'
        },
        {
            user: { name: 'Jordan Lee', username: 'jordanlee', avatar: 'https://i.pravatar.cc/150?img=12' },
            action: 'reviewed',
            media: { title: 'Poor Things', year: 2023, poster: 'https://image.tmdb.org/t/p/w200/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg', type: 'movie' },
            rating: 4,
            reviewSnippet: 'Emma Stone delivers a career-defining performance...',
            timeAgo: '8 hours ago'
        }
    ];

    readonly trending: TrendingItem[] = [
        { title: 'Dune: Part Two', year: 2024, poster: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', rating: 4.7, watchCount: 12453, type: 'movie' },
        { title: 'Shogun', year: 2024, poster: 'https://image.tmdb.org/t/p/w200/7O4iVfOMQmdCSxhOg1W6jzBjDqE.jpg', rating: 4.8, watchCount: 8932, type: 'tv' },
        { title: 'Poor Things', year: 2023, poster: 'https://image.tmdb.org/t/p/w200/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg', rating: 4.5, watchCount: 7821, type: 'movie' },
        { title: 'The Bear', year: 2022, poster: 'https://image.tmdb.org/t/p/w200/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg', rating: 4.6, watchCount: 15234, type: 'tv' },
        { title: 'Oppenheimer', year: 2023, poster: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', rating: 4.4, watchCount: 21543, type: 'movie' }
    ];

    readonly topReviewers: TopReviewer[] = [
        { name: 'Cinema Critic', username: 'cinemacritic', avatar: 'https://i.pravatar.cc/150?img=20', reviewCount: 847, followers: 12500, badge: 'gold' },
        { name: 'Film Buff Daily', username: 'filmbuffdaily', avatar: 'https://i.pravatar.cc/150?img=25', reviewCount: 623, followers: 8900, badge: 'silver' },
        { name: 'Movie Maven', username: 'moviemaven', avatar: 'https://i.pravatar.cc/150?img=30', reviewCount: 512, followers: 6700, badge: 'bronze' }
    ];

    readonly stats = [
        { value: '125K+', label: 'Active Members' },
        { value: '2.5M+', label: 'Reviews Written' },
        { value: '50K+', label: 'Lists Created' },
        { value: '10M+', label: 'Movies Tracked' }
    ];

    getActionText(activity: Activity): string {
        switch (activity.action) {
            case 'watched': return 'watched';
            case 'reviewed': return 'reviewed';
            case 'rated': return 'rated';
            case 'added': return 'added to watchlist';
            default: return '';
        }
    }

    getStars(rating: number): number[] {
        const stars: number[] = [];
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;

        for (let i = 0; i < fullStars; i++) stars.push(1);
        if (hasHalf) stars.push(0.5);
        while (stars.length < 5) stars.push(0);

        return stars;
    }

    formatNumber(num: number): string {
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
}

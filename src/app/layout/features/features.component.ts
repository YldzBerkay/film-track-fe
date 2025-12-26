import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Feature {
    icon: string;
    title: string;
    description: string;
    details: string[];
}

interface Stat {
    value: string;
    label: string;
}

@Component({
    selector: 'app-features',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './features.component.html',
    styleUrl: './features.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturesComponent {
    readonly stats: Stat[] = [
        { value: '10K+', label: 'Movies Tracked' },
        { value: '5K+', label: 'Active Users' },
        { value: '50K+', label: 'Reviews Written' },
        { value: '100K+', label: 'Watchlist Items' }
    ];

    readonly features: Feature[] = [
        {
            icon: 'movie',
            title: 'Track Everything',
            description: 'Log every movie and TV show you watch with detailed information.',
            details: [
                'Mark as watched, watching, or want to watch',
                'Auto-fetch movie details from TMDB',
                'Track watch dates and rewatch count',
                'Add personal notes to each entry'
            ]
        },
        {
            icon: 'rate_review',
            title: 'Write Reviews',
            description: 'Share your thoughts with authentic, detailed reviews.',
            details: [
                '5-star rating system',
                'Rich text formatting',
                'Spoiler tags for sensitive content',
                'Public or private reviews'
            ]
        },
        {
            icon: 'playlist_add',
            title: 'Create Watchlists',
            description: 'Organize your viewing with custom lists and collections.',
            details: [
                'Unlimited custom lists',
                'Share lists with friends',
                'Import from other services',
                'Smart recommendations'
            ]
        },
        {
            icon: 'insights',
            title: 'Viewing Insights',
            description: 'Discover patterns in your viewing habits with detailed stats.',
            details: [
                'Genre breakdown charts',
                'Most watched actors & directors',
                'Yearly viewing statistics',
                'Rating distribution analysis'
            ]
        },
        {
            icon: 'people',
            title: 'Social Features',
            description: 'Connect with friends and discover what they\'re watching.',
            details: [
                'Follow friends and critics',
                'Activity feed',
                'Discussion threads',
                'Share on social media'
            ]
        },
        {
            icon: 'notifications_active',
            title: 'Smart Notifications',
            description: 'Never miss a new release or friend activity.',
            details: [
                'New episode alerts',
                'Friend activity updates',
                'Recommendation notifications',
                'Customizable preferences'
            ]
        }
    ];

    // Billing toggle state
    isAnnual = true;

    readonly plans: Plan[] = [
        {
            name: 'Free',
            monthlyPrice: 0,
            annualPrice: 0,
            description: 'Perfect for casual movie lovers getting started.',
            features: [
                { text: 'Track unlimited movies & shows', included: true },
                { text: 'Write reviews & ratings', included: true },
                { text: 'Create up to 5 watchlists', included: true },
                { text: 'Follow up to 50 friends', included: true },
                { text: 'Basic viewing statistics', included: true },
                { text: 'Community badges', included: false },
                { text: 'AI-powered recommendations', included: false },
                { text: 'Advanced Mood Chart', included: false }
            ],
            buttonText: 'Get Started',
            buttonLink: '/register',
            highlighted: false
        },
        {
            name: 'Pro',
            monthlyPrice: 1.99,  // $1.99/month = $23.88/year
            annualPrice: 19,     // $19/year = ~20% savings (more than 5%)
            description: 'For dedicated cinephiles who want the full experience.',
            features: [
                { text: 'Everything in Free', included: true },
                { text: 'Unlimited watchlists', included: true },
                { text: 'Ad-free browsing', included: true },
                { text: 'Streaming service filters', included: true },
                { text: 'Advanced viewing statistics', included: true },
                { text: '5 AI recommendations / week', included: true },
                { text: 'Basic Mood Chart history', included: true },
                { text: 'Custom profile themes', included: false }
            ],
            buttonText: 'Upgrade to Pro',
            buttonLink: '/register?plan=pro',
            highlighted: true
        },
        {
            name: 'Patron',
            monthlyPrice: 4.99,  // $4.99/month = $59.88/year
            annualPrice: 49,     // $49/year = ~18% savings
            description: 'Support FilmTrack and unlock everything.',
            features: [
                { text: 'Everything in Pro', included: true },
                { text: 'Unlimited AI recommendations', included: true },
                { text: 'Full Mood Chart with history', included: true },
                { text: 'Custom poster & backdrop selection', included: true },
                { text: 'Priority support', included: true },
                { text: 'Early access to new features', included: true },
                { text: 'Patron badge on profile', included: true },
                { text: 'Support indie development', included: true }
            ],
            buttonText: 'Become a Patron',
            buttonLink: '/register?plan=patron',
            highlighted: false
        }
    ];

    toggleBilling(): void {
        this.isAnnual = !this.isAnnual;
    }

    getPrice(plan: Plan): string {
        if (plan.monthlyPrice === 0) return '$0';
        return this.isAnnual
            ? `$${plan.annualPrice}`
            : `$${plan.monthlyPrice.toFixed(2)}`;
    }

    getPeriod(plan: Plan): string {
        if (plan.monthlyPrice === 0) return 'forever';
        return this.isAnnual ? 'per year' : 'per month';
    }

    getSavings(plan: Plan): number {
        if (plan.monthlyPrice === 0) return 0;
        const yearlyFromMonthly = plan.monthlyPrice * 12;
        return Math.round((1 - plan.annualPrice / yearlyFromMonthly) * 100);
    }
}

interface Plan {
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    description: string;
    features: { text: string; included: boolean }[];
    buttonText: string;
    buttonLink: string;
    highlighted: boolean;
}

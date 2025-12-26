import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface Review {
  title: string;
  rating: number;
  reviewText: string;
  posterUrl: string;
  alt: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  constructor(private router: Router) {}
  readonly reviews: Review[] = [
    {
      title: 'Dune: Part Two',
      rating: 5,
      reviewText: '"A visual masterpiece that surpasses the first. The sound design alone is worth the ticket."',
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAgYedTXfygXm7ao2p_wKZQg6ez7ktyBJZtyCY_qtGSpSp1J8pEUB24wqkftxKOi2tGQ2j4eU1e26i8YODE0RaT4Wil3W5kp_zW1m5bxaCSWaRnUlj9osEv3qzpMv0s1T8pSqH2pAJ_s_huaLwMIZ8dngMd0ivMypzyMQ0jwcim3l3RpCwEumy8kNAfXbGC4bcNjs05kz7mv6dWdofyradg568z9u5ic64Sj1NCfql_UWVhid6zN-qtvXDV4ki8fxegpMvTyGBZf0y2',
      alt: 'Dune Part Two movie poster'
    },
    {
      title: 'The Bear',
      rating: 4.5,
      reviewText: '"Stressful, chaotic, and absolutely beautiful. Jeremy Allen White is phenomenal."',
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlc9GolB5xDMIPYTtQvBeNwJ0wPs4sLtsCPf4KZ6YRiRh8mq3pCmroa9qtKslHnhXPcqlBUKiozTRSeMDwyMtmu1UIMvGsERjti_NI7Qrxz5dzSYd8O8abCXmLgfYRHdC675_sHJAc7T4anEntXwHN-3RsFzacjcS2CFC4ewGlYKIsYjLRLuqz-9g2-ih0u9TyzqFl8XbqnHMrJVg-H0tuJQ8jAxu52tXw9zYoh3J6-T0ogXld4XhNg8b1vKlMDkbQv4pLXnyvr-eY',
      alt: 'Abstract cinematic kitchen scene representing The Bear'
    },
    {
      title: 'Succession',
      rating: 5,
      reviewText: '"Shakespearean drama in modern corporate suits. Best writing on TV."',
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCamhh3G-8UgAbcDjvXl1X4Z9D1rrL6azFnxB1b5j4f-m0RrcKzcdfNUmt5c7kTa2nulchoY5QYkmi1PUUTU-AnDn-gemWV74WmTWsxu4vxMrzo0QfOh4tqoCV9a6qEqeBcOCEZnuZG_YxBKsSfr53DWScI8YGxuGXx6yccgfYdDFQ2usTNTzBIcVSGzTODmG2u8xqV7uma7y0vDmCDXs35DlAdqxa_7aQfOV_FMU6YmpsVVmYxfk4sBR6ko4NeKkfkesBiOHJ04sHT',
      alt: 'Corporate skyscraper scene representing Succession'
    },
    {
      title: 'Oppenheimer',
      rating: 4,
      reviewText: '"Incredible performance by Cillian Murphy. The pacing was a bit slow in the middle."',
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlT3PlmC8CMIp-12jDp0QgaWEQgh6qcujvYkOPcNWILyugV3ByoBBRTosBEFE5zeeumJuLpKk866WmR_FBz60JWyaErcq5NM8G8p0Jv9WQb1ljHVoWcA6W-CMZRu6j3DDgkMIX8OGqt0h7GeRN6NDXzi-Dqiqf-X9EK8tyVF5dmjjklBgfnHtA0NxtmQ6_AH66FawbAiliKzRHhBoPsXum4HcUi0ZOTbA18Nj11vnXITZGTE4xM-OC_ki-r9UHAfE_wcCacQAcawia',
      alt: 'Explosion cloud representing Oppenheimer'
    },
    {
      title: 'Blade Runner 2049',
      rating: 5,
      reviewText: '"The cinematography is unmatched. Every frame is a painting."',
      posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIKbIa0rMLgovjGAWzLRt2r_853EB2wSkg4A6YkNfFtkmJscML_dlTNbrRrAfkELURw2EZ7SUC1qDYVd4s9FnQ_bt76xB-TFzCVFYBD1Ihkm78zquMQYZICu-jiuYXDa0ct149Arnss2ai-h-gaiNuS5XZceoYyHNNvVV7ycxh4jEHqwczCmVzuYvrbwNW10lUNhJVulXL8cO_Zkk1HHvzmYITNEodf96D8KiPlakmugTomKfj6WuV7TxpkKDGxIlin1uUvv9JyzH9',
      alt: 'Neon futuristic city representing Blade Runner'
    }
  ];

  readonly features = [
    {
      icon: 'list',
      title: 'Curate your Watchlist',
      description: 'Keep track of every movie you want to see. Never forget a title recommended by a friend again.'
    },
    {
      icon: 'rate_review',
      title: 'Share Authentic Reviews',
      description: 'Write detailed reviews with rich text formatting. Rate movies on a 5-star scale to share your opinion.'
    },
    {
      icon: 'pie_chart',
      title: 'Analyze your Taste',
      description: 'Get visual insights into your viewing habits. Discover your most watched genres, actors, and directors.'
    }
  ];

  getStars(rating: number): number[] {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars: number[] = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(1);
    }
    
    if (hasHalfStar) {
      stars.push(0.5);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(0);
    }
    
    return stars;
  }

  onGetStarted(): void {
    // Navigate to register page
    window.location.href = '/register';
  }

  onGoogleSignIn(): void {
    // TODO: Implement Google OAuth
    // For now, navigate to login
    window.location.href = '/login';
  }
}


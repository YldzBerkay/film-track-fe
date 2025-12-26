import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MoodService, MoodVector, MoodTrend, GenreCorrelation } from '../../core/services/mood.service';
import { HeaderComponent } from '../../layout/header/header.component';

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule, BaseChartDirective, HeaderComponent],
    templateUrl: './analytics.component.html',
    styleUrl: './analytics.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsComponent implements OnInit {
    moodService = inject(MoodService);

    // Signals for data
    evolutionData = signal<Record<keyof MoodVector, MoodTrend[]> | null>(null);
    patternsData = signal<Record<string, number[]> | null>(null);
    correlationsData = signal<GenreCorrelation[] | null>(null);

    isLoading = signal(true);

    // Selected view options
    selectedEvolutionMetrics = signal<(keyof MoodVector)[]>(['joy', 'melancholy', 'adrenaline']);
    availableMetrics: (keyof MoodVector)[] = [
        'adrenaline', 'melancholy', 'joy', 'tension', 'intellect',
        'romance', 'wonder', 'nostalgia', 'darkness', 'inspiration'
    ];

    // Chart Configs
    evolutionChartType: ChartType = 'line';
    patternsChartType: ChartType = 'line';
    correlationsChartType: ChartType = 'bar';

    evolutionChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: { tension: 0.4 }, // Smooth curves
            point: { radius: 3, hoverRadius: 6 }
        },
        plugins: {
            legend: { labels: { color: '#e5e7eb' } }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#9ca3af' }
            },
            x: {
                grid: { color: 'rgba(255,255,255,0.1)' },
                ticks: { color: '#9ca3af' }
            }
        }
    };

    patternsChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: { line: { tension: 0.3 } },
        plugins: { legend: { labels: { color: '#e5e7eb' } } },
        scales: {
            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } }
        }
    };

    correlationsChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
        }
    };

    // Chart Data Signals (Computed manually or via effect, but here initialized in subscribe)
    evolutionChartData = signal<ChartConfiguration['data']>({ datasets: [], labels: [] });
    patternsChartData = signal<ChartConfiguration['data']>({ datasets: [], labels: [] });
    correlationsChartData = signal<ChartConfiguration['data']>({ datasets: [], labels: [] });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);

        // ForkJoin would be better, but doing sequential for simplicity or separate calls
        // Actually separate calls allow partial loading.

        this.moodService.getMoodEvolution(30).subscribe(res => {
            if (res.success && res.data) {
                this.evolutionData.set(res.data);
                this.updateEvolutionChart();
            }
        });

        this.moodService.getDayOfWeekPatterns().subscribe(res => {
            if (res.success && res.data) {
                this.patternsData.set(res.data);
                this.updatePatternsChart();
            }
        });

        this.moodService.getGenreCorrelations().subscribe(res => {
            if (res.success && res.data) {
                this.correlationsData.set(res.data);
                this.updateCorrelationsChart();
                this.isLoading.set(false); // Approximation of done
            }
        });
    }

    updateEvolutionChart() {
        const data = this.evolutionData();
        if (!data) return;

        const metrics = this.selectedEvolutionMetrics();
        // Assuming all have same dates
        const dates = data[metrics[0]]?.map(d => d.date) || [];

        // Formatting dates to MM/DD
        const labels = dates.map(d => {
            const date = new Date(d);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        const datasets = metrics.map(metric => ({
            data: data[metric]?.map(d => d.value) || [],
            label: metric.charAt(0).toUpperCase() + metric.slice(1),
            borderColor: this.getColorForMood(metric),
            backgroundColor: this.getColorForMood(metric, 0.2),
            fill: true
        }));

        this.evolutionChartData.set({ labels, datasets });
    }

    updatePatternsChart() {
        const data = this.patternsData();
        if (!data) return;

        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // Show top 3 varied moods or just user selected? 
        // Let's reuse selectedEvolutionMetrics for now to keep it consistent
        const metrics = this.selectedEvolutionMetrics();

        const datasets = metrics.map(metric => ({
            data: data[metric] || [],
            label: metric.charAt(0).toUpperCase() + metric.slice(1),
            borderColor: this.getColorForMood(metric),
            backgroundColor: 'transparent',
            pointBackgroundColor: this.getColorForMood(metric),
            pointRadius: 5
        }));

        this.patternsChartData.set({ labels, datasets });
    }

    updateCorrelationsChart() {
        const data = this.correlationsData();
        if (!data) return;

        // Sort by count desc, take top 6
        const topGenres = [...data].sort((a, b) => b.count - a.count).slice(0, 6);

        const labels = topGenres.map(g => g.genre);

        // For each genre, we want to show its PRIMARY mood intensity.
        // Or maybe dataset for "Joy", dataset for "Adrenaline"? 
        // Grouped bar chart needs consistent datasets.
        // Let's Create datasets for all 10 moods, but that's messy.

        // Alternative: Just plot the "Dominant Mood" value. 
        // And color the bar by the mood.
        // This requires a custom bar chart where each bar has its own color.

        // Let's try: For each genre, find the highest mood.
        const maxMoods = topGenres.map(g => {
            let maxVal = 0;
            let maxMood = '';
            Object.entries(g.dominantMoods).forEach(([mood, val]) => {
                if (val > maxVal) {
                    maxVal = val;
                    maxMood = mood;
                }
            });
            return { mood: maxMood, val: maxVal };
        });

        const datasets = [{
            data: maxMoods.map(m => m.val),
            label: 'Dominant Mood Intensity',
            backgroundColor: maxMoods.map(m => this.getColorForMood(m.mood, 0.8)),
            borderColor: maxMoods.map(m => this.getColorForMood(m.mood)),
            borderWidth: 1
        }];

        this.correlationsChartData.set({ labels, datasets });
    }

    toggleMetric(metric: keyof MoodVector) {
        const current = this.selectedEvolutionMetrics();
        if (current.includes(metric)) {
            if (current.length > 1) {
                this.selectedEvolutionMetrics.set(current.filter(m => m !== metric));
            }
        } else {
            if (current.length < 3) {
                this.selectedEvolutionMetrics.set([...current, metric]);
            } else {
                // Replace first
                this.selectedEvolutionMetrics.set([...current.slice(1), metric]);
            }
        }
        this.updateEvolutionChart();
        this.updatePatternsChart();
    }

    getColorForMood(mood: string, alpha: number = 1): string {
        const colors: Record<string, string> = {
            adrenaline: `rgba(255, 69, 58, ${alpha})`,   // Red
            melancholy: `rgba(94, 92, 230, ${alpha})`,   // Indigo
            joy: `rgba(255, 214, 10, ${alpha})`,         // Yellow
            tension: `rgba(255, 159, 10, ${alpha})`,     // Orange
            intellect: `rgba(100, 210, 255, ${alpha})`,  // Cyan
            romance: `rgba(255, 55, 95, ${alpha})`,      // Pink
            wonder: `rgba(191, 90, 242, ${alpha})`,      // Purple
            nostalgia: `rgba(172, 142, 104, ${alpha})`,  // Brown
            darkness: `rgba(48, 209, 88, ${alpha})`,     // Green (Matrix/Eerie) -> adjusted to Gray/Black ish? No charts need color.
            inspiration: `rgba(10, 132, 255, ${alpha})`  // Blue
        };
        // Default green for darkness override or others
        if (mood === 'darkness') return `rgba(44, 44, 46, ${alpha})`; // Dark Gray

        return colors[mood] || `rgba(255, 255, 255, ${alpha})`;
    }
}

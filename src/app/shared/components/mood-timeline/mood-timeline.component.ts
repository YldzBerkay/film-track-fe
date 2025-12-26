import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

export interface MoodTimelineEntry {
    date: string;
    mood: {
        adrenaline: number;
        melancholy: number;
        joy: number;
        tension: number;
        intellect: number;
        romance?: number;
        wonder?: number;
        nostalgia?: number;
        darkness?: number;
        inspiration?: number;
    };
    triggerMediaTitle?: string;
}

@Component({
    selector: 'app-mood-timeline',
    standalone: true,
    imports: [CommonModule, BaseChartDirective],
    templateUrl: './mood-timeline.component.html',
    styleUrl: './mood-timeline.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodTimelineComponent {
    timelineData = input<MoodTimelineEntry[]>([]);
    isLoading = input<boolean>(false);

    chartData = computed(() => {
        const data = this.timelineData();
        if (!data || data.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        const labels = data.map(entry => {
            const date = new Date(entry.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Joy',
                    data: data.map(e => e.mood.joy),
                    borderColor: '#00E054',
                    backgroundColor: 'rgba(0, 224, 84, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Adrenaline',
                    data: data.map(e => e.mood.adrenaline),
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Romance',
                    data: data.map(e => e.mood.romance || 0),
                    borderColor: '#FF69B4',
                    backgroundColor: 'rgba(255, 105, 180, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Wonder',
                    data: data.map(e => e.mood.wonder || 0),
                    borderColor: '#00CED1',
                    backgroundColor: 'rgba(0, 206, 209, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Inspiration',
                    data: data.map(e => e.mood.inspiration || 0),
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Intellect',
                    data: data.map(e => e.mood.intellect),
                    borderColor: '#7B61FF',
                    backgroundColor: 'rgba(123, 97, 255, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Tension',
                    data: data.map(e => e.mood.tension),
                    borderColor: '#FF8C00',
                    backgroundColor: 'rgba(255, 140, 0, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Darkness',
                    data: data.map(e => e.mood.darkness || 0),
                    borderColor: '#4A4A4A',
                    backgroundColor: 'rgba(74, 74, 74, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Melancholy',
                    data: data.map(e => e.mood.melancholy),
                    borderColor: '#4ECDC4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Nostalgia',
                    data: data.map(e => e.mood.nostalgia || 0),
                    borderColor: '#DEB887',
                    backgroundColor: 'rgba(222, 184, 135, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        };
    });

    chartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#9ca3af',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(20, 24, 28, 0.95)',
                titleColor: '#F1F1F1',
                bodyColor: '#F1F1F1',
                borderColor: '#00E054',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => {
                        return `${context.dataset.label}: ${context.parsed.y}%`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#9ca3af',
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                beginAtZero: true,
                max: 100,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#9ca3af',
                    stepSize: 25,
                    font: {
                        size: 11
                    }
                }
            }
        }
    };

    chartType: ChartType = 'line';
}

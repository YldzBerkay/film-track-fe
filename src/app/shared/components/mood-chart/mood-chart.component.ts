import { Component, ChangeDetectionStrategy, input, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MoodService, MoodVector } from '../../../core/services/mood.service';
import { TranslatePipe } from '../../../core/i18n';

@Component({
  selector: 'app-mood-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslatePipe],
  templateUrl: './mood-chart.component.html',
  styleUrl: './mood-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodChartComponent {
  moodData = input<MoodVector | null>(null);
  isLoading = input<boolean>(false);

  // Detect if all mood values are at default (50) - indicates insufficient data
  isDefaultMood = computed(() => {
    const data = this.moodData();
    if (!data) return true;

    const values = [
      data.adrenaline, data.melancholy, data.joy, data.tension, data.intellect,
      data.romance, data.wonder, data.nostalgia, data.darkness, data.inspiration
    ];

    // Check if all values are exactly 50 (default baseline)
    return values.every(v => v === 50);
  });

  chartData = computed(() => {
    const data = this.moodData();
    const labels = [
      'Adrenaline', 'Joy', 'Romance', 'Wonder', 'Inspiration',
      'Intellect', 'Nostalgia', 'Melancholy', 'Darkness', 'Tension'
    ];

    if (!data) {
      return {
        labels,
        datasets: [
          {
            data: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
            borderColor: '#00E054',
            backgroundColor: 'rgba(0, 224, 84, 0.2)',
            pointBackgroundColor: '#F1F1F1',
            pointBorderColor: '#00E054',
            pointHoverBackgroundColor: '#00E054',
            pointHoverBorderColor: '#F1F1F1'
          }
        ]
      };
    }

    return {
      labels,
      datasets: [
        {
          data: [
            data.adrenaline,
            data.joy,
            data.romance || 0,
            data.wonder || 0,
            data.inspiration || 0,
            data.intellect,
            data.nostalgia || 0,
            data.melancholy,
            data.darkness || 0,
            data.tension
          ],
          borderColor: '#00E054',
          backgroundColor: 'rgba(0, 224, 84, 0.2)',
          pointBackgroundColor: '#F1F1F1',
          pointBorderColor: '#00E054',
          pointHoverBackgroundColor: '#00E054',
          pointHoverBorderColor: '#F1F1F1',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  });

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(20, 24, 28, 0.9)',
        titleColor: '#F1F1F1',
        bodyColor: '#F1F1F1',
        borderColor: '#00E054',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            return `${context.label}: ${context.parsed.r}%`;
          }
        }
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 20,
          color: '#9ca3af',
          font: {
            size: 10 // Reduced tick size
          },
          backdropColor: 'transparent'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        pointLabels: {
          color: '#F1F1F1',
          font: (context) => {
            const width = context.chart.width;
            const size = width < 400 ? 10 : 14; // Dynamic font size based on width
            return {
              size: size,
              weight: 'bold'
            };
          }
        }
      }
    }
  };

  chartType: ChartType = 'radar';
}


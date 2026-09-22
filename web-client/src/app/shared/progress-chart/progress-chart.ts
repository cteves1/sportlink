import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';
import {
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// Registro explícito solo de lo que se usa: evita arrastrar todos los tipos de gráfico al bundle.
Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Legend, Tooltip);

/** Una serie del gráfico: etiqueta, valores y color base (hex o rgb). */
export interface ProgressSeries {
  label: string;
  data: number[];
  color: string;
  /** Rellena el área bajo la línea; útil para la serie principal. */
  fill?: boolean;
}

/**
 * Gráfico de líneas sobre Chart.js. La librería es imperativa, así que funciona igual de
 * bien en modo zoneless: se crea tras el primer render y se actualiza desde un `effect`.
 */
@Component({
  selector: 'app-progress-chart',
  standalone: true,
  template: `
    <div class="relative h-56 w-full sm:h-64">
      <canvas #canvas class="block h-full w-full"></canvas>
    </div>
  `,
})
export class ProgressChart implements OnDestroy {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ProgressSeries[]>();
  /** Techo del eje Y; por defecto 100 porque las series son porcentajes/puntaje. */
  readonly yMax = input(100);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart<'line'> | null = null;

  constructor() {
    afterNextRender(() => this.createChart());

    // Redibuja cuando cambian los datos (p. ej. al cambiar el rango de semanas).
    effect(() => {
      const labels = this.labels();
      const series = this.series();
      if (!this.chart) return;
      this.chart.data.labels = labels;
      this.chart.data.datasets = this.buildDatasets(series);
      this.chart.update();
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private createChart(): void {
    const context = this.canvas().nativeElement.getContext('2d');
    if (!context) return;

    this.chart = new Chart(context, {
      type: 'line',
      data: { labels: this.labels(), datasets: this.buildDatasets(this.series()) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            max: this.yMax(),
            ticks: { stepSize: 25, color: '#9ca3af', font: { size: 11 } },
            grid: { color: '#f3f4f6' },
          },
          x: {
            ticks: { color: '#9ca3af', font: { size: 11 } },
            grid: { display: false },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, color: '#4b5563', font: { size: 11 } },
          },
          tooltip: { backgroundColor: '#111827', padding: 10, displayColors: true },
        },
      },
    });
  }

  private buildDatasets(series: ProgressSeries[]) {
    return series.map((serie) => ({
      label: serie.label,
      data: serie.data,
      borderColor: serie.color,
      backgroundColor: serie.fill ? this.withAlpha(serie.color, 0.15) : serie.color,
      fill: serie.fill ?? false,
      tension: 0.35,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: serie.color,
    }));
  }

  /** Convierte un color `#rrggbb` en `rgba(...)` para el relleno translúcido del área. */
  private withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return hex;
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}

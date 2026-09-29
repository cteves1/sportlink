import { Component, computed, signal } from '@angular/core';
import {
  LucideCalendarDays,
  LucideClock,
  LucidePlay,
  LucideTrophy,
  LucideX,
} from '@lucide/angular';

type CompetitionLevel = 'Todos' | 'Nacional' | 'Regional' | 'Internacional';

interface CompetitionVideo {
  id: number;
  title: string;
  competition: string;
  date: Date;
  level: Exclude<CompetitionLevel, 'Todos'>;
  round: string;
  duration: string;
  description: string;
  url: string;
  accent: string;
}

@Component({
  selector: 'app-media',
  standalone: true,
  imports: [LucideCalendarDays, LucideClock, LucidePlay, LucideTrophy, LucideX],
  templateUrl: './media.html',
})
export class Media {
  protected readonly levels: CompetitionLevel[] = [
    'Todos',
    'Nacional',
    'Regional',
    'Internacional',
  ];
  protected readonly selectedLevel = signal<CompetitionLevel>('Todos');
  protected readonly selectedVideoId = signal<number | null>(null);

  protected readonly videos = signal<CompetitionVideo[]>([
    {
      id: 1,
      title: 'Final Sub-18 — Partido completo',
      competition: 'Copa Nacional Juvenil',
      date: new Date(2026, 8, 14),
      level: 'Nacional',
      round: 'Final',
      duration: '18:42',
      description: 'Partido decisivo con foco en la recepción corta y el ataque de tercera bola.',
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      accent: 'from-red-700 via-red-500 to-orange-400',
    },
    {
      id: 2,
      title: 'Semifinal — Mejores puntos',
      competition: 'Open Regional Metropolitano',
      date: new Date(2026, 7, 23),
      level: 'Regional',
      round: 'Semifinal',
      duration: '09:16',
      description:
        'Selección de puntos para analizar desplazamiento lateral y continuidad ofensiva.',
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      accent: 'from-brand-800 via-brand-600 to-cyan-400',
    },
    {
      id: 3,
      title: 'Cuartos de final — Partido completo',
      competition: 'Circuito Internacional Junior',
      date: new Date(2026, 6, 5),
      level: 'Internacional',
      round: 'Cuartos de final',
      duration: '22:08',
      description:
        'Encuentro internacional para revisar variantes de saque y presión sobre el revés.',
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      accent: 'from-indigo-800 via-violet-600 to-fuchsia-400',
    },
    {
      id: 4,
      title: 'Fase de grupos — Resumen técnico',
      competition: 'Campeonato Argentino',
      date: new Date(2026, 5, 18),
      level: 'Nacional',
      round: 'Fase de grupos',
      duration: '12:31',
      description:
        'Resumen de los partidos de grupo con énfasis en la apertura y el primer bloqueo.',
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      accent: 'from-amber-700 via-amber-500 to-yellow-300',
    },
    {
      id: 5,
      title: 'Final por equipos — Mejores jugadas',
      competition: 'Liga Regional de Clubes',
      date: new Date(2026, 4, 10),
      level: 'Regional',
      round: 'Final por equipos',
      duration: '07:54',
      description: 'Jugadas destacadas de la serie final y momentos clave bajo presión.',
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      accent: 'from-emerald-800 via-emerald-600 to-lime-400',
    },
    {
      id: 6,
      title: 'Debut internacional — Partido completo',
      competition: 'Youth Contender',
      date: new Date(2026, 3, 27),
      level: 'Internacional',
      round: 'Primera ronda',
      duration: '16:20',
      description:
        'Primer encuentro del cuadro principal para observar adaptación y toma de decisiones.',
      url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      accent: 'from-slate-800 via-blue-700 to-sky-400',
    },
  ]);

  protected readonly filteredVideos = computed(() => {
    const level = this.selectedLevel();
    return level === 'Todos'
      ? this.videos()
      : this.videos().filter((video) => video.level === level);
  });

  protected readonly selectedVideo = computed(() => {
    const id = this.selectedVideoId();
    return this.videos().find((video) => video.id === id) ?? null;
  });

  protected selectLevel(level: CompetitionLevel): void {
    this.selectedLevel.set(level);
  }

  protected play(videoId: number): void {
    this.selectedVideoId.set(videoId);
  }

  protected closePlayer(): void {
    this.selectedVideoId.set(null);
  }

  protected formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
}

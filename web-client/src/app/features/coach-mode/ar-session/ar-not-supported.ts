import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideCircleAlert } from '@lucide/angular';

export const AR_NOT_SUPPORTED_MESSAGE =
  'La Realidad Aumentada (WebXR) requiere Google Chrome en un dispositivo Android compatible con ARCore. ' +
  'Safari/iOS todavía no la soportan.';

/** Pantalla mostrada cuando el navegador/dispositivo no soporta `immersive-ar`. */
@Component({
  selector: 'app-ar-not-supported',
  standalone: true,
  imports: [LucideCircleAlert],
  template: `
    <div
      class="flex h-full flex-col items-center justify-center gap-4 bg-gray-900 p-8 text-center text-white"
    >
      <svg lucideCircleAlert [size]="40" class="block text-amber-400"></svg>
      <h1 class="text-lg font-semibold">Realidad Aumentada no disponible</h1>
      <p class="max-w-sm text-sm text-gray-300">{{ message() }}</p>
      <button
        type="button"
        (click)="goBack()"
        class="mt-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20"
      >
        Volver
      </button>
    </div>
  `,
})
export class ArNotSupported {
  private readonly router = inject(Router);

  readonly message = input<string>(AR_NOT_SUPPORTED_MESSAGE);

  protected goBack(): void {
    this.router.navigate(['/coach-mode']);
  }
}

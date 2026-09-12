import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['test@test.com', [Validators.required, Validators.email]],
    password: ['test', [Validators.required, Validators.minLength(4)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const result = this.authService.login(email, password);

    if (!result.success) {
      this.errorMessage.set(result.error ?? 'Credenciales inválidas. Intenta nuevamente.');
      return;
    }

    this.errorMessage.set(null);
    void this.router.navigate(['/home']);
  }
}

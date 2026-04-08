import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type AdminLoginResponse = {
  token: string;
  expiresAt: string; // ✅ ADD THIS
  user: {
    id: string;
    username: string;
    role: string;
  };
};

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  private router = inject(Router);

  username = '';
  password = '';

  isSubmitting = false;
  errorMessage = '';
  statusMessage = '';

  async submit(): Promise<void> {
    if (this.isSubmitting) return;

    const username = this.username.trim().toLowerCase();
    const password = this.password.trim();

    this.errorMessage = '';
    this.statusMessage = '';

    if (!username) {
      this.errorMessage = 'Please enter your username.';
      return;
    }

    if (!password) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    try {
      this.isSubmitting = true;

      const response = await fetch(
        'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/admin-login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        this.errorMessage = result?.error || 'Admin login failed.';
        return;
      }

      const data = result as AdminLoginResponse;

localStorage.setItem('admin_token', data.token);
localStorage.setItem('admin_user', JSON.stringify(data.user));
localStorage.setItem('admin_expires_at', data.expiresAt);

      this.statusMessage = 'Admin access granted.';
      await this.router.navigate(['/admin']);
    } catch (error) {
      console.error('Admin login error:', error);
      this.errorMessage = 'Could not complete admin login.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
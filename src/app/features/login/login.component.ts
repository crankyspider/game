import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlayerService } from '../../core/services/player.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private router = inject(Router);
  private playerService = inject(PlayerService);
  private auth = inject(AuthService);

  stateId = '';
  codePart1 = '';
  codePart2 = '';

  statusMessage = '';
  errorMessage = '';
  isSubmitting = false;

  sanitizeStateId(): void {
    this.stateId = this.stateId.toUpperCase().trimStart();
  }

  sanitizeCodePart(field: 'codePart1' | 'codePart2'): void {
    this[field] = this[field]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4);
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) return;

    const stateId = this.stateId.trim().toUpperCase();
    const codePart1 = this.codePart1.trim().toUpperCase();
    const codePart2 = this.codePart2.trim().toUpperCase();

    this.statusMessage = '';
    this.errorMessage = '';

    if (!stateId) {
      this.errorMessage = 'Please enter your State ID.';
      return;
    }

    if (!/^[A-Z0-9]{4}$/.test(codePart1)) {
      this.errorMessage = 'First code must be exactly 4 letters or numbers.';
      return;
    }

    if (!/^[A-Z0-9]{4}$/.test(codePart2)) {
      this.errorMessage = 'Second code must be exactly 4 letters or numbers.';
      return;
    }

    try {
      this.isSubmitting = true;

      const player = await this.playerService.login(stateId, codePart1, codePart2);

      console.log('PLAYER LOGIN RESULT:', player);

      if (!player) {
        this.errorMessage = 'Invalid credentials or inactive attempt.';
        return;
      }

const normalizedPlayer = {
  id: player.id ?? null,
  stateId: player.state_id ?? stateId,
  role: player.role ?? 'player',
  progress: Number(player.progress ?? 0),
  stage: Number(player.stage ?? 0),

  completed_pathfinder_at: player.completed_pathfinder_at ?? null,
  completed_fingerprint_at: player.completed_fingerprint_at ?? null
};

      this.auth.setCurrentUser(normalizedPlayer);
      this.auth.setStage(normalizedPlayer.stage);

      // temporary token so existing auth guard passes
      this.auth.setToken('player-session');

      this.statusMessage = 'Access granted.';

      const route = this.auth.getRedirectRouteByStage(normalizedPlayer.stage);
      console.log('LOGIN REDIRECT ROUTE:', route);

      const navigated = await this.router.navigateByUrl(route);
      console.log('NAVIGATION RESULT:', navigated);

      if (!navigated) {
        this.errorMessage = 'Login worked, but navigation failed.';
      }
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage = 'Could not connect to server.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
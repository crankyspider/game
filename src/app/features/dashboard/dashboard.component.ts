import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type GameCard = {
  title: string;
  description: string;
  route?: string;
  requiredStage: number;
  completionKey?: 'completed_pathfinder_at' | 'completed_fingerprint_at';
  exists: boolean;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  stage = this.auth.getStage();
  currentUser = this.auth.getCurrentUser() ?? {};

  games: GameCard[] = [
  {
    title: 'Path Finder',
    description: 'Trace the correct route and complete the first trial.',
    route: '/path-finder',
    requiredStage: 1,
    completionKey: 'completed_pathfinder_at',
    exists: true
  },
  {
    title: 'Fingerprint',
    description: 'Match the correct fragments and identify the target.',
    route: '/fingerprint',
    requiredStage: 2,
    completionKey: 'completed_fingerprint_at',
    exists: false
  },
  {
    title: 'Signal Trace',
    description: 'Recover the hidden pattern buried in corrupted data.',
    requiredStage: 3,
    exists: false
  },
  {
    title: 'Cipher Vault',
    description: 'Break the sequence and unlock the protected archive.',
    requiredStage: 4,
    exists: false
  },
  {
    title: 'Memory Weave',
    description: 'Reconstruct the fractured chain before it collapses.',
    requiredStage: 5,
    exists: false
  },
  {
    title: 'Final Protocol',
    description: 'Complete the last trial and reveal the core signal.',
    requiredStage: 6,
    exists: false
  }
];

  isUnlocked(requiredStage: number): boolean {
    return this.stage >= requiredStage;
  }

isCompleted(game: GameCard): boolean {
  if (!game.completionKey) return false;
  return !!this.currentUser?.[game.completionKey];
}

getStatus(game: GameCard): string {
  if (!game.exists) return 'Awaiting Release';
  if (!this.isUnlocked(game.requiredStage)) return 'Locked';
  if (this.isCompleted(game)) return 'Completed';
  return 'Available';
}

openGame(game: GameCard): void {
  if (!game.exists) return;
  if (!this.isUnlocked(game.requiredStage)) return;
  if (!game.route) return;

  this.router.navigate([game.route]);
}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
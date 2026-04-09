import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, Player } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit {
  private auth = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  players: Player[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  newPlayer = {
    stateId: '',
    codePart1: '',
    codePart2: '' // ✅ FIXED
  };

  async ngOnInit(): Promise<void> {
    const role = this.auth.getAdminRole();

    if (role !== 'admin') {
      await this.router.navigateByUrl('/login');
      return;
    }

    await this.loadPlayers();
  }

  async loadPlayers(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.players = await firstValueFrom(this.adminService.getPlayers());
    } catch (error: any) {
      console.error('Load players error:', error);
      this.errorMessage = error?.error?.message || 'Failed to load players.';
    } finally {
      this.isLoading = false;
    }
  }

  sanitizeNewPlayerField(field: 'stateId' | 'codePart1' | 'codePart2'): void {
    this.newPlayer[field] = this.newPlayer[field]
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
  }

  

  async createPlayer(): Promise<void> {
    try {
      this.errorMessage = '';
      this.successMessage = '';

      const stateId = this.newPlayer.stateId.trim().toUpperCase();
      const codePart1 = this.newPlayer.codePart1.trim().toUpperCase();
      const codePart2 = this.newPlayer.codePart2.trim().toUpperCase(); // ✅ FIXED

      if (!/^\d{1,6}$/.test(stateId)) {
  this.errorMessage = 'State ID must be up to 6 digits.';
  return;
}

      if (!stateId || !codePart1 || !codePart2) {
        this.errorMessage = 'All new player fields are required.';
        return;
      }

      await firstValueFrom(
        this.adminService.createPlayer({
          stateId,
          codePart1,
          codePart2 // ✅ FIXED
        })
      );

      this.successMessage = 'Player created successfully.';
      this.newPlayer = {
        stateId: '',
        codePart1: '',
        codePart2: '' // ✅ FIXED
      };

      await this.loadPlayers();
    } catch (error: any) {
      console.error('Create player error:', error);
      this.errorMessage = error?.error?.message || 'Failed to create player.';
    }
  }

  async savePlayer(player: Player): Promise<void> {
    try {
      this.errorMessage = '';
      this.successMessage = '';

      const payload: Partial<Player> = {
        codePart1: String(player.codePart1 || '').trim().toUpperCase(),
        codePart2: String(player.codePart2 || '').trim().toUpperCase(), // ✅ FIXED
        activeAttempt: !!player.activeAttempt,
        stage: Number(player.stage ?? 0),
        progress: Number(player.progress ?? 0)
      };

      await firstValueFrom(this.adminService.updatePlayer(player.stateId, payload));

      this.successMessage = `Player ${player.stateId} updated.`;
      await this.loadPlayers();
    } catch (error: any) {
      console.error('Save player error:', error);
      this.errorMessage = error?.error?.message || 'Failed to update player.';
    }
  }

  async toggleAttempt(player: Player): Promise<void> {
    try {
      this.errorMessage = '';
      this.successMessage = '';

      await firstValueFrom(
        this.adminService.toggleAttempt(player.stateId, !!player.activeAttempt)
      );

      this.successMessage = `Attempt updated for ${player.stateId}.`;
      await this.loadPlayers();
    } catch (error: any) {
      console.error('Toggle attempt error:', error);
      this.errorMessage = error?.error?.message || 'Failed to update attempt.';
    }
  }

  async regenerateCode(player: Player): Promise<void> {
    try {
      this.errorMessage = '';
      this.successMessage = '';

      await firstValueFrom(this.adminService.regenerateCode(player.stateId));

      this.successMessage = `New code generated for ${player.stateId}.`;
      await this.loadPlayers();
    } catch (error: any) {
      console.error('Regenerate code error:', error);
      this.errorMessage = error?.error?.message || 'Failed to regenerate code.';
    }
  }

  async deletePlayer(player: Player): Promise<void> {
    const confirmed = window.confirm(
      `Delete player ${player.stateId}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      this.errorMessage = '';
      this.successMessage = '';

      await firstValueFrom(this.adminService.deletePlayer(player.stateId));

      this.successMessage = `Player ${player.stateId} deleted.`;
      await this.loadPlayers();
    } catch (error: any) {
      console.error('Delete player error:', error);
      this.errorMessage = error?.error?.message || 'Failed to delete player.';
    }
  }

  logout(): void {
    this.auth.logoutAdmin();
    this.router.navigateByUrl('/login');
  }
}
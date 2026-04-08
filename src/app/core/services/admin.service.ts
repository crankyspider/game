import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

export interface Player {
  stateId: string;
  codePart1: string;
  codePart2: string;
  activeAttempt: boolean;
  progress?: number;
  stage?: number;
  role?: string;
  createdAt?: string;
  completedPathFinderAt?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  // =========================================
  // PASTE EACH EDGE FUNCTION URL HERE
  // =========================================

  private readonly getPlayersUrl = 'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/get-admin-players';
  private readonly createPlayerUrl = 'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/admin-create-player';
  private readonly updatePlayerUrl = 'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/admin-update-player';
  private readonly toggleAttemptUrl = 'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/admin-toggle-attempt';
  private readonly regenerateCodeUrl = 'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/admin-regenerate-code';
  private readonly deletePlayerUrl = 'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/admin-delete-player';

  private getAdminToken(): string {
    return localStorage.getItem('admin_token') ?? '';
  }

  private async request<T>(
    url: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    body?: unknown
  ): Promise<T> {
    const token = this.getAdminToken();

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const rawText = await response.text();
    let result: any = {};

    try {
      result = rawText ? JSON.parse(rawText) : {};
    } catch {
      result = { error: rawText || 'Invalid server response.' };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        error: result?.error || 'Request failed.',
        details: result
      };
    }

    return result as T;
  }

  getPlayers(): Observable<Player[]> {
    return from(
      (async () => {
        const result = await this.request<{ players: Player[] }>(
          this.getPlayersUrl,
          'GET'
        );

        return result.players ?? [];
      })()
    );
  }

  createPlayer(payload: {
    stateId: string;
    codePart1: string;
    codePart2: string;
  }): Observable<{ success: boolean; player: Player }> {
    return from(
      this.request<{ success: boolean; player: Player }>(
        this.createPlayerUrl,
        'POST',
        payload
      )
    );
  }

  updatePlayer(
    stateId: string,
    updates: Partial<Player>
  ): Observable<{ success: boolean; player: Player }> {
    return from(
      this.request<{ success: boolean; player: Player }>(
        this.updatePlayerUrl,
        'PATCH',
        {
          stateId,
          updates
        }
      )
    );
  }

  toggleAttempt(
    stateId: string,
    activeAttempt: boolean
  ): Observable<{ success: boolean; player: Player }> {
    return from(
      this.request<{ success: boolean; player: Player }>(
        this.toggleAttemptUrl,
        'PATCH',
        {
          stateId,
          activeAttempt
        }
      )
    );
  }

  regenerateCode(
    stateId: string
  ): Observable<{ success: boolean; player: Player }> {
    return from(
      this.request<{ success: boolean; player: Player }>(
        this.regenerateCodeUrl,
        'PATCH',
        { stateId }
      )
    );
  }

  deletePlayer(stateId: string): Observable<{ success: boolean }> {
    return from(
      this.request<{ success: boolean }>(
        this.deletePlayerUrl,
        'DELETE',
        { stateId }
      )
    );
  }
}
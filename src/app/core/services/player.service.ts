import { Injectable } from '@angular/core';

export interface Player {
  id: string;
  state_id: string;
  progress: number;
  role: string;
  stage: number;
  completed_pathfinder_at: string | null;
}

interface LoginPlayerResponse {
  sessionToken: string;
  player: Player;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private readonly loginFunctionUrl =
    'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/login-player';

  private readonly completePathfinderUrl =
    'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/complete-pathfinder';

  private readonly PLAYER_SESSION_TOKEN_KEY = 'player_session_token';

  async login(
    stateId: string,
    codePart1: string,
    codePart2: string
  ): Promise<Player | null> {
    try {
      const response = await fetch(this.loginFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stateId,
          codePart1,
          codePart2
        })
      });

      const result = (await response.json()) as Partial<LoginPlayerResponse> & {
        error?: string;
        message?: string;
      };

      if (!response.ok || !result.player || !result.sessionToken) {
        console.error('Login failed:', result);
        this.clearSessionToken();
        return null;
      }

      this.setSessionToken(result.sessionToken);
      return result.player;
    } catch (error) {
      console.error('Login request error:', error);
      this.clearSessionToken();
      return null;
    }
  }

  async completePathFinder(): Promise<boolean> {
    try {
      const sessionToken = this.getSessionToken();

      if (!sessionToken) {
        console.error('Missing player session token');
        return false;
      }

      const response = await fetch(this.completePathfinderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-session': sessionToken
        }
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Complete pathfinder failed:', result);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Complete pathfinder request error:', error);
      return false;
    }
  }

  getSessionToken(): string | null {
    return localStorage.getItem(this.PLAYER_SESSION_TOKEN_KEY);
  }

  setSessionToken(token: string): void {
    localStorage.setItem(this.PLAYER_SESSION_TOKEN_KEY, token);
  }

  clearSessionToken(): void {
    localStorage.removeItem(this.PLAYER_SESSION_TOKEN_KEY);
  }
}
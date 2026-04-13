import { Injectable } from '@angular/core';

export interface Player {
  id: string;
  state_id: string;
  progress: number;
  role: string;
  stage: number;
  completed_pathfinder_at: string | null;
  completed_fingerprint_at?: string | null;
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

async completePathFinder(timeoutMs = 8000): Promise<{
  success: boolean;
  alreadyCompleted?: boolean;
  sessionExpired?: boolean;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const sessionToken = this.getSessionToken();

    if (!sessionToken) {
      console.error('Missing player session token');
      return { success: false, sessionExpired: true };
    }

    const response = await fetch(this.completePathfinderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-session': sessionToken
      },
      signal: controller.signal
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, sessionExpired: true };
      }

      if (response.status === 200 && result?.alreadyCompleted) {
        return { success: true, alreadyCompleted: true };
      }

      if (response.status === 409 || result?.alreadyCompleted) {
        return { success: true, alreadyCompleted: true };
      }

      console.error('Complete pathfinder failed:', result);
      return { success: false };
    }

    return {
      success: true,
      alreadyCompleted: !!result?.alreadyCompleted
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Complete pathfinder request timed out');
    } else {
      console.error('Complete pathfinder request error:', error);
    }

    return { success: false };
  } finally {
    clearTimeout(timeoutId);
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
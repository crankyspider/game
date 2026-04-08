import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private readonly API_BASE = 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'game_token';
  private readonly STAGE_KEY = 'game_stage';
  private readonly USER_KEY = 'game_user';
  private readonly ADMIN_TOKEN_KEY = 'admin_token';
private readonly ADMIN_USER_KEY = 'admin_user';

  playerLogin(payload: {
    stateId: string;
    codePart1: string;
    codePart2: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${this.API_BASE}/auth/player-login`, payload)
      .pipe(
        tap((res) => {
          if (res?.token) {
            this.setToken(res.token);
          }

          if (res?.user) {
            this.setCurrentUser(res.user);
            this.setStage(res.user.stage ?? 0);
          }
        })
      );
  }


  completeGame(gameKey: string): Observable<any> {
    return this.http
      .patch<any>(`${this.API_BASE}/player/complete-game`, { gameKey })
      .pipe(
        tap((res) => {
          if (res?.player) {
            this.setCurrentUser({
              stateId: res.player.stateId,
              role: res.player.role,
              progress: res.player.progress ?? 0,
              stage: res.player.stage ?? 0
            });

            this.setStage(res.player.stage ?? 0);
          }
        })
      );
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${this.API_BASE}/auth/me`);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setCurrentUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getCurrentUser(): any | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

 logout(): void {
  localStorage.removeItem(this.TOKEN_KEY);
  localStorage.removeItem(this.STAGE_KEY);
  localStorage.removeItem(this.USER_KEY);
  localStorage.removeItem('player_session_token');
}

  setStage(stage: number): void {
    localStorage.setItem(this.STAGE_KEY, String(stage));
  }

  getStage(): number {
    return Number(localStorage.getItem(this.STAGE_KEY) || '0');
  }

  getRedirectRouteByStage(stage: number): string {
    if (stage === 1) {
      return '/path-finder';
    }

    if (stage === 0) {
      return '/locked';
    }

    if (stage === 2) {
      return '/completed';
    }

    return '/login';
  }

  getRoleFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.role || null;
    } catch {
      return null;
    }
  }

  getStateIdFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.stateId || null;
    } catch {
      return null;
    }
  }
  getAdminToken(): string | null {
  return localStorage.getItem(this.ADMIN_TOKEN_KEY);
}

getAdminUser(): any | null {
  const raw = localStorage.getItem(this.ADMIN_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

getAdminRole(): string | null {
  const user = this.getAdminUser();
  return user?.role || null;
}

isAdminLoggedIn(): boolean {
  return !!this.getAdminToken();
}

logoutAdmin(): void {
  localStorage.removeItem(this.ADMIN_TOKEN_KEY);
  localStorage.removeItem(this.ADMIN_USER_KEY);
}


}
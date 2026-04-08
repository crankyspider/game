import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-locked',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locked.component.html',
  styleUrl: './locked.component.css'
})
export class LockedComponent implements OnInit, OnDestroy {
  private readonly functionUrl =
    'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/active-player-count';

  private destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private animationTimer: number | null = null;

  playerCount = 0;
  displayedCount = 0;
  loading = true;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.loadPlayerCount();
    this.startPollingPlayerCount();
  }

  loadPlayerCount(): void {
    this.http.get<{ count: number }>(this.functionUrl).subscribe({
      next: (res) => {
        const newCount = Number(res?.count ?? 0);
        this.playerCount = newCount;
        this.loading = false;
        this.animateCount(this.displayedCount, newCount, 900);
      },
      error: (err) => {
        console.error('Failed to load player count:', err);
        this.loading = false;
      }
    });
  }

  startPollingPlayerCount(): void {
    interval(3000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.http.get<{ count: number }>(this.functionUrl))
      )
      .subscribe({
        next: (res) => {
          const newCount = Number(res?.count ?? 0);

          if (newCount !== this.playerCount) {
            this.playerCount = newCount;
            this.animateCount(this.displayedCount, newCount, 700);
          }
        },
        error: (err) => {
          console.error('Failed to refresh player count:', err);
        }
      });
  }

  animateCount(start: number, end: number, duration: number): void {
    if (!this.isBrowser || start === end) return;

    if (this.animationTimer !== null) {
      window.clearInterval(this.animationTimer);
      this.animationTimer = null;
    }

    const range = end - start;
    const direction = range > 0 ? 1 : -1;
    const steps = Math.abs(range);
    const stepTime = Math.max(Math.floor(duration / Math.max(steps, 1)), 25);

    let current = start;

    this.animationTimer = window.setInterval(() => {
      current += direction;
      this.displayedCount = current;

      if (current === end && this.animationTimer !== null) {
        window.clearInterval(this.animationTimer);
        this.animationTimer = null;
      }
    }, stepTime);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.isBrowser && this.animationTimer !== null) {
      window.clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }
}
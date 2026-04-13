import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type ChoiceTile = {
  id: string;
  src: string;
  isCorrect: boolean;
  state: 'idle' | 'correct' | 'incorrect';
};

type CompleteFingerprintResponse = {
  success: boolean;
  alreadyCompleted?: boolean;
  player?: {
    id: string;
    state_id: string;
    role: string;
    stage: number;
    progress: number;
    completed_pathfinder_at?: string | null;
    completed_fingerprint_at?: string | null;
  };
  error?: string;
};

@Component({
  selector: 'app-fingerprint',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fingerprint.component.html',
  styleUrl: './fingerprint.component.css'
})
export class FingerprintComponent implements AfterViewInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  @ViewChild('mainCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private timerStartMs: number | null = null;
  private currentMainImagePath = '';
  private isCompleting = false;

  readonly totalLevels = 4;
  readonly correctPerLevel = 3;
  readonly maxAttempts = 3;
  readonly totalTime = 150;
  readonly beepStartThreshold = 35;

  currentLevel = 1;
  attempts = 0;
  remainingTime = this.totalTime;
  correctSelections = 0;

  correctChoices = new Set<string>();
  incorrectChoices = new Set<string>();
  choices: ChoiceTile[] = [];

  beepStarted = false;
  beepInterval: ReturnType<typeof setInterval> | null = null;
  isFailing = false;

  readonly timerBeepSound = new Audio('/assets/audio/timer-beep.mp3');
  readonly selectionCorrectSound = new Audio('/assets/audio/success.mp3');
  readonly selectionWrongSound = new Audio('/assets/audio/wrong.mp3');
  readonly levelCompleteSound = new Audio('/assets/audio/success.mp3');
  readonly gameFailSound = new Audio('/assets/audio/wrong.mp3');
  readonly gameCompleteSound = new Audio('/assets/audio/success.mp3');

  readonly imagePool: string[] = [
    '/assets/images/fingerprint/resized_1.png',
    '/assets/images/fingerprint/resized_2.png',
    '/assets/images/fingerprint/resized_3.png',
    '/assets/images/fingerprint/resized_4.png',
    '/assets/images/fingerprint/resized_5.png',
    '/assets/images/fingerprint/resized_6.png',
    '/assets/images/fingerprint/resized_7.png',
    '/assets/images/fingerprint/resized_8.png',
    '/assets/images/fingerprint/resized_9.png',
    '/assets/images/fingerprint/resized_10.png',
    '/assets/images/fingerprint/resized_11.png',
    '/assets/images/fingerprint/resized_12.png',
    '/assets/images/fingerprint/resized_14.png',
    '/assets/images/fingerprint/resized_15.png',
    '/assets/images/fingerprint/resized_16.png',
    '/assets/images/fingerprint/resized_17.png',
    '/assets/images/fingerprint/resized_18.png'
  ];

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get 2D context for fingerprint canvas.');
    }

    this.ctx = ctx;
    this.preloadSounds();
    void this.resetGame();
  }

  get progressPercent(): number {
    return Math.max(0, (this.remainingTime / this.totalTime) * 100);
  }

  get attemptSlots(): number[] {
    return Array.from({ length: this.maxAttempts }, (_, i) => i);
  }

  get levelSlots(): number[] {
    return Array.from({ length: this.totalLevels }, (_, i) => i + 1);
  }

  private preloadSounds(): void {
    const sounds = [
      this.timerBeepSound,
      this.selectionCorrectSound,
      this.selectionWrongSound,
      this.levelCompleteSound,
      this.gameFailSound,
      this.gameCompleteSound
    ];

    for (const sound of sounds) {
      sound.preload = 'auto';
      sound.load();
    }
  }

  private async playSound(sound: HTMLAudioElement): Promise<void> {
    try {
      sound.currentTime = 0;
      await sound.play();
    } catch {
      // ignore playback errors
    }
  }

  async resetGame(): Promise<void> {
    this.stopTimer();

    this.currentLevel = 1;
    this.attempts = 0;
    this.remainingTime = this.totalTime;
    this.correctSelections = 0;
    this.choices = [];
    this.correctChoices.clear();
    this.incorrectChoices.clear();
    this.beepStarted = false;
    this.isFailing = false;
    this.isCompleting = false;

    await this.loadLevel();
    this.startTimer();
  }

async loadLevel(): Promise<void> {
  this.correctSelections = 0;
  this.correctChoices.clear();
  this.incorrectChoices.clear();
  this.choices = [];

  this.currentMainImagePath = this.getRandomImage();
  const mainImage = await this.loadImage(this.currentMainImagePath);

  this.drawImage(mainImage);

  const correctSections = this.getRandomSectionsFromImage(
    mainImage,
    this.correctPerLevel
  );

  const decoySections = await this.getDecoySections(this.currentMainImagePath);

  const correctTiles: ChoiceTile[] = correctSections.map((img, i) => ({
    id: `correct-${this.currentLevel}-${i}-${crypto.randomUUID()}`,
    src: img.src,
    isCorrect: true,
    state: 'idle'
  }));

  const decoyTiles: ChoiceTile[] = decoySections
    .slice(0, 16 - this.correctPerLevel)
    .map((img, i) => ({
      id: `decoy-${this.currentLevel}-${i}-${crypto.randomUUID()}`,
      src: img.src,
      isCorrect: false,
      state: 'idle'
    }));

  this.choices = [...correctTiles, ...decoyTiles]
    .sort(() => Math.random() - 0.5);
}

  async onChoiceClick(choice: ChoiceTile): Promise<void> {
    if (choice.state !== 'idle' || this.isFailing || this.isCompleting) return;

    if (choice.isCorrect) {
      choice.state = 'correct';
      this.correctChoices.add(choice.src);
      this.correctSelections++;

      await this.playSound(this.selectionCorrectSound);

      if (this.correctSelections === this.correctPerLevel) {
        if (this.currentLevel < this.totalLevels) {
          await this.playSound(this.levelCompleteSound);
          this.currentLevel++;
          await this.loadLevel();
        } else {
          await this.onGameComplete();
        }
      }

      return;
    }

    choice.state = 'incorrect';
    this.incorrectChoices.add(choice.src);
    this.attempts++;

    await this.playSound(this.selectionWrongSound);

    if (this.attempts >= this.maxAttempts) {
      await this.onGameFail();
    }
  }

  private startTimer(): void {
    this.timerStartMs = performance.now();
    this.tick(this.timerStartMs);
  }

  private tick = (timestamp: number): void => {
    if (this.timerStartMs === null) {
      this.timerStartMs = timestamp;
    }

    const elapsedSeconds = (timestamp - this.timerStartMs) / 1000;
    this.remainingTime = Math.max(0, this.totalTime - elapsedSeconds);

    if (this.remainingTime <= this.beepStartThreshold && !this.beepStarted) {
      this.beepStarted = true;
      this.beepInterval = setInterval(() => {
        void this.playSound(this.timerBeepSound);
      }, 1000);
    }

    if (this.remainingTime <= 0) {
      void this.onGameFail();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private stopTimer(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.beepInterval) {
      clearInterval(this.beepInterval);
      this.beepInterval = null;
    }
  }

  private async onGameFail(): Promise<void> {
    if (this.isFailing || this.isCompleting) return;

    this.isFailing = true;
    this.stopTimer();
    await this.playSound(this.gameFailSound);
    await this.resetGame();
  }

private async onGameComplete(): Promise<void> {
  if (this.isCompleting) return;

  this.isCompleting = true;
  this.stopTimer();

  await this.playSound(this.gameCompleteSound);

  try {
    const sessionToken = localStorage.getItem('player_session_token');

    if (!sessionToken) {
      console.error('Missing player session token.');
      await this.router.navigate(['/dashboard']);
      return;
    }

    const response = await fetch(
      'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/complete-fingerprint',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'x-player-session': sessionToken
        }
      }
    );

    const result = (await response.json()) as CompleteFingerprintResponse;

    if (!response.ok || !result.success || !result.player) {
      console.error('Fingerprint completion failed:', result);
      await this.router.navigate(['/dashboard']);
      return;
    }

    const normalizedPlayer = {
      id: result.player.id ?? null,
      stateId: result.player.state_id ?? null,
      role: result.player.role ?? 'player',
      progress: Number(result.player.progress ?? 0),
      stage: Number(result.player.stage ?? 0),
      completed_pathfinder_at: result.player.completed_pathfinder_at ?? null,
      completed_fingerprint_at: result.player.completed_fingerprint_at ?? null
    };

    this.auth.setCurrentUser(normalizedPlayer);
    this.auth.setStage(normalizedPlayer.stage);

    await this.router.navigate(['/dashboard']);
  } catch (error) {
    console.error('Error completing fingerprint game:', error);
    await this.router.navigate(['/dashboard']);
  }
}

  private getRandomImage(): string {
    return this.imagePool[Math.floor(Math.random() * this.imagePool.length)];
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });
  }

  private drawImage(img: HTMLImageElement): void {
    const canvas = this.canvasRef.nativeElement;
    const maxHeight = 400;
    const scale = maxHeight / img.height;

    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  private getRandomSectionsFromImage(
    image: HTMLImageElement,
    count: number
  ): HTMLImageElement[] {
    const sections: HTMLImageElement[] = [];
    const indices = Array.from({ length: 9 }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');

    if (!sourceCtx) return sections;

    const maxHeight = 400;
    const scale = maxHeight / image.height;
    sourceCanvas.width = Math.round(image.width * scale);
    sourceCanvas.height = Math.round(image.height * scale);
    sourceCtx.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

    const sectionWidth = Math.floor(sourceCanvas.width / 3);
    const sectionHeight = Math.floor(sourceCanvas.height / 3);

    for (const index of indices) {
      const sx = (index % 3) * sectionWidth;
      const sy = Math.floor(index / 3) * sectionHeight;

      const tileCanvas = document.createElement('canvas');
      const tileCtx = tileCanvas.getContext('2d');
      if (!tileCtx) continue;

      tileCanvas.width = sectionWidth;
      tileCanvas.height = sectionHeight;

      tileCtx.drawImage(
        sourceCanvas,
        sx,
        sy,
        sectionWidth,
        sectionHeight,
        0,
        0,
        sectionWidth,
        sectionHeight
      );

      const tile = new Image();
      tile.src = tileCanvas.toDataURL('image/png');
      sections.push(tile);
    }

    return sections;
  }

  private async getDecoySections(mainPath: string): Promise<HTMLImageElement[]> {
    const decoyPaths = this.imagePool
      .filter((p) => p !== mainPath)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    const decoys: HTMLImageElement[] = [];

    for (const path of decoyPaths) {
      const image = await this.loadImage(path);
      decoys.push(...this.getRandomSectionsFromImage(image, 4));
    }

    return decoys;
  }
}
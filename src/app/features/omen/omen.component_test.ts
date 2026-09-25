import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type AstroSymbol =
  | 'fire' | 'water' | 'earth' | 'air'
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo'
  | 'virgo' | 'libra' | 'scorpio' | 'sagittarius'
  | 'capricorn' | 'aquarius' | 'pisces';

type OmenResult = 'good' | 'none' | 'poor';

type CompleteOmenResponse = {
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
    completed_omen_at?: string | null;
  };

  error?: string;
};

@Component({
  selector: 'app-omen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './omen.component.html',
  styleUrl: './omen.component.css'
})
export class OmenComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  private isCompleting = false;

  testRound = 0;

  readonly allSymbols: AstroSymbol[] = [
    'fire', 'water', 'earth', 'air',

    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',

    'aries', 'taurus', 'gemini', 'cancer', 'leo',
    'virgo', 'libra', 'scorpio', 'sagittarius',
    'capricorn', 'aquarius', 'pisces'
  ];

  showLegend = false;

  toggleLegend(): void {
    this.showLegend = !this.showLegend;
  }

  closeLegend(): void {
    this.showLegend = false;
  }

  readonly symbolValues: Record<AstroSymbol, number> = {
    fire: 2,
    water: -2,
    earth: 1,
    air: -1,

    sun: 2,
    moon: 1,
    mercury: 0,
    venus: 1,
    mars: -1,
    jupiter: 2,
    saturn: -2,
    uranus: 0,
    neptune: -1,
    pluto: -2,

    aries: 1,
    taurus: 0,
    gemini: -1,
    cancer: -1,
    leo: 2,
    virgo: 0,
    libra: 1,
    scorpio: -2,
    sagittarius: 1,
    capricorn: 0,
    aquarius: -1,
    pisces: -1
  };

  currentSet: AstroSymbol[] = [];

  resultMessage = '';
  selectedAnswer: OmenResult | null = null;
  lastCorrectAnswer: OmenResult | null = null;

  streak = 0;
  targetStreak = 5;

  isLocked = false;
  isComplete = false;

  ngOnInit(): void {
    console.clear();

    console.log('======================================');
    console.log('OMEN TEST MODE STARTED');
    console.log('Required streak:', this.targetStreak);
    console.log('Current saved stage:', this.auth.getStage());
    console.log('Current saved user:', this.auth.getCurrentUser());
    console.log('======================================');

    this.generateRound();
  }

  generateRound(): void {
    if (this.isComplete || this.isCompleting) return;

    this.currentSet = this.getUniqueRandomSymbols(3);

    this.resultMessage = '';
    this.selectedAnswer = null;
    this.lastCorrectAnswer = null;
    this.isLocked = false;

    this.testRound++;

    const score = this.getRoundScore(this.currentSet);
    const correctAnswer = this.determineOmen(this.currentSet);

    console.log('');
    console.log('======================================');
    console.log(`OMEN ROUND ${this.testRound}`);
    console.log('======================================');

    console.log('Symbols:', this.currentSet);

    console.log(
      'Values:',
      this.currentSet.map(
        symbol => `${symbol} = ${this.symbolValues[symbol]}`
      )
    );

    console.log('Total score:', score);

    console.log(
      'CORRECT ANSWER:',
      this.getOmenLabel(correctAnswer)
    );

    console.log(
      'Current streak:',
      `${this.streak} / ${this.targetStreak}`
    );

    console.log('======================================');
    console.log('');
  }

  choose(answer: OmenResult): void {
    if (
      this.isLocked ||
      this.isComplete ||
      this.isCompleting
    ) {
      return;
    }

    this.isLocked = true;
    this.selectedAnswer = answer;

    const score = this.getRoundScore(this.currentSet);
    const correctAnswer = this.determineOmen(this.currentSet);
    const feedback = this.getSignalFeedback(score);

    this.lastCorrectAnswer = correctAnswer;

    console.log('');
    console.log('------------ ANSWER CHECK ------------');

    console.log(
      'Selected:',
      this.getOmenLabel(answer)
    );

    console.log(
      'Correct:',
      this.getOmenLabel(correctAnswer)
    );

    console.log('Score:', score);

    if (answer === correctAnswer) {
      this.streak++;

      this.resultMessage =
        `✔ SIGNAL ACCEPTED\n${feedback}`;

      console.log('RESULT: ✅ CORRECT');
    } else {
      this.streak = 0;

      this.resultMessage =
        `✖ SIGNAL REJECTED — ${this.getOmenLabel(correctAnswer)}\n${feedback}`;

      console.log('RESULT: ❌ INCORRECT');
    }

    console.log(
      'Streak:',
      `${this.streak} / ${this.targetStreak}`
    );

    console.log('--------------------------------------');
    console.log('');

    if (this.streak >= this.targetStreak) {
      void this.onGameComplete();
      return;
    }

    setTimeout(() => {
      this.generateRound();
    }, 1200);
  }

  private async onGameComplete(): Promise<void> {
    if (this.isCompleting) return;

    this.isCompleting = true;
    this.isLocked = true;

    this.resultMessage = '✔ SEQUENCE COMPLETE';

    console.log('');
    console.log('======================================');
    console.log('OMEN GAME COMPLETE');
    console.log('======================================');

    console.log('Starting Supabase completion request...');
    console.log('Expected DB update:');
    console.log('stage: 3 -> 4');
    console.log('progress: -> 3');
    console.log('completed_omen_at: timestamp');
    console.log('======================================');

    try {
      const sessionToken =
        localStorage.getItem('player_session_token');

      if (!sessionToken) {
        console.error('❌ Missing player_session_token');

        console.log(
          'localStorage keys:',
          Object.keys(localStorage)
        );

        await this.router.navigate(['/dashboard']);
        return;
      }

      console.log('✅ player_session_token found');

      console.log(
        'Calling:',
        'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/complete-omen'
      );

      const response = await fetch(
        'https://lbwnyctnyyztfxbiwvoj.supabase.co/functions/v1/complete-omen',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            'Authorization':
              `Bearer ${sessionToken}`,

            'x-player-session':
              sessionToken
          }
        }
      );

      console.log('');
      console.log('---------- SUPABASE RESPONSE ----------');

      console.log(
        'HTTP status:',
        response.status
      );

      console.log(
        'HTTP ok:',
        response.ok
      );

      const result =
        (await response.json()) as CompleteOmenResponse;

      console.log(
        'Raw response:',
        result
      );

      if (
        !response.ok ||
        !result.success ||
        !result.player
      ) {
        console.error('❌ OMEN COMPLETION FAILED');

        console.error(
          'Response body:',
          result
        );

        console.log('---------------------------------------');

        await this.router.navigate(['/dashboard']);
        return;
      }

      console.log('✅ SUPABASE FUNCTION SUCCESS');

      console.log(
        'Already completed:',
        result.alreadyCompleted ?? false
      );

      console.log(
        'Player ID:',
        result.player.id
      );

      console.log(
        'State ID:',
        result.player.state_id
      );

      console.log(
        'Role:',
        result.player.role
      );

      console.log(
        'Stage returned:',
        result.player.stage
      );

      console.log(
        'Progress returned:',
        result.player.progress
      );

      console.log(
        'Path Finder completed:',
        result.player.completed_pathfinder_at
      );

      console.log(
        'Fingerprint completed:',
        result.player.completed_fingerprint_at
      );

      console.log(
        'Omen completed:',
        result.player.completed_omen_at
      );

      console.log('---------------------------------------');

      if (Number(result.player.stage) === 4) {
        console.log('✅ STAGE TEST PASSED: player is stage 4');
      } else {
        console.warn(
          '⚠️ STAGE TEST FAILED: expected stage 4, received',
          result.player.stage
        );
      }

      if (Number(result.player.progress) === 3) {
        console.log('✅ PROGRESS TEST PASSED: progress is 3');
      } else {
        console.warn(
          '⚠️ PROGRESS TEST FAILED: expected progress 3, received',
          result.player.progress
        );
      }

      if (result.player.completed_omen_at) {
        console.log(
          '✅ OMEN TIMESTAMP TEST PASSED:',
          result.player.completed_omen_at
        );
      } else {
        console.warn(
          '⚠️ OMEN TIMESTAMP TEST FAILED: completed_omen_at is missing'
        );
      }

      const normalizedPlayer = {
        id:
          result.player.id ?? null,

        stateId:
          result.player.state_id ?? null,

        role:
          result.player.role ?? 'player',

        progress:
          Number(result.player.progress ?? 0),

        stage:
          Number(result.player.stage ?? 0),

        completed_pathfinder_at:
          result.player.completed_pathfinder_at ?? null,

        completed_fingerprint_at:
          result.player.completed_fingerprint_at ?? null,

        completed_omen_at:
          result.player.completed_omen_at ?? null
      };

      console.log('');
      console.log('---------- LOCAL STORAGE ----------');

      console.log(
        'Normalized player:',
        normalizedPlayer
      );

      this.auth.setCurrentUser(normalizedPlayer);

      this.auth.setStage(
        normalizedPlayer.stage
      );

      console.log(
        'Saved stage:',
        this.auth.getStage()
      );

      console.log(
        'Saved user:',
        this.auth.getCurrentUser()
      );

      if (this.auth.getStage() === 4) {
        console.log(
          '✅ LOCAL STORAGE STAGE TEST PASSED'
        );
      } else {
        console.warn(
          '⚠️ LOCAL STORAGE STAGE TEST FAILED'
        );
      }

      console.log('-----------------------------------');
      console.log('');
      console.log('✅ FULL OMEN COMPLETION FLOW FINISHED');
      console.log('');

      this.isComplete = true;

      await this.router.navigate(['/dashboard']);

    } catch (error) {
      console.error('');
      console.error('======================================');
      console.error('❌ OMEN COMPLETION EXCEPTION');
      console.error(error);
      console.error('======================================');

      await this.router.navigate(['/dashboard']);
    }
  }

  getRoundScore(set: AstroSymbol[]): number {
    return set.reduce(
      (sum, symbol) =>
        sum + this.symbolValues[symbol],
      0
    );
  }

  determineOmen(set: AstroSymbol[]): OmenResult {
    const score = this.getRoundScore(set);

    if (score >= 3) return 'good';

    if (score <= -2) return 'poor';

    return 'none';
  }

  getSignalFeedback(score: number): string {
    if (score >= 3) {
      return 'Signal alignment: Strong positive';
    }

    if (score >= 1) {
      return 'Signal alignment: Weak positive';
    }

    if (score === 0) {
      return 'Signal alignment: Neutral';
    }

    if (score >= -2) {
      return 'Signal alignment: Weak negative';
    }

    return 'Signal alignment: Strong negative';
  }

  getOmenLabel(result: OmenResult): string {
    switch (result) {
      case 'good':
        return 'GOOD OMEN';

      case 'none':
        return 'NO OMEN';

      case 'poor':
        return 'POOR OMEN';
    }
  }

  getAnswerClass(answer: OmenResult): string {
    if (!this.selectedAnswer) {
      return '';
    }

    if (this.lastCorrectAnswer === answer) {
      return 'correct';
    }

    if (
      this.selectedAnswer === answer &&
      this.lastCorrectAnswer !== answer
    ) {
      return 'incorrect';
    }

    return '';
  }

  get progressPercent(): number {
    return (
      this.streak /
      this.targetStreak
    ) * 100;
  }

  private getUniqueRandomSymbols(
    count: number
  ): AstroSymbol[] {
    const pool = [...this.allSymbols];

    const selected: AstroSymbol[] = [];

    while (
      selected.length < count &&
      pool.length > 0
    ) {
      const index =
        Math.floor(
          Math.random() * pool.length
        );

      const [picked] =
        pool.splice(index, 1);

      selected.push(picked);
    }

    return selected;
  }
}
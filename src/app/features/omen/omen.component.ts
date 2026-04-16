import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type AstroSymbol =
  | 'fire' | 'water' | 'earth' | 'air'
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

type OmenResult = 'good' | 'none' | 'poor';

@Component({
  selector: 'app-omen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './omen.component.html',
  styleUrl: './omen.component.css'
})
export class OmenComponent implements OnInit {
  readonly allSymbols: AstroSymbol[] = [
    'fire', 'water', 'earth', 'air',
    'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

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
    this.generateRound();
  }

  generateRound(): void {
    this.currentSet = this.getUniqueRandomSymbols(3);
    this.resultMessage = '';
    this.selectedAnswer = null;
    this.lastCorrectAnswer = null;
    this.isLocked = false;
  }

  choose(answer: OmenResult): void {
    if (this.isLocked || this.isComplete) return;

    this.isLocked = true;
    this.selectedAnswer = answer;

    const score = this.getRoundScore(this.currentSet);
    const correctAnswer = this.determineOmen(this.currentSet);
    const feedback = this.getSignalFeedback(score);

    this.lastCorrectAnswer = correctAnswer;

    console.log('Current set:', this.currentSet);
    console.log('Values:', this.currentSet.map(symbol => `${symbol}: ${this.symbolValues[symbol]}`));
    console.log('Score:', score);
    console.log('Correct answer:', correctAnswer);

    if (answer === correctAnswer) {
      this.streak++;
      this.resultMessage = `✔ SIGNAL ACCEPTED\n${feedback}`;
    } else {
      this.streak = 0;
      this.resultMessage = `✖ SIGNAL REJECTED — ${this.getOmenLabel(correctAnswer)}\n${feedback}`;
    }

    if (this.streak >= this.targetStreak) {
      this.isComplete = true;
      this.resultMessage = '✔ SEQUENCE COMPLETE';
      return;
    }

    setTimeout(() => {
      this.generateRound();
    }, 1200);
  }

  getRoundScore(set: AstroSymbol[]): number {
    return set.reduce((sum, symbol) => sum + this.symbolValues[symbol], 0);
  }

  determineOmen(set: AstroSymbol[]): OmenResult {
    const score = this.getRoundScore(set);

    if (score >= 3) return 'good';
    if (score <= -2) return 'poor';
    return 'none';
  }

  getSignalFeedback(score: number): string {
    if (score >= 3) return 'Signal alignment: Strong positive';
    if (score >= 1) return 'Signal alignment: Weak positive';
    if (score === 0) return 'Signal alignment: Neutral';
    if (score >= -2) return 'Signal alignment: Weak negative';
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
    if (!this.selectedAnswer) return '';

    if (this.lastCorrectAnswer === answer) return 'correct';
    if (this.selectedAnswer === answer && this.lastCorrectAnswer !== answer) return 'incorrect';

    return '';
  }

  get progressPercent(): number {
    return (this.streak / this.targetStreak) * 100;
  }

  private getUniqueRandomSymbols(count: number): AstroSymbol[] {
    const pool = [...this.allSymbols];
    const selected: AstroSymbol[] = [];

    while (selected.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      const [picked] = pool.splice(index, 1);
      selected.push(picked);
    }

    return selected;
  }
}
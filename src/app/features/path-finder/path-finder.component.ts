import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerService } from '../../core/services/player.service';
import { AuthService } from '../../core/services/auth.service';

type GameColor = 'yellow' | 'blue' | 'red' | 'green';

interface PathState {
  start: number | null;
  end: number | null;
  steps: number[];
  current: number[];
  moves: number;
  completed: boolean;
}

interface LevelConfig {
  gridSize: number;
  colors: number;
  blockMoveSpeed: number;
  timerDuration: number;
  minMoves: number;
  maxMoves: number;
}

@Component({
  selector: 'app-path-finder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './path-finder.component.html',
  styleUrl: './path-finder.component.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    ngSkipHydration: 'true'
  }
})
export class PathFinderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gridRef') gridRef?: ElementRef<HTMLDivElement>;
  @ViewChild('progressRef') progressRef?: ElementRef<HTMLDivElement>;
  @ViewChild('moveSoundRef') moveSoundRef?: ElementRef<HTMLAudioElement>;
  @ViewChild('completeSoundRef') completeSoundRef?: ElementRef<HTMLAudioElement>;

constructor(
  private playerService: PlayerService,
  private router: Router,
  private auth: AuthService
) {}

  private readonly possibleColors: GameColor[] = ['yellow', 'blue', 'red', 'green'];

  private readonly levels: LevelConfig[] = [
    { gridSize: 9, colors: 4, blockMoveSpeed: 9000, timerDuration: 15500, minMoves: 5, maxMoves: 7 },
    { gridSize: 9, colors: 4, blockMoveSpeed: 10000, timerDuration: 15500, minMoves: 10, maxMoves: 12 },
    { gridSize: 9, colors: 4, blockMoveSpeed: 13000, timerDuration: 15500, minMoves: 12, maxMoves: 13 },
    { gridSize: 9, colors: 4, blockMoveSpeed: 15000, timerDuration: 15500, minMoves: 13, maxMoves: 13 }

  ];

  private gridSize = 9;
  private colors: GameColor[] = [];
  private cells: HTMLDivElement[] = [];
  private paths: Record<string, PathState> = {};

  private isDragging = false;
  private currentColor: GameColor | null = null;
  private level = 1;
  private blockMoveInterval: ReturnType<typeof setInterval> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private timerStarted = false;
  private currentCell: HTMLDivElement | null = null;

  private readonly minBlocks = 4;
  private readonly maxBlocks = 7;
  private readonly blockLifespan = 100;
  private blockProbabilitySetting = 0.1;

  private cleanupFns: Array<() => void> = [];

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.initializeGrid();
    });
  }

  ngOnDestroy(): void {
    this.resetTimer();

    if (this.blockMoveInterval) {
      clearInterval(this.blockMoveInterval);
      this.blockMoveInterval = null;
    }

    for (const cleanup of this.cleanupFns) {
      cleanup();
    }

    this.cleanupFns = [];
  }

  private get grid(): HTMLDivElement | null {
    return this.gridRef?.nativeElement ?? null;
  }

  private get progressBar(): HTMLDivElement | null {
    return this.progressRef?.nativeElement ?? null;
  }

  private get moveSound(): HTMLAudioElement | null {
    return this.moveSoundRef?.nativeElement ?? null;
  }

  private get completeSound(): HTMLAudioElement | null {
    return this.completeSoundRef?.nativeElement ?? null;
  }

  private initializeGrid(): void {
    const grid = this.grid;
    const progressBar = this.progressBar;
    const moveSound = this.moveSound;
    const completeSound = this.completeSound;

    if (!grid || !progressBar || !moveSound || !completeSound) {
      console.error('PathFinder refs status:', {
        grid: !!grid,
        progressBar: !!progressBar,
        moveSound: !!moveSound,
        completeSound: !!completeSound
      });
      console.error('PathFinder: required DOM elements are missing.');
      return;
    }

    this.resetTimer();

    if (this.blockMoveInterval) {
      clearInterval(this.blockMoveInterval);
      this.blockMoveInterval = null;
    }

    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns = [];

    this.cells = [];
    this.paths = {};
    this.isDragging = false;
    this.currentColor = null;
    this.currentCell = null;

    const levelConfig = this.levels[this.level - 1];
    this.gridSize = levelConfig.gridSize;

    const numColors = levelConfig.colors;
    this.colors = this.possibleColors.slice(0, numColors);

    grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 70px)`;
    grid.innerHTML = '';

    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.innerHTML = '<span></span>';
      this.cells.push(cell);
      grid.appendChild(cell);
    }

    this.initializePaths();
    this.placeStartAndEndCells(levelConfig.minMoves, levelConfig.maxMoves);
    this.placeInitialBlocks();
    this.attachEventListeners();
  }

  private startTimer(): void {
    const levelConfig = this.levels[this.level - 1];
    const timerDuration = levelConfig.timerDuration;
    const startTime = Date.now();

    this.timer = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progress = (1 - elapsedTime / timerDuration) * 100;

      if (this.progressBar) {
        this.progressBar.style.width = `${Math.max(progress, 0)}%`;
      }

      if (elapsedTime >= timerDuration) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }

        if (this.blockMoveInterval) {
          clearInterval(this.blockMoveInterval);
          this.blockMoveInterval = null;
        }

        alert('Time is up! You lose.');
        this.level = 1;
        this.initializeGrid();
      }
    }, 100);
  }

  private resetTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.progressBar) {
      this.progressBar.style.width = '100%';
    }

    this.timerStarted = false;
  }

  private placeInitialBlocks(): void {
    let blockCount = 0;
    const totalBlocks =
      Math.floor(Math.random() * (this.maxBlocks - this.minBlocks + 1)) + this.minBlocks;

    while (blockCount < totalBlocks) {
      const randomIndex = Math.floor(Math.random() * this.cells.length);
      const cell = this.cells[randomIndex];

      if (
        !cell.classList.contains('block-cell') &&
        !cell.classList.contains('start-cell-yellow') &&
        !cell.classList.contains('end-cell-yellow') &&
        !cell.classList.contains('start-cell-blue') &&
        !cell.classList.contains('end-cell-blue') &&
        !cell.classList.contains('start-cell-red') &&
        !cell.classList.contains('end-cell-red') &&
        !cell.classList.contains('start-cell-green') &&
        !cell.classList.contains('end-cell-green') &&
        !cell.style.backgroundColor
      ) {
        cell.classList.add('block-cell');
        cell.setAttribute('data-block', 'true');
        cell.setAttribute('data-lifespan', this.blockLifespan.toString());
        blockCount++;
      }
    }

    this.blockMoveInterval = setInterval(
      () => this.moveBlocks(),
      this.levels[this.level - 1].blockMoveSpeed
    );
  }

  private moveBlocks(): void {
    this.adjustBlockProbability();

    this.cells.forEach((cell) => {
      if (cell.classList.contains('block-cell')) {
        const lifespan = parseInt(cell.getAttribute('data-lifespan') || '0', 10);

        if (lifespan <= 100) {
          cell.classList.remove('block-cell');
          cell.removeAttribute('data-block');
          cell.removeAttribute('data-lifespan');
        } else {
          cell.setAttribute('data-lifespan', (lifespan - 100).toString());
        }
      }
    });

    let currentBlockCount = this.cells.filter((cell) =>
      cell.classList.contains('block-cell')
    ).length;

    while (currentBlockCount < this.maxBlocks && currentBlockCount < this.cells.length) {
      const randomIndex = Math.floor(Math.random() * this.cells.length);
      const cell = this.cells[randomIndex];

      if (
        Math.random() < this.blockProbabilitySetting &&
        !cell.classList.contains('block-cell') &&
        !cell.classList.contains('start-cell-yellow') &&
        !cell.classList.contains('end-cell-yellow') &&
        !cell.classList.contains('start-cell-blue') &&
        !cell.classList.contains('end-cell-blue') &&
        !cell.classList.contains('start-cell-red') &&
        !cell.classList.contains('end-cell-red') &&
        !cell.classList.contains('start-cell-green') &&
        !cell.classList.contains('end-cell-green') &&
        !cell.style.backgroundColor
      ) {
        cell.classList.add('block-cell');
        cell.setAttribute('data-block', 'true');
        cell.setAttribute('data-lifespan', this.blockLifespan.toString());
        currentBlockCount++;
      }
    }
  }

  private adjustBlockProbability(): void {
    const filledCells = this.cells.filter(
      (cell) => cell.style.backgroundColor || cell.classList.contains('block-cell')
    ).length;

    const totalCells = this.gridSize * this.gridSize;
    const fillPercentage = filledCells / totalCells;

    this.blockProbabilitySetting = Math.max(0.1, 1 - fillPercentage);
  }

  private initializePaths(): void {
    this.paths = {};

    this.colors.forEach((color) => {
      this.paths[color] = {
        start: null,
        end: null,
        steps: [],
        current: [],
        moves: 0,
        completed: false
      };
    });
  }

  private placeStartAndEndCells(minMoves: number, maxMoves: number): void {
    let availableCells = this.cells
      .map((_, index) => index)
      .filter((idx) => !this.cells[idx].classList.contains('block-cell'));

    const usedCells = new Set<number>();

    this.colors.forEach((color) => {
      let movesPerColor: number;
      let attemptCount = 0;

      do {
        movesPerColor = Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves;
        attemptCount++;

        if (attemptCount > 100) {
          console.warn('Unable to generate valid path, retrying...');
          movesPerColor = minMoves;
          break;
        }
      } while (movesPerColor > availableCells.length - 2 || movesPerColor < minMoves);

      let colorPath: number[] = [];
      attemptCount = 0;

      do {
        colorPath = this.generatePath(availableCells.slice(), movesPerColor);
        attemptCount++;

        if (attemptCount > 100) {
          throw new Error('Unable to generate valid path');
        }
      } while (colorPath.length < minMoves + 1);

      this.setPath(colorPath, color);
      colorPath.forEach((idx) => usedCells.add(idx));
      availableCells = availableCells.filter((idx) => !usedCells.has(idx));
    });
  }

  private generatePath(availableCells: number[], moves: number): number[] {
    const path: number[] = [];
    let currentIdx = availableCells.splice(
      Math.floor(Math.random() * availableCells.length),
      1
    )[0];

    path.push(currentIdx);

    for (let i = 0; i < moves; i++) {
      const neighbors = this.getAvailableNeighbors(currentIdx, availableCells);

      if (neighbors.length === 0) {
        break;
      }

      currentIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
      path.push(currentIdx);
      availableCells = availableCells.filter((idx) => idx !== currentIdx);
    }

    return path;
  }

  private getAvailableNeighbors(idx: number, availableCells: number[]): number[] {
    const neighbors: number[] = [];
    const x = idx % this.gridSize;
    const y = Math.floor(idx / this.gridSize);

    if (x > 0 && availableCells.includes(idx - 1)) neighbors.push(idx - 1);
    if (x < this.gridSize - 1 && availableCells.includes(idx + 1)) neighbors.push(idx + 1);
    if (y > 0 && availableCells.includes(idx - this.gridSize)) neighbors.push(idx - this.gridSize);
    if (y < this.gridSize - 1 && availableCells.includes(idx + this.gridSize)) neighbors.push(idx + this.gridSize);

    return neighbors;
  }

  private setPath(pathArray: number[], color: GameColor): void {
    const startIdx = pathArray[0];
    const endIdx = pathArray[pathArray.length - 1];

    this.paths[color].start = startIdx;
    this.paths[color].end = endIdx;
    this.paths[color].steps = pathArray;
    this.paths[color].moves = pathArray.length - 1;
    this.paths[color].current = [startIdx];

    const startCell = this.cells[startIdx];
    const endCell = this.cells[endIdx];

    if (startCell) {
      startCell.classList.add(`start-cell-${color}`);
      const span = startCell.querySelector('span');
      if (span) {
        span.innerText = this.paths[color].moves.toString();
      }
    }

    if (endCell) {
      endCell.classList.add(`end-cell-${color}`);
    }
  }

  private attachEventListeners(): void {
    this.cells.forEach((cell) => {
      const onMouseDown = () => {
        const idx = this.cells.indexOf(cell);

        this.colors.forEach((color) => {
          if (this.paths[color].start === idx || this.paths[color].current.includes(idx)) {
            if (!this.timerStarted) {
              this.startTimer();
              this.timerStarted = true;
            }

            this.isDragging = true;
            this.currentColor = color;

            if (this.paths[color].start === idx) {
              this.resetPath(color);
            } else {
              this.clearCellsAfterIndex(idx, color, false);
            }

            this.paths[color].current = this.paths[color].current.slice(
              0,
              this.paths[color].current.indexOf(idx) + 1
            );

            cell.classList.add('active');
            this.currentCell = cell;
          }
        });
      };

      const onMouseMove = () => {
        if (this.isDragging && this.currentColor !== null) {
          const idx = this.cells.indexOf(cell);
          const lastIdx =
            this.paths[this.currentColor].current[
              this.paths[this.currentColor].current.length - 1
            ];
          const secondLastIdx =
            this.paths[this.currentColor].current[
              this.paths[this.currentColor].current.length - 2
            ];

          if (
            this.isValidMove(lastIdx, idx) &&
            !this.paths[this.currentColor].current.includes(idx) &&
            !this.isCellOccupiedByOtherColor(idx, this.currentColor) &&
            !this.cells[idx].classList.contains('block-cell') &&
            !this.isStartCell(idx) &&
            !this.isEndCellOfOtherColor(idx, this.currentColor)
          ) {
            if (
              (this.paths[this.currentColor].moves > 0 &&
                idx !== this.paths[this.currentColor].end) ||
              (this.paths[this.currentColor].moves === 1 &&
                idx === this.paths[this.currentColor].end)
            ) {
              this.paths[this.currentColor].current.push(idx);

              if (idx !== this.paths[this.currentColor].end) {
                cell.style.backgroundColor = this.getColorClass(this.currentColor);
              }

              this.currentCell = cell;
              this.paths[this.currentColor].moves--;
              this.updateSteps(this.currentColor);

              if (this.moveSound) {
                this.moveSound.currentTime = 0;
                this.moveSound.play().catch((error) =>
                  console.error('Error playing move sound:', error)
                );
              }

              if (idx === this.paths[this.currentColor].end) {
                this.paths[this.currentColor].completed = true;

                if (this.completeSound) {
                  this.completeSound.currentTime = 0;
                  this.completeSound.play().catch((error) =>
                    console.error('Error playing complete sound:', error)
                  );
                }
              }
            }
          } else if (idx === secondLastIdx) {
            if (
              this.paths[this.currentColor].current[
                this.paths[this.currentColor].current.length - 1
              ] === this.paths[this.currentColor].end
            ) {
              this.paths[this.currentColor].completed = false;
            }

            this.paths[this.currentColor].current.pop();

            const lastCell = this.cells[lastIdx];
            lastCell.style.backgroundColor = '';

            const span = lastCell.querySelector('span');
            if (span) {
              span.innerText = '';
            }

            this.currentCell = cell;
            this.paths[this.currentColor].moves++;
            this.updateSteps(this.currentColor);

            if (this.moveSound) {
              this.moveSound.currentTime = 0;
              this.moveSound.play().catch((error) =>
                console.error('Error playing move sound:', error)
              );
            }
          }
        }
      };

      const onMouseUp = () => {
        this.isDragging = false;
        this.checkWinCondition();
      };

      const onClick = (e: MouseEvent) => {
        e.preventDefault();
      };

      cell.addEventListener('mousedown', onMouseDown);
      cell.addEventListener('mousemove', onMouseMove);
      cell.addEventListener('mouseup', onMouseUp);
      cell.addEventListener('click', onClick);

      this.cleanupFns.push(() => {
        cell.removeEventListener('mousedown', onMouseDown);
        cell.removeEventListener('mousemove', onMouseMove);
        cell.removeEventListener('mouseup', onMouseUp);
        cell.removeEventListener('click', onClick);
      });
    });
  }

  private getColorClass(color: GameColor): string {
    switch (color) {
      case 'yellow': return '#FFD700';
      case 'blue': return '#1E90FF';
      case 'red': return '#FF4500';
      case 'green': return '#32CD32';
      default: return '';
    }
  }

  private isValidMove(lastIdx: number, idx: number): boolean {
    const x = lastIdx % this.gridSize;
    const y = Math.floor(lastIdx / this.gridSize);
    const newX = idx % this.gridSize;
    const newY = Math.floor(idx / this.gridSize);
    return Math.abs(x - newX) + Math.abs(y - newY) === 1;
  }

  private isCellOccupiedByOtherColor(idx: number, color: GameColor): boolean {
    return this.colors.some(
      (otherColor) => otherColor !== color && this.paths[otherColor].current.includes(idx)
    );
  }

  private isStartCell(idx: number): boolean {
    return this.colors.some((color) => this.paths[color].start === idx);
  }

  private isEndCellOfOtherColor(idx: number, color: GameColor): boolean {
    return this.colors.some(
      (otherColor) => otherColor !== color && this.paths[otherColor].end === idx
    );
  }

  private updateSteps(color: GameColor): void {
    this.cells.forEach((cell) => {
      const span = cell.querySelector('span');
      if (span && cell.style.backgroundColor === this.getColorClass(color)) {
        span.innerText = '';
      }
    });

    const currentIdx = this.paths[color].current[this.paths[color].current.length - 1];
    const currentCell = this.cells[currentIdx];

    if (currentCell) {
      const movesLeft = this.paths[color].moves;
      const span = currentCell.querySelector('span');

      if (span) {
        span.innerText = movesLeft > 0 ? movesLeft.toString() : '';
      }
    }
  }

  private resetPath(color: GameColor): void {
    this.paths[color].current.forEach((idx) => {
      const cell = this.cells[idx];

      if (cell !== this.cells[this.paths[color].start!] && cell !== this.cells[this.paths[color].end!]) {
        cell.style.backgroundColor = '';

        const span = cell.querySelector('span');
        if (span) {
          span.innerText = '';
        }

        cell.classList.remove(`highlight-${color}`);
      }
    });

    this.paths[color].current = [this.paths[color].start!];
    this.paths[color].moves = this.paths[color].steps.length - 1;
    this.updateSteps(color);
    this.paths[color].completed = false;
  }

  private clearCellsAfterIndex(idx: number, color: GameColor, keepActive = true): void {
    const startIdx = this.paths[color].current.indexOf(idx) + 1;
    const cellsToClear = this.paths[color].current.slice(startIdx);

    cellsToClear.forEach((cellIdx) => {
      const cell = this.cells[cellIdx];

      if (cell !== this.cells[this.paths[color].end!]) {
        cell.style.backgroundColor = '';

        const span = cell.querySelector('span');
        if (span) {
          span.innerText = '';
        }

        cell.classList.remove(`highlight-${color}`);
      }
    });

    this.paths[color].current = this.paths[color].current.slice(0, startIdx);
    this.paths[color].moves = this.paths[color].steps.length - this.paths[color].current.length - 1;

    if (!keepActive) {
      this.paths[color].moves++;
    }

    this.updateSteps(color);
    this.paths[color].completed = false;
  }

  private checkWinCondition(): void {
    const allPathsCompleted = this.colors.every((color) => this.paths[color].completed);

    if (allPathsCompleted) {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }

      if (this.blockMoveInterval) {
        clearInterval(this.blockMoveInterval);
        this.blockMoveInterval = null;
      }

      setTimeout(() => {
  if (this.level < this.levels.length) {
    this.level++;
    this.initializeGrid();
  } else {
 console.log('Game complete - updating Supabase');

 const player = this.auth.getCurrentUser();

if (!player) {
  console.error('No player found');
  this.router.navigate(['/login']);
  return;
}

this.playerService.completePathFinder().then((success) => {
  if (!success) {
    console.error('Failed to update stage');
    return;
  }

  const updatedPlayer = {
    ...player,
    stage: 2,
    progress: 1,
    completed_pathfinder_at: new Date().toISOString()
  };

  this.auth.setCurrentUser(updatedPlayer);
  this.auth.setStage(2);

  this.router.navigate(['/completed']);
}).catch((err) => {
  console.error('Error completing game:', err);
});
}
}, 500);
    }
  }


}



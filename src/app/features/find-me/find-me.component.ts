import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-find-me',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './find-me.component.html',
  styleUrl: './find-me.component.css'
})
export class FindMeComponent implements OnInit {
  readonly columns = 5;
  readonly rows = 4;

  readonly totalTiles = this.columns * this.rows;
  readonly emptyValue = -1;

  readonly imagePath = '/assets/images/image.png';

  board: number[] = [];
  moveCount = 0;
  isComplete = false;

  ngOnInit(): void {
    this.resetPuzzle();
  }

  resetPuzzle(): void {
    this.board = this.getSolvedBoard();
    this.moveCount = 0;
    this.isComplete = false;

    this.shuffleBoard(300);
  }

  getSolvedBoard(): number[] {
    const tiles = Array.from(
      { length: this.totalTiles - 1 },
      (_, i) => i
    );

    tiles.push(this.emptyValue);

    return tiles;
  }

  shuffleBoard(moves = 300): void {
    let emptyIndex = this.board.indexOf(this.emptyValue);

    for (let i = 0; i < moves; i++) {
      const movable = this.getMovableIndexes(emptyIndex);

      const randomIndex =
        movable[Math.floor(Math.random() * movable.length)];

      this.swapTiles(emptyIndex, randomIndex);

      emptyIndex = randomIndex;
    }

    if (this.isSolved()) {
      this.shuffleBoard(50);
    }
  }

  onTileClick(index: number): void {
    if (this.isComplete) return;

    const emptyIndex = this.board.indexOf(this.emptyValue);

    if (!this.canMove(index, emptyIndex)) {
      return;
    }

    this.swapTiles(index, emptyIndex);

    this.moveCount++;

    if (this.isSolved()) {
      this.isComplete = true;
    }
  }

  canMove(index: number, emptyIndex: number): boolean {
    return this.getMovableIndexes(emptyIndex).includes(index);
  }

  getMovableIndexes(emptyIndex: number): number[] {
    const indexes: number[] = [];

    const row = Math.floor(emptyIndex / this.columns);
    const col = emptyIndex % this.columns;

    if (row > 0) {
      indexes.push(emptyIndex - this.columns);
    }

    if (row < this.rows - 1) {
      indexes.push(emptyIndex + this.columns);
    }

    if (col > 0) {
      indexes.push(emptyIndex - 1);
    }

    if (col < this.columns - 1) {
      indexes.push(emptyIndex + 1);
    }

    return indexes;
  }

  swapTiles(a: number, b: number): void {
    [this.board[a], this.board[b]] =
      [this.board[b], this.board[a]];
  }

  isSolved(): boolean {
    for (let i = 0; i < this.totalTiles - 1; i++) {
      if (this.board[i] !== i) {
        return false;
      }
    }

    return this.board[this.totalTiles - 1] === this.emptyValue;
  }

  isEmpty(tile: number): boolean {
    return tile === this.emptyValue;
  }

  getTileStyle(tile: number): Record<string, string> {
    if (tile === this.emptyValue) {
      return {};
    }

    const row = Math.floor(tile / this.columns);
    const col = tile % this.columns;

    const x = `${(col / (this.columns - 1)) * 100}%`;
    const y = `${(row / (this.rows - 1)) * 100}%`;

    return {
      'background-image': `url('${this.imagePath}')`,
      'background-size': `${this.columns * 100}% ${this.rows * 100}%`,
      'background-position': `${x} ${y}`
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  get progressPercent(): number {
    const correctTiles = this.board.filter(
      (tile, index) =>
        tile !== this.emptyValue &&
        tile === index
    ).length;

    return (
      correctTiles /
      (this.totalTiles - 1)
    ) * 100;
  }
}
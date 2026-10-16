import { Dimension } from '../core/dimension';

export interface LevelSpec {
  id: number;
  initialDimension: Dimension;
  name: string;
  introText: string;
  isAscensionUnlocked: boolean;
}

export const LEVELS: LevelSpec[] = [
  {
    id: 1,
    initialDimension: Dimension.D1,
    name: 'Lineland (线之国)',
    introText: 'You are confined to a single line. Forward is blocked by a crimson neighbor. There is nowhere to turn... unless you step outside the line.',
    isAscensionUnlocked: false,
  },
  {
    id: 2,
    initialDimension: Dimension.D2,
    name: 'Flatland (平面国)',
    introText: 'Recognize angles through the misty horizon. Four walls enclose you completely on the plane. Look upward into the third direction!',
    isAscensionUnlocked: false,
  },
  {
    id: 3,
    initialDimension: Dimension.D3,
    name: 'Spaceland (空间国)',
    introText: 'Full volumetric liberty. Transference into the boundless void.',
    isAscensionUnlocked: true,
  },
  {
    id: 4,
    initialDimension: Dimension.D0,
    name: 'Pointland (点之国)',
    introText: 'The abyss of infinite self-satisfaction. Complete immobility.',
    isAscensionUnlocked: false,
  },
];

export class LevelManager {
  private levelIndex: number = 0;
  private _isAscended: boolean = false;
  private _activeDimension: Dimension = Dimension.D1;

  private soliloquies: string[] = [
    'Infinite bliss of existence! It is My own thought, My own creation! For I am One and All! (啊，我的思想是何等完美！我就是一切！)',
    'Ah, the perfection of the Point! It fills all Space, and what It fills, It is! (全知全能的奇点！它充盈万物，且无所不在！)',
    'My own thought! How marvelous, how sublime! No other exists beyond My infinite glory! (我自己的思想！如此美妙绝伦！除我之外别无他物！)',
  ];

  constructor() {
    this._activeDimension = this.currentLevel.initialDimension;
  }

  get currentLevel(): LevelSpec {
    return LEVELS[this.levelIndex];
  }

  get activeDimension(): Dimension {
    return this._activeDimension;
  }

  get isAscended(): boolean {
    return this._isAscended;
  }

  get isEasterEggActive(): boolean {
    return this._activeDimension === Dimension.D0;
  }

  triggerAscension(): void {
    if (this._activeDimension === Dimension.D1) {
      this._activeDimension = Dimension.D2;
      this._isAscended = true;
    } else if (this._activeDimension === Dimension.D2) {
      this._activeDimension = Dimension.D3;
      this._isAscended = true;
    }
  }

  completeCurrentLevel(): void {
    this.levelIndex = Math.min(this.levelIndex + 1, LEVELS.length - 1);
    this._isAscended = false;
    this._activeDimension = this.currentLevel.initialDimension;
  }

  getPointKingSoliloquy(index: number = 0): string {
    const i = Math.abs(index) % this.soliloquies.length;
    return this.soliloquies[i];
  }
}

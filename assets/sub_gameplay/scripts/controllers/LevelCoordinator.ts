import { LinelandGameController } from './LinelandGameController';
import { EscapeGameController } from './EscapeGameController';

export enum GameLevelId {
  LINELAND_PROLOGUE = 0,
  FLATLAND_ESCAPE = 1,
}

export interface LevelConfig {
  id: GameLevelId;
  title: string;
  dimensionBadge: string;
  identityText: string;
  omniTag: string;
  subjTag: string;
}

export const LEVEL_CONFIGS: Record<GameLevelId, LevelConfig> = {
  [GameLevelId.LINELAND_PROLOGUE]: {
    id: GameLevelId.LINELAND_PROLOGUE,
    title: '序幕 · 直线国之梦',
    dimensionBadge: '一维线段',
    identityText: '【序幕】直线国之梦',
    omniTag: '全知沙盘 · 单一直线世界剖面',
    subjTag: '肉身感官 · 纯一维中心视网膜',
  },
  [GameLevelId.FLATLAND_ESCAPE]: {
    id: GameLevelId.FLATLAND_ESCAPE,
    title: '第一幕 · 平面国石牢脱逃',
    dimensionBadge: '二维正方',
    identityText: '【第一幕】石牢脱逃',
    omniTag: '全知神谕沙盘 · 三维轴测',
    subjTag: '肉身受限感官 · 雾中辨角 (平面微薄视界)',
  },
};

export class LevelCoordinator {
  public currentLevelId: GameLevelId = GameLevelId.LINELAND_PROLOGUE;
  public lineland: LinelandGameController;
  public escape: EscapeGameController;
  public isLevelCompleted: boolean = false;

  constructor() {
    this.lineland = new LinelandGameController();
    this.escape = new EscapeGameController();
  }

  public get currentLevelConfig(): LevelConfig {
    return LEVEL_CONFIGS[this.currentLevelId];
  }

  public update(dt: number): void {
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      this.lineland.update(dt);
      if (this.lineland.gameState === 'VICTORY') {
        this.isLevelCompleted = true;
      }
    } else if (this.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
      this.escape.update(dt);
      if (this.escape.gameState === 'VICTORY') {
        this.isLevelCompleted = true;
      }
    }
  }

  public get completionManuscript(): { title: string; body: string; nextBtnText: string } {
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      return {
        title: '梦境顿悟 · 直线国梦呓',
        body: '“你在不可思议的‘侧向’踏出了一步。在直线上所有居民的眼中，你宛若神明般凭空蒸发。然而惊醒之时，你发现自己被关押在平面国最森严的四面石牢之中……”',
        nextBtnText: '进入第一幕 · 石牢脱逃',
      };
    } else {
      return {
        title: '维度觉醒 · 密室的虚妄',
        body: '“四面石壁封闭了世间所有的二维方向——向东、向西、向南、向北，皆是绝路。唯有遵从球体先知的神谕，向上跃入虚空，方知所谓坚不可摧的牢房，不过是虚妄的一张薄纸。”',
        nextBtnText: '重温试炼',
      };
    }
  }

  public advanceToNextLevel(): void {
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      this.currentLevelId = GameLevelId.FLATLAND_ESCAPE;
      this.isLevelCompleted = false;
      this.escape.reset();
    } else {
      this.resetCurrentLevel();
    }
  }

  public switchLevel(id: GameLevelId): void {
    this.currentLevelId = id;
    this.isLevelCompleted = false;
    this.resetCurrentLevel();
  }

  public resetCurrentLevel(): void {
    this.isLevelCompleted = false;
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      this.lineland.reset();
    } else {
      this.escape.reset();
    }
  }
}

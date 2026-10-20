import { LinelandGameController } from './LinelandGameController';
import { EscapeGameController } from './EscapeGameController';
import { PurgeGameController } from './PurgeGameController';

export enum GameLevelId {
  LINELAND_PROLOGUE = 0,
  FLATLAND_ESCAPE = 1,
  SPACELAND_PURGE = 2,
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
  [GameLevelId.SPACELAND_PURGE]: {
    id: GameLevelId.SPACELAND_PURGE,
    title: '第二幕 · 议会大清洗',
    dimensionBadge: '高维接引',
    identityText: '【第二幕】议会大清洗',
    omniTag: '全知沙盘 · 议会街区戒严网格',
    subjTag: '肉身感官 · 迷雾隐针与圣光圆域',
  },
};

export class LevelCoordinator {
  public currentLevelId: GameLevelId = GameLevelId.LINELAND_PROLOGUE;
  public lineland: LinelandGameController;
  public escape: EscapeGameController;
  public purge: PurgeGameController;
  public isLevelCompleted: boolean = false;

  constructor() {
    this.lineland = new LinelandGameController();
    this.escape = new EscapeGameController();
    this.purge = new PurgeGameController();
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
    } else if (this.currentLevelId === GameLevelId.SPACELAND_PURGE) {
      this.purge.update(dt);
      if (this.purge.gameState === 'VICTORY') {
        this.isLevelCompleted = true;
      }
    }
  }

  public get introManuscript(): { title: string; body: string; btnText: string } {
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      return {
        title: '【序幕背景】直线国之梦',
        body: '长假前夕的深宵，你——一位平面国的尊贵正方形绅士，在书房陷入沉睡。\n\n在梦境中，你降维坠入了一个只有“前后”而毫无“侧面”的一维单一直线国。由于一维居民只能看见物体的横截面，在你眼里是一条平直学者线段，在他们眼里你也仅是一段线段截面。\n\n前方是自命不凡、封闭道路的线之国王；后方是步步紧逼的暴躁邻人。两端皆是绝路，你必须打破一维心智，寻求破局之法！',
        btnText: '入梦启程',
      };
    } else if (this.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
      return {
        title: '【第一幕背景】平面石牢脱逃',
        body: '你重新恢复了四等边、四直角的正方形绅士尊容，却沦为阶下囚徒。\n\n因涉嫌传播“高维异端邪说”，你被统治层打入四面严密封闭的无缝石牢。门外驻守着凶残狭长的等腰三角形宪兵——他们的顶角极度锐利，被刺中便当场碎灭。\n\n在迷雾笼罩的牢狱里，平面方向绝无生路。唯有避开等腰守卫，收集散落的3枚球体先知神谕，方能唤醒超越平面的升维神力！',
        btnText: '开始脱逃',
      };
    } else {
      return {
        title: '【第二幕背景】议会大清洗',
        body: '你打破了石牢的二维死锁，然而整座平面国首都议会早已进入最高戒严状态。\n\n最高圆形理事会签发了严酷的议会清洗令，搜捕一切涉嫌传播“三维福音”的异端。议会外围五边形街道被严密封锁，近乎无形、致命穿刺的针形女性刺客在迷雾中高速巡弋，大祭司的圣光笼罩中庭。\n\n普通平面移动已无法脱离天罗地网。唯有搜集球体导师降下的3枚高维符印，彻底踏上飞跃平面的通往虚空法阵！',
        btnText: '突围飞升',
      };
    }
  }

  public get completionManuscript(): { title: string; body: string; nextBtnText: string } {
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      return {
        title: '【直线国梦呓】异端之罪',
        body: '“你在不可思议的‘侧向’踏出了一步。在直线上所有居民惊恐的尖叫中，你宛若神明般凭空蒸发，越过了国王并穿过梦境裂隙。\n\n然而从梦中猛然惊醒之时，你却发现自己并未身处温暖书房，而是因涉嫌‘传播高维邪说’被秘密逮捕，打入四面闭合的绝望石牢……”',
        nextBtnText: '进入第一幕 · 石牢脱逃',
      };
    } else if (this.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
      return {
        title: '【维度觉醒】密室的虚妄',
        body: '“四面石壁封闭了世间所有的二维方向——向东、向西、向南、向北，皆是绝路。唯有遵从球体先知的神谕，向上跃入虚空，方知所谓坚不可摧的牢房，不过是虚妄的一张薄纸。\n\n你已打破平面的桎梏，高维宇宙的真理正向你敞开大门。”',
        nextBtnText: '进入第二幕 · 议会大清洗',
      };
    } else {
      return {
        title: '【高维飞升】超脱二维之渊',
        body: '“在引渡法阵启动的一瞬间，球体导师将你从二维纸面彻底拔向苍穹！\n\n你第一次真正看到了整座平面国的全貌——房屋的内室、行人的五脏六腑、议会大厦的宏伟轮廓，在此刻毫无保留地呈现在你的眼底。平面国永恒的傲慢与偏见，在浩瀚无垠的三维虚空面前沦为微不足道的尘埃。”',
        nextBtnText: '重温三维奇迹',
      };
    }
  }

  public advanceToNextLevel(): void {
    if (this.currentLevelId === GameLevelId.LINELAND_PROLOGUE) {
      this.currentLevelId = GameLevelId.FLATLAND_ESCAPE;
      this.isLevelCompleted = false;
      this.escape.reset();
    } else if (this.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
      this.currentLevelId = GameLevelId.SPACELAND_PURGE;
      this.isLevelCompleted = false;
      this.purge.reset();
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
    } else if (this.currentLevelId === GameLevelId.FLATLAND_ESCAPE) {
      this.escape.reset();
    } else {
      this.purge.reset();
    }
  }
}


import { JuiceController } from '../../../../assets/main/scripts/core/juice/JuiceController';

export type PointlandPhase = 'POINTLAND' | 'EPILOGUE';

export interface MonarchMonologue {
  id: number;
  text: string;
  subtext: string;
  speaker: 'MONARCH' | 'SPHERE' | 'NARRATOR';
}

export class PointlandGameController {
  public gameState: 'PLAYING' | 'VICTORY' | 'DEFEATED' = 'PLAYING';
  public phase: PointlandPhase = 'POINTLAND';

  public juice: JuiceController;

  // 零维之渊：奇点国王状态
  public pointKing = {
    x: 0,
    y: 0,
    pulsePhase: 0,
    scale: 1.0,
    egoLevel: 0, // 自我膨胀层级 0 ~ 4
  };

  // 点之国国王独白库（严格遵循原著第 20 章）
  public readonly monologues: MonarchMonologue[] = [
    {
      id: 0,
      speaker: 'MONARCH',
      text: '“听啊！这崇高和谐的乐音！除了我，宇宙中还能有谁能发出如此完美的律动？”',
      subtext: '【点之国国王】“万物皆由我而生，我是全，我是一！”',
    },
    {
      id: 1,
      speaker: 'MONARCH',
      text: '“沉醉吧！这至高无上的自我独白！除我之外，虚空之中毫无他物！”',
      subtext: '【点之国国王】“世间一切声响，皆是我自身伟大意念的回响！”',
    },
    {
      id: 2,
      speaker: 'SPHERE',
      text: '“看到了吗，正方形？面对零维的盲目，即便神的呼唤，也会被他吞噬为自我的傲慢。”',
      subtext: '【球体导师之叹】“无维度的囚徒，甚至无法想象他者的存在。”',
    },
    {
      id: 3,
      speaker: 'NARRATOR',
      text: '“球体将你抛回平面国。你宣讲三维向上的福音，却被圆形最高议会以异端罪名永久囚禁……”',
      subtext: '【时代宣判】“判处正方形终身监禁于绝望石牢。”',
    },
  ];

  public currentMonologueIndex: number = 0;
  public totalInteractions: number = 0;

  // 终章绝笔手稿行（原著第 21~22 章与全书绝笔）
  public readonly epilogueManuscriptLines: string[] = [
    '【公元一八八四年 · 维多利亚石牢绝笔】',
    '数年来，我被禁锢在这具狭隘的二维躯壳与无缝石室之中。',
    '同胞们嘲弄我的疯癫，圆形统治者以死刑恐吓所有提及“第三维度”之人。',
    '甚至连我自己，有时也在漫长的黑暗里怀疑：那向上的高空，是否真是一场虚妄的梦境？',
    '然而我确曾亲眼目睹——密室无顶，箱匣洞开；众生心室齐跳，万物内脏毕现！',
    '真理已经揭示，即便肉身永堕石牢，浩瀚维度的光芒亦不可磨灭。',
    '致敬埃德温·A·艾勃特 (Edwin A. Abbott, 1838–1926) ——《平面国》全幕完。',
  ];

  public writtenLineIndex: number = 0;
  public manuscriptProgress: number = 0; // 0 ~ 1.0

  public soliloquy: string = '“在宇宙的最底层，有一个甚至没有维度的王国——点之国。”';

  public victoryManuscript: string = '【终幕手稿 · 绝笔真理】“即便身陷二维石牢，我心已翱翔于多维无垠虚空。”';

  constructor() {
    this.juice = new JuiceController();
  }

  public reset(): void {
    this.gameState = 'PLAYING';
    this.phase = 'POINTLAND';
    this.pointKing.egoLevel = 0;
    this.pointKing.pulsePhase = 0;
    this.currentMonologueIndex = 0;
    this.totalInteractions = 0;
    this.writtenLineIndex = 0;
    this.manuscriptProgress = 0;
    this.soliloquy = '“在宇宙的最底层，有一个甚至没有维度的王国——点之国。”';
  }

  public update(dt: number): void {
    if (this.gameState !== 'PLAYING') return;
    this.juice.update(dt);

    if (this.phase === 'POINTLAND') {
      // 奇点呼吸微颤
      this.pointKing.pulsePhase += dt * (3.0 + this.pointKing.egoLevel * 1.5);
      this.pointKing.scale = 1.0 + Math.sin(this.pointKing.pulsePhase) * 0.25;
    } else if (this.phase === 'EPILOGUE') {
      // 墨水渐显与羊皮纸光泽
      if (this.writtenLineIndex > 0) {
        this.manuscriptProgress = Math.min(
          1.0,
          this.writtenLineIndex / this.epilogueManuscriptLines.length
        );
      }
    }
  }

  // 玩家交互（按键、点击或空格）
  public interact(): boolean {
    if (this.gameState !== 'PLAYING') return false;

    if (this.phase === 'POINTLAND') {
      this.totalInteractions++;
      this.juice.addTrauma(0.35);

      if (this.currentMonologueIndex < this.monologues.length - 1) {
        this.currentMonologueIndex++;
        this.pointKing.egoLevel = Math.min(4, this.pointKing.egoLevel + 1);
        const mono = this.monologues[this.currentMonologueIndex];
        this.soliloquy = mono.text;
        return true;
      } else {
        // 完成零维体验，转入终章石牢绝笔
        this.phase = 'EPILOGUE';
        this.writtenLineIndex = 1;
        this.soliloquy = '“【终幕 · 牢狱绝笔】点击屏幕或按空格挥动鹅毛笔，书写回忆录绝笔……”';
        this.juice.addTrauma(0.5);
        return true;
      }
    } else if (this.phase === 'EPILOGUE') {
      this.juice.addTrauma(0.2);
      if (this.writtenLineIndex < this.epilogueManuscriptLines.length) {
        this.writtenLineIndex++;
        this.manuscriptProgress = this.writtenLineIndex / this.epilogueManuscriptLines.length;
        if (this.writtenLineIndex >= this.epilogueManuscriptLines.length) {
          // 达成全通关
          this.completeEpilogue();
        }
        return true;
      }
    }
    return false;
  }

  public completeEpilogue(): void {
    this.gameState = 'VICTORY';
    this.soliloquy = '“【绝笔封印】回忆录已盖上火漆印章。向所有勇敢凝视更高维度的思想者致敬。”';
    this.juice.addTrauma(0.7);
  }
}

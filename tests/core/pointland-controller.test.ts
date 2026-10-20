import { describe, it, expect, beforeEach } from 'vitest';
import { PointlandGameController } from '../../assets/sub_gameplay/scripts/controllers/PointlandGameController';

describe('PointlandGameController (终幕 · 零维之渊与牢狱绝笔)', () => {
  let controller: PointlandGameController;

  beforeEach(() => {
    controller = new PointlandGameController();
  });

  it('初始状态为零维点之国，奇点国王脉冲存在', () => {
    expect(controller.gameState).toBe('PLAYING');
    expect(controller.phase).toBe('POINTLAND');
    expect(controller.pointKing.egoLevel).toBe(0);
    expect(controller.currentMonologueIndex).toBe(0);
  });

  it('玩家在零维中输入交互，奇点国王将其吸收为自我膨胀独白', () => {
    // 第一次交互
    const ok1 = controller.interact();
    expect(ok1).toBe(true);
    expect(controller.currentMonologueIndex).toBe(1);
    expect(controller.pointKing.egoLevel).toBe(1);
    expect(controller.soliloquy).toContain('自我独白');

    // 第二次交互：球体导师之叹
    const ok2 = controller.interact();
    expect(ok2).toBe(true);
    expect(controller.currentMonologueIndex).toBe(2);
    expect(controller.soliloquy).toContain('零维的盲目');

    // 第三次交互：圆形议会宣判终身监禁
    const ok3 = controller.interact();
    expect(ok3).toBe(true);
    expect(controller.currentMonologueIndex).toBe(3);
    expect(controller.soliloquy).toContain('异端罪名');
  });

  it('完成点之国对话后顺利推进至阶段2：石牢绝笔，逐句书写回忆录并达成全篇通关', () => {
    // 快速走完点之国阶段
    controller.interact(); // 1
    controller.interact(); // 2
    controller.interact(); // 3
    controller.interact(); // 4 -> 切换到 EPILOGUE
    expect(controller.phase).toBe('EPILOGUE');
    expect(controller.writtenLineIndex).toBe(1);

    // 逐句落笔书写手稿
    while (controller.writtenLineIndex < controller.epilogueManuscriptLines.length) {
      controller.interact();
    }

    expect(controller.writtenLineIndex).toBe(controller.epilogueManuscriptLines.length);
    expect(controller.gameState).toBe('VICTORY');
    expect(controller.soliloquy).toContain('火漆印章');
  });
});

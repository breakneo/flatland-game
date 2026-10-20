import { describe, it, expect, beforeEach } from 'vitest';
import { LinelandGameController } from '../../assets/sub_gameplay/scripts/controllers/LinelandGameController';

describe('LinelandGameController (序幕·直线国之梦原著还原与物理感知)', () => {
  let controller: LinelandGameController;

  beforeEach(() => {
    controller = new LinelandGameController();
  });

  it('原著形态：主角是线段，邻人是质点，国王是长线段，且拥有开阔活动空间', () => {
    expect(controller.player.length).toBeGreaterThan(0.5); // 主角是一条线段
    expect(controller.neighbor.type).toBe('POINT'); // 暴躁邻人是质点
    expect(controller.king.type).toBe('LINE_SEGMENT'); // 线之国王是长线段
    expect(controller.king.length).toBeGreaterThan(1.8);

    // 初始间距开阔，玩家有充裕空间
    const space = controller.king.startX - controller.neighbor.x;
    expect(space).toBeGreaterThanOrEqual(8.0);
    expect(controller.canStepSideways).toBe(false);
  });

  it('必须在前后都移动过之后（体验前后绝路），才能解锁向两侧移动的能力', () => {
    // 尚未前后移动时，尝试 A/D 侧移无效
    controller.moveLateral(1, 0.1); // 尝试按 A
    expect(controller.player.y).toBe(0);
    controller.moveLateral(-1, 0.1); // 尝试按 D
    expect(controller.player.y).toBe(0);
    expect(controller.canStepSideways).toBe(false);

    // 仅前进（按 W）
    controller.moveAxis(1, 0.2);
    expect(controller.hasMovedForward).toBe(true);
    expect(controller.hasMovedBackward).toBe(false);
    expect(controller.canStepSideways).toBe(false);

    // 仅后退（按 S）
    controller.moveAxis(-1, 0.4);
    expect(controller.hasMovedBackward).toBe(true);

    // 前后均试探完毕，顿悟觉醒！
    expect(controller.canStepSideways).toBe(true);
  });

  it('解锁后，向左侧(A)或向右侧(D)均可脱离直线并越过国王通关', () => {
    // 达成前后探索
    controller.moveAxis(1, 0.1);
    controller.moveAxis(-1, 0.1);
    expect(controller.canStepSideways).toBe(true);

    // 测试向左侧 (A，y > 0)
    controller.moveLateral(1, 0.5);
    expect(controller.player.y).toBeGreaterThan(0.5);
    expect(controller.isSidestepping).toBe(true);

    // 越过国王长线段
    controller.player.x = 8.5;
    controller.update(0.016);
    expect(controller.gameState).toBe('VICTORY');

    // 重置后测试向右侧 (D，y < 0)
    controller.reset();
    controller.moveAxis(1, 0.1);
    controller.moveAxis(-1, 0.1);
    controller.moveLateral(-1, 0.5);
    expect(controller.player.y).toBeLessThan(-0.5);
    expect(controller.isSidestepping).toBe(true);

    // 同样能够自由越过国王抵达出口
    controller.player.x = 8.5;
    controller.update(0.016);
    expect(controller.gameState).toBe('VICTORY');
  });

  it('未脱离直线时，向前无法穿透国王长线段，向后无法穿透邻人质点', () => {
    // 持续向前冲撞国王线段前端
    for (let i = 0; i < 40; i++) {
      controller.moveAxis(1, 0.1);
    }
    // 主角线段前端必须被阻挡在国王线段前端之外
    expect(controller.player.x + controller.player.length / 2).toBeLessThanOrEqual(controller.king.startX);

    // 持续向后后退
    for (let i = 0; i < 80; i++) {
      controller.moveAxis(-1, 0.1);
    }
    // 主角线段后端必须被阻挡在邻人质点之外
    expect(controller.player.x - controller.player.length / 2).toBeGreaterThanOrEqual(controller.neighbor.x);
  });
});

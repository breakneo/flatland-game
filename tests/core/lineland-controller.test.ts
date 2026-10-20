import { describe, it, expect, beforeEach } from 'vitest';
import { LinelandGameController } from '../../assets/sub_gameplay/scripts/controllers/LinelandGameController';

describe('LinelandGameController (序幕·直线国之梦纯逻辑)', () => {
  let controller: LinelandGameController;

  beforeEach(() => {
    controller = new LinelandGameController();
  });

  it('初始状态位于单一直线世界，无侧移能力', () => {
    expect(controller.player.y).toBe(0);
    expect(controller.player.x).toBe(0);
    expect(controller.canStepSideways).toBe(false);
    expect(controller.isSidestepping).toBe(false);
    expect(controller.gameState).toBe('PLAYING');
  });

  it('在单一直线模式下受前后居民阻挡，无法穿透', () => {
    // 默认国王在 x = 2.5，邻人在 x = -2.5
    // 持续向右移动
    for (let i = 0; i < 20; i++) {
      controller.move(1, 0, 0.1);
    }
    // 必须被阻挡在国王左侧安全距离
    expect(controller.player.x).toBeLessThan(controller.king.x);
    expect(controller.player.y).toBe(0);

    // 持续向左移动
    for (let i = 0; i < 40; i++) {
      controller.move(-1, 0, 0.1);
    }
    // 必须被阻挡在邻人右侧
    expect(controller.player.x).toBeGreaterThan(controller.neighbor.x);
    expect(controller.player.y).toBe(0);
  });

  it('前后居民步步紧逼触发死锁并激活侧移顿悟', () => {
    // 模拟时间流逝，居民逐渐向中心压迫
    for (let i = 0; i < 50; i++) {
      controller.update(0.1);
    }
    expect(controller.isDeadlocked).toBe(true);
    expect(controller.canStepSideways).toBe(true);
  });

  it('触发侧移后跨越至二维侧面，成功穿透国王抵达梦境裂隙通关', () => {
    // 强制触发死锁
    controller.forceDeadlock();
    expect(controller.canStepSideways).toBe(true);

    // 执行向侧面一步
    const stepped = controller.stepSideways();
    expect(stepped).toBe(true);
    expect(controller.isSidestepping).toBe(true);
    expect(controller.player.y).toBeGreaterThan(0); // 获得了侧面 Y 坐标！

    // 此时向右移动，能够越过国王阻挡
    for (let i = 0; i < 50; i++) {
      controller.move(1, 0, 0.1);
    }
    expect(controller.player.x).toBeGreaterThan(controller.king.x);

    // 抵达终点裂隙
    controller.player.x = 4.8;
    controller.update(0.016);
    expect(controller.gameState).toBe('VICTORY');
  });
});

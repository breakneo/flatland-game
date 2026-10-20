import { describe, it, expect, beforeEach } from 'vitest';
import { SpacelandGameController } from '../../assets/sub_gameplay/scripts/controllers/SpacelandGameController';

describe('SpacelandGameController (第二幕·空间国启蒙与内脏全知纯逻辑)', () => {
  let controller: SpacelandGameController;

  beforeEach(() => {
    controller = new SpacelandGameController();
  });

  it('初始状态处于反锁书房，球体在三维空间中穿透平面产生动态圆截面', () => {
    expect(controller.phase).toBe('CROSS_SECTION');
    expect(controller.gameState).toBe('PLAYING');
    expect(controller.isAscended).toBe(false);
    expect(controller.sphere.radius3D).toBe(1.6);

    // 当球体在 Z = 0 时，截面半径等于球体半径
    controller.sphere.z = 0;
    expect(controller.sphereCrossSectionRadius).toBeCloseTo(1.6, 2);

    // 当球体在 Z = 1.2 时，截面半径缩小: sqrt(1.6^2 - 1.2^2) = sqrt(1.12) ≈ 1.058
    controller.sphere.z = 1.2;
    expect(controller.sphereCrossSectionRadius).toBeCloseTo(Math.sqrt(1.6 * 1.6 - 1.2 * 1.2), 2);

    // 当球体脱离平面 (|Z| > 1.6) 时，截面为 0 (凭空消失)
    controller.sphere.z = 2.0;
    expect(controller.sphereCrossSectionRadius).toBe(0);
  });

  it('当球体截面显现且玩家靠近时，触碰球体完成截面启蒙，进入密室解谜阶段', () => {
    controller.sphere.z = 0; // 球体完全显现
    controller.player.x = controller.sphere.x + 1.2;
    controller.player.y = controller.sphere.y;

    const ok = controller.interactWithSphere();
    expect(ok).toBe(true);
    expect(controller.phase).toBe('CABINET_PUZZLE');
    expect(controller.soliloquy).toContain('密室');
  });

  it('在二维平面无法穿透反锁铁箱，听从球体指引借助高维矢量可探入内部取出绝密手稿', () => {
    controller.phase = 'CABINET_PUZZLE';
    // 玩家走到铁箱左侧
    controller.player.x = controller.cabinet.x - 1.4;
    controller.player.y = controller.cabinet.y;

    // 二维直接向前移动会被铁箱四壁阻挡
    controller.movePlayer(1, 0, 0.1);
    expect(controller.player.x).toBeLessThanOrEqual(controller.cabinet.x - controller.cabinet.halfSize);

    // 唤醒高维之手，从上方探入铁箱内部
    const retrieved = controller.reachIntoCabinet();
    expect(retrieved).toBe(true);
    expect(controller.hasRetrievedManuscript).toBe(true);
  });

  it('取出绝密手稿后由球体引渡飞升至空间国，视界拔高并俯瞰密室内部', () => {
    controller.phase = 'CABINET_PUZZLE';
    controller.hasRetrievedManuscript = true;

    const ascendOk = controller.triggerAscend();
    expect(ascendOk).toBe(true);
    expect(controller.isAscended).toBe(true);
    expect(controller.phase).toBe('ASCENDED');

    // 经历飞升观测后触发全知通关
    controller.update(1.0);
    controller.altitude = 4.5;
    controller.completeEnlightenment();

    expect(controller.gameState).toBe('VICTORY');
    expect(controller.victoryManuscript).toContain('内脏');
  });

  it('第一人称射线检测真实反映球体截面的存在与消失', () => {
    // 玩家正对球体
    controller.player.x = controller.sphere.x + 2.0;
    controller.player.y = controller.sphere.y;
    controller.player.angle = Math.PI; // 朝西正对球体

    // 1. 球体在平面内 (Z = 0)
    controller.sphere.z = 0;
    let rays = controller.castRays(30);
    const centerHit = rays[15];
    expect(centerHit.hitType).toBe('sphere');
    expect(centerHit.distance).toBeCloseTo(2.0 - 1.6, 1); // 命中球体外表面

    // 2. 球体脱离平面 (Z = 2.5) -> 光线穿透打在后方书房墙壁上
    controller.sphere.z = 2.5;
    rays = controller.castRays(30);
    expect(rays[15].hitType).toBe('wall');
  });
});

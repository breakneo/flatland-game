# 《平面国：正方形的迷雾救赎》极简原型实施计划 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建《平面国：正方形的迷雾救赎》极简垂直切片原型（Vertical Slice：平面国石牢脱逃记），实现 9:16 竖屏双视窗（上屏 3D 全知神谕沙盘 + 下屏 2D 雾中辨角感官）、等腰巡逻兵致命穿刺、即时避险手感（Juice 震屏/慢放）与“向上，而不是向北”高维跃迁翻墙脱逃。

**Architecture:** 纯 TypeScript + 单一数据源状态驱动。纯逻辑层与表现层严格解耦（`assets/main/scripts/core/` 目录严禁导入 Cocos API，遵从 `GEMINI.md` 红线）；复用母库底座 `EventBus`、`NodePoolManager`、`BaseFSM`；双视窗分别订阅世界状态并实时渲染。

**Tech Stack:** TypeScript, Node.js / Vitest (TDD 单元测试), 原生 HTML5 Canvas / 竖屏 WebGL 模拟器 (维多利亚古典铜版画刻版色调), Cocos Creator 3.x 工业级组件规范。

**Spec:** [`GAME_SPEC.md`](file:///Users/neo/Anti/flatland-game/GAME_SPEC.md)

## Global Constraints
- **纯逻辑严格解耦**：`assets/main/scripts/core/` 严禁导入 Cocos API（`import { Node, Component } from 'cc'`）；
- **纯中文古典刻版文风**：界面与手稿严格保持纯正典雅文风，严禁任何中英混杂；
- **首包极轻量**：纯矢量与代码线框渲染，首包体积 < 500KB，无外部重物理引擎依赖；
- **性能与 DrawCall 门禁**：DrawCall <= 35，运行稳态内存 <= 300MB；
- **对象池 100% 覆盖**：射线柱、扫描片、震屏粒子、预制体全数复用 `NodePoolManager`。

## Review Focus
1. **等腰三角形尖角致命区穿刺判定**：等腰三角形以极小锐角（< 15°）逼近时，角尖判定需绝对精确，不可产生误判穿模或漏判；
2. **掠射角极端逼近时的射线渐变稳定性**：当视线与墙壁平行时，分母趋近零需平滑钳位，杜绝 NaN 震颤；
3. **升维跃迁过程中的状态防重入保护**：在 3D 滞空浮空状态下，重复触发升维必须被优雅拦截，并在 3 秒计时结束时平滑回落；
4. **震屏与顿挫 (Hit Stop) 计时独立性**：游戏在 0.08s 冻结帧期间物理模拟需暂停，但 UI 动画与音效不可死锁；
5. **双视窗渲染性能与内存红线**：双视窗单帧数学开销控制在 2ms 内，重开场景对象池 100% 回收无内存泄漏。

---

### Task 1: 等腰三角形锐角致命碰撞与几何模型 (Isosceles Collision & Geometry)

**Files:**
- Create: `assets/main/scripts/core/geometry/IsoscelesCollider.ts`
- Test: `tests/core/isosceles-collider.test.ts`

**Interfaces:**
- Produces:
  - `interface Point2D { x: number; y: number }`
  - `interface IsoscelesTriangle { apex: Point2D; baseLeft: Point2D; baseRight: Point2D; headingAngle: number }`
  - `function checkSquareTriangleCollision(squareCenter: Point2D, squareSize: number, triangle: IsoscelesTriangle): boolean`
  - `function getNearMissDistance(squareCenter: Point2D, triangle: IsoscelesTriangle): number`

- [ ] **Step 1: Write failing test in `tests/core/isosceles-collider.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { checkSquareTriangleCollision, getNearMissDistance, IsoscelesTriangle } from '../../assets/main/scripts/core/geometry/IsoscelesCollider';

describe('Isosceles Triangle Lethal Collision Model', () => {
  const triangle: IsoscelesTriangle = {
    apex: { x: 5, y: 0 },
    baseLeft: { x: 3, y: -1 },
    baseRight: { x: 3, y: 1 },
    headingAngle: 0,
  };

  it('should detect lethal penetration when square touches the sharp apex', () => {
    // Square touching apex (5, 0)
    const isHit = checkSquareTriangleCollision({ x: 5.2, y: 0 }, 1.0, triangle);
    expect(isHit).toBe(true);
  });

  it('should not collide when square is safely outside lethal bounding', () => {
    const isHit = checkSquareTriangleCollision({ x: 10, y: 0 }, 1.0, triangle);
    expect(isHit).toBe(false);
  });

  it('should calculate near-miss distance when passing dangerously close', () => {
    const distance = getNearMissDistance({ x: 5.8, y: 0 }, triangle);
    expect(distance).toBeCloseTo(0.8, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/isosceles-collider.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `assets/main/scripts/core/geometry/IsoscelesCollider.ts`**

Implement point-to-triangle SAT (Separating Axis Theorem) and vertex distance calculation with zero Cocos dependencies.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/isosceles-collider.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add assets/main/scripts/core/geometry/IsoscelesCollider.ts tests/core/isosceles-collider.test.ts
git commit -m "feat(core): implement isosceles lethal collision and near-miss detection"
```

---

### Task 2: 雾中辨角实时明暗射线检测引擎 (Fog-Angle Raycast Engine)

**Files:**
- Create: `assets/main/scripts/core/geometry/FogRaycast.ts`
- Test: `tests/core/fog-raycast.test.ts`

**Interfaces:**
- Produces:
  - `interface FogRayHit { angleOffset: number; distance: number; brightness: number; hitType: 'wall' | 'isosceles' | 'exit'; color: string }`
  - `function computeFogVisionRays(origin: Point2D, angle: number, walls: Array<{ x1: number; y1: number; x2: number; y2: number; color?: string }>, triangles: IsoscelesTriangle[], fovDegrees?: number, rayCount?: number, maxDist?: number): FogRayHit[]`

- [ ] **Step 1: Write failing test in `tests/core/fog-raycast.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { computeFogVisionRays } from '../../assets/main/scripts/core/geometry/FogRaycast';

describe('Fog-Angle Recognition Raycaster (雾中辨角引擎)', () => {
  it('should cast rays and recognize darker shading for closer obstacles', () => {
    const walls = [{ x1: 5, y1: -5, x2: 5, y2: 5, color: '#1a1611' }];
    const rays = computeFogVisionRays({ x: 0, y: 0 }, 0, walls, [], 60, 5, 20);

    expect(rays).toHaveLength(5);
    const centerRay = rays[2];
    expect(centerRay.distance).toBeCloseTo(5, 1);
    expect(centerRay.brightness).toBeGreaterThan(0.6); // Close wall is dark/distinct
    expect(centerRay.hitType).toBe('wall');
  });

  it('should identify isosceles triangle shadow in the misty field of view', () => {
    const triangle = {
      apex: { x: 4, y: 0 },
      baseLeft: { x: 2, y: -1 },
      baseRight: { x: 2, y: 1 },
      headingAngle: 0,
    };
    const rays = computeFogVisionRays({ x: 0, y: 0 }, 0, [], [triangle], 60, 5, 20);
    const centerRay = rays[2];
    expect(centerRay.hitType).toBe('isosceles');
    expect(centerRay.distance).toBeCloseTo(4, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/fog-raycast.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `assets/main/scripts/core/geometry/FogRaycast.ts`**

Implement multi-entity 2D line segment and triangle perimeter intersection with Abbot's fog-fade formula.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/fog-raycast.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add assets/main/scripts/core/geometry/FogRaycast.ts tests/core/fog-raycast.test.ts
git commit -m "feat(core): implement fog-angle recognition raycaster"
```

---

### Task 3: 升维状态机与高维滞空控制 (Ascension FSM & 3D Levitation)

**Files:**
- Create: `assets/main/scripts/core/fsm/AscensionFSM.ts`
- Test: `tests/core/ascension-fsm.test.ts`

**Interfaces:**
- Consumes: `BaseFSM` from `assets/main/scripts/core/fsm/BaseFSM.ts`
- Produces:
  - `enum AscensionState { PLANE_2D = 'PLANE_2D', ASCENDING_3D = 'ASCENDING_3D', POINT_0D = 'POINT_0D' }`
  - `class AscensionFSM extends BaseFSM`
  - `chargeEnergy(amount: number): void`
  - `triggerAscend(durationSeconds?: number): boolean`
  - `update(dt: number): void`
  - `get currentZ(): number`
  - `get energy(): number`

- [ ] **Step 1: Write failing test in `tests/core/ascension-fsm.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { AscensionFSM, AscensionState } from '../../assets/main/scripts/core/fsm/AscensionFSM';

describe('Ascension FSM (升维状态机: 向上，而不是向北)', () => {
  it('should initialize in PLANE_2D with zero Z elevation', () => {
    const fsm = new AscensionFSM();
    expect(fsm.currentState).toBe(AscensionState.PLANE_2D);
    expect(fsm.currentZ).toBe(0);
  });

  it('should deny ascension when energy is insufficient', () => {
    const fsm = new AscensionFSM();
    const success = fsm.triggerAscend(3);
    expect(success).toBe(false);
    expect(fsm.currentState).toBe(AscensionState.PLANE_2D);
  });

  it('should ascend to 3D and levitate Z when fully charged', () => {
    const fsm = new AscensionFSM();
    fsm.chargeEnergy(100);
    const success = fsm.triggerAscend(3);
    expect(success).toBe(true);
    expect(fsm.currentState).toBe(AscensionState.ASCENDING_3D);

    fsm.update(0.5);
    expect(fsm.currentZ).toBeGreaterThan(0); // Levitation in progress

    // After duration completes
    fsm.update(3.0);
    expect(fsm.currentState).toBe(AscensionState.PLANE_2D);
    expect(fsm.currentZ).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/ascension-fsm.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `assets/main/scripts/core/fsm/AscensionFSM.ts`**

Implement smooth sine-based height interpolation and energy consumption on top of `BaseFSM`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/ascension-fsm.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add assets/main/scripts/core/fsm/AscensionFSM.ts tests/core/ascension-fsm.test.ts
git commit -m "feat(core): implement ascension state machine and 3D levitation"
```

---

### Task 4: 等腰巡逻兵行为状态机与避险探测 (Isosceles Patrol Agent & Near-Miss)

**Files:**
- Create: `assets/main/scripts/core/ai/PatrolAgent.ts`
- Test: `tests/core/patrol-agent.test.ts`

**Interfaces:**
- Produces:
  - `class PatrolAgent`
  - `constructor(waypoints: Point2D[], moveSpeed?: number)`
  - `update(dt: number, targetPos: Point2D, isTargetAscended: boolean): { isColliding: boolean; isNearMiss: boolean }`
  - `get currentTriangle(): IsoscelesTriangle`

- [ ] **Step 1: Write failing test in `tests/core/patrol-agent.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { PatrolAgent } from '../../assets/main/scripts/core/ai/PatrolAgent';

describe('Isosceles Patrol Agent Behavior', () => {
  it('should navigate between waypoints and detect near-miss heartbeat distance', () => {
    const waypoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const agent = new PatrolAgent(waypoints, 2);

    agent.update(1.0, { x: 20, y: 20 }, false);
    expect(agent.currentTriangle.apex.x).toBeGreaterThan(0);

    // Player positioned in near-miss zone (dangerous passing)
    const result = agent.update(0.1, { x: agent.currentTriangle.apex.x + 1.2, y: agent.currentTriangle.apex.y }, false);
    expect(result.isNearMiss).toBe(true);
    expect(result.isColliding).toBe(false);
  });

  it('should bypass collision when player has ascended into 3D', () => {
    const waypoints = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    const agent = new PatrolAgent(waypoints, 2);
    // Touching coordinates but ascended
    const result = agent.update(0.1, { x: agent.currentTriangle.apex.x, y: agent.currentTriangle.apex.y }, true);
    expect(result.isColliding).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/patrol-agent.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `assets/main/scripts/core/ai/PatrolAgent.ts`**

Implement waypoint cycling, rotation alignment, and 3D altitude safety bypass.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/patrol-agent.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add assets/main/scripts/core/ai/PatrolAgent.ts tests/core/patrol-agent.test.ts
git commit -m "feat(core): implement isosceles patrol agent and near-miss detection"
```

---

### Task 5: 手感表现力控制器与震屏顿挫 (Game Juice & Trauma Screen Shake)

**Files:**
- Create: `assets/main/scripts/core/juice/JuiceController.ts`
- Test: `tests/core/juice-controller.test.ts`

**Interfaces:**
- Produces:
  - `class JuiceController`
  - `addTrauma(amount: number): void`
  - `triggerHitStop(durationMs?: number): void`
  - `update(dt: number): { offsetX: number; offsetY: number; isFrozen: boolean }`

- [ ] **Step 1: Write failing test in `tests/core/juice-controller.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { JuiceController } from '../../assets/main/scripts/core/juice/JuiceController';

describe('Game Juice & Screen Shake Controller', () => {
  it('should generate high-frequency decaying shake offset when trauma is added', () => {
    const juice = new JuiceController();
    juice.addTrauma(0.8);
    const frame1 = juice.update(0.016);
    expect(frame1.offsetX !== 0 || frame1.offsetY !== 0).toBe(true);

    // Decays over time
    for (let i = 0; i < 60; i++) juice.update(0.016);
    const frameDecayed = juice.update(0.016);
    expect(Math.abs(frameDecayed.offsetX)).toBeLessThan(0.05);
  });

  it('should freeze physics updates during hit stop duration', () => {
    const juice = new JuiceController();
    juice.triggerHitStop(80); // 80ms hit stop
    const frame = juice.update(0.02);
    expect(frame.isFrozen).toBe(true);

    juice.update(0.07);
    const frameAfter = juice.update(0.01);
    expect(frameAfter.isFrozen).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/core/juice-controller.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `assets/main/scripts/core/juice/JuiceController.ts`**

Implement squared-trauma camera shake formula and non-blocking millisecond hit-stop timer.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/core/juice-controller.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add assets/main/scripts/core/juice/JuiceController.ts tests/core/juice-controller.test.ts
git commit -m "feat(core): implement game juice trauma shake and hit-stop controller"
```

---

### Task 6: 竖屏双视窗整合与关卡脱逃可玩闭环 (Vertical Slice Integration)

**Files:**
- Create: `assets/sub_gameplay/scripts/controllers/EscapeGameController.ts`
- Create: `index.html`
- Create: `src/style.css`
- Create: `src/main.ts`
- Test: `tests/integration/escape-slice.test.ts`

**Interfaces:**
- Produces:
  - `class EscapeGameController`
  - Integration smoke test validating 60 FPS update loop, dual-viewport synchronization, death-reset, and manuscript victory sequence.

- [ ] **Step 1: Write integration test in `tests/integration/escape-slice.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { EscapeGameController } from '../../assets/sub_gameplay/scripts/controllers/EscapeGameController';

describe('Vertical Slice Escape Integration', () => {
  it('should run complete gameplay cycle: move, near-miss, ascend, and reach exit', () => {
    const game = new EscapeGameController();
    expect(game.gameState).toBe('PLAYING');

    // Charge energy and trigger ascension
    game.addEnergy(100);
    game.requestAscension();
    expect(game.isAscended).toBe(true);

    // Cross barrier to exit
    game.teleportNearExit();
    game.update(0.1);
    expect(game.gameState).toBe('VICTORY');
    expect(game.victoryManuscript).toContain('向上，而不是向北');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/integration/escape-slice.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `EscapeGameController.ts`, `index.html`, `src/style.css`, and `src/main.ts`**

- Wire all core modules (`IsoscelesCollider`, `FogRaycast`, `AscensionFSM`, `PatrolAgent`, `JuiceController`) into `EscapeGameController`.
- Render top 3D sandtable canvas and bottom 2D fog vision canvas in 9:16 mobile frame with virtual joystick and "向上，而不是向北" button.
- Implement death crack animation + manuscript flip modal.

- [ ] **Step 4: Run full test suite and verify 100% pass**

Run: `pnpm test`
Expected: All 6 suites PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add assets/ tests/ index.html src/ package.json tsconfig.json
git commit -m "feat(gameplay): complete Victorian Flatland escape vertical slice with juice and dual viewports"
```

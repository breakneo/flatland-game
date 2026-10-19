# Flatland Mini-Game Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建《平面国》双视窗（主观受限视角 + 全知 3D 俯瞰视角）极简交互原型，实现 1D -> 2D -> 3D 渐进升维闯关与 0D 点国终局彩蛋。

**Architecture:** 纯 TypeScript + 单一数据源驱动模式。核心状态机（`DimensionState`）控制玩家自由度（DOF）；两个独立的渲染管线（`SubjectiveRenderer` 和 `OmniscientRenderer`）订阅同一玩家与世界状态，分别渲染低维受限感官与高维 3D 俯瞰沙盘。

**Tech Stack:** TypeScript, Node.js / Vitest (TDD 单元测试), 原生 HTML5 Canvas / WebGL (维多利亚铜版画着色), Cocos Creator 架构兼容设计。

**Spec:** [`TASK_SPEC.md`](file:///Users/neo/Anti/Brainstorm/TASK_SPEC.md)

## Global Constraints
- **无外部重量级 3D 引擎依赖**：禁止引入大型物理引擎（ammo.js/cannon.js），碰撞与视野完全基于纯数学射线求交与网格计算。
- **纯 IAA 极简合规**：无需任何充值系统与服务端数据库，单机纯本地离线闭环。
- **首包轻量化**：纯代码与程序化矢量图形绘制（无需外部 3D 模型资产），首包体积 < 500KB。
- **维多利亚复古美学**：黑白铜版画细线（Engraving lines）+ 羊皮纸底色（#f4eedb）+ 黑色高对比度几何图形。

## Review Focus
1. **1D 主观视界在零距离碰撞时的退化问题**：当玩家脸贴障碍物时，视线距离为 0，亮度与像素需平滑钳位，不能产生 NaN 或除零异常。
2. **2D“雾中辨角”算法在极端角度的数值稳定性**：掠射角接近 0 度时，光带投影长度需平滑衰减，避免视线抖动或光带拉伸撕裂。
3. **升维过渡时刻的状态同步**：从 1D 跃迁至 2D 时，玩家位置必须保持连续性，全知视角与主观视角必须无缝平滑插值解锁新轴。
4. **0D 彩蛋的按键安全防护**：零维模式下所有方向输入必须被优雅拦截，转为触发点之国王的哲学独白，严禁引发越界移动异常。
5. **双视窗渲染性能控制**：双 Canvas 刷新率需稳定在 60 FPS，单帧数学计算耗时控制在 2ms 以内。

---

## File Structure
- `package.json`, `tsconfig.json`, `vitest.config.ts`: 构建与测试环境配置
- `src/core/dimension.ts`: 维度类型定义、自由度限制与状态枚举
- `src/core/world.ts`: 世界地图几何数据（点、线段、多边形、体积框）与玩家实体状态
- `src/render/subjective.ts`: 主观第一人称视界投影算法（1D 点色斑、2D 雾气光带、3D 视锥）
- `src/render/omniscient.ts`: 全知 3D 视界投影渲染（维多利亚沙盘轴测与俯瞰）
- `src/game/level-manager.ts`: 关卡循环、升维条件判定、通关彩蛋逻辑
- `src/main.ts`: 双视窗输入绑定、RAF 渲染循环与 UI 控制器
- `index.html`, `src/style.css`: 维多利亚复古铜版画双视窗展示页面

---

### Task 1: 基础设施配置与核心领域模型 (Core Dimension State & DOF)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/core/dimension.ts`
- Create: `src/core/world.ts`
- Test: `tests/core/dimension.test.ts`

**Interfaces:**
- Produces:
  - `enum Dimension { D0, D1, D2, D3 }`
  - `interface Vector3 { x: number; y: number; z: number }`
  - `interface PlayerState { position: Vector3; rotation: number; dimension: Dimension }`
  - `function getDegreesOfFreedom(dim: Dimension): { canMoveX: boolean; canMoveY: boolean; canMoveZ: boolean }`
  - `function canMoveInDirection(dim: Dimension, delta: Vector3): boolean`

- [ ] **Step 1: Write failing test in `tests/core/dimension.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { Dimension, getDegreesOfFreedom, canMoveInDirection } from '../../src/core/dimension';

describe('Dimension System', () => {
  it('should restrict degrees of freedom correctly across dimensions', () => {
    expect(getDegreesOfFreedom(Dimension.D0)).toEqual({ canMoveX: false, canMoveY: false, canMoveZ: false });
    expect(getDegreesOfFreedom(Dimension.D1)).toEqual({ canMoveX: true, canMoveY: false, canMoveZ: false });
    expect(getDegreesOfFreedom(Dimension.D2)).toEqual({ canMoveX: true, canMoveY: true, canMoveZ: false });
    expect(getDegreesOfFreedom(Dimension.D3)).toEqual({ canMoveX: true, canMoveY: true, canMoveZ: true });
  });

  it('should validate allowed movement directions based on active dimension', () => {
    expect(canMoveInDirection(Dimension.D1, { x: 1, y: 0, z: 0 })).toBe(true);
    expect(canMoveInDirection(Dimension.D1, { x: 0, y: 1, z: 0 })).toBe(false);
    expect(canMoveInDirection(Dimension.D2, { x: 1, y: 1, z: 0 })).toBe(true);
    expect(canMoveInDirection(Dimension.D2, { x: 0, y: 0, z: 1 })).toBe(false);
    expect(canMoveInDirection(Dimension.D0, { x: 1, y: 0, z: 0 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/dimension.test.ts`
Expected: FAIL (modules not found / syntax error)

- [ ] **Step 3: Implement dependencies and `src/core/dimension.ts` & `src/core/world.ts`**

Initialize minimal `package.json`, install typescript and vitest, implement `Dimension` enum and movement constraints in `src/core/dimension.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/dimension.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/core/ tests/core/
git commit -m "feat(core): implement dimension state machine and degrees of freedom"
```

---

### Task 2: 1D 主观受限感官计算引擎 (1D Subjective Sight Ray)

**Files:**
- Create: `src/render/subjective-1d.ts`
- Test: `tests/render/subjective-1d.test.ts`

**Interfaces:**
- Consumes: `PlayerState`, `Dimension` from `src/core/dimension.ts`
- Produces:
  - `interface SightPoint1D { distance: number; brightness: number; colorHex: string; isBlocked: boolean }`
  - `function compute1DSight(playerX: number, obstacles: Array<{ x: number; colorHex: string }>, maxViewDistance?: number): { forward: SightPoint1D; backward: SightPoint1D }`

- [ ] **Step 1: Write failing test in `tests/render/subjective-1d.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { compute1DSight } from '../../src/render/subjective-1d';

describe('1D Subjective Sight Engine', () => {
  it('should detect forward and backward obstacle points and calculate distance attenuation', () => {
    const obstacles = [
      { x: 5, colorHex: '#ff0000' },
      { x: -3, colorHex: '#00ff00' }
    ];
    const sight = compute1DSight(0, obstacles, 10);
    expect(sight.forward.isBlocked).toBe(true);
    expect(sight.forward.distance).toBe(5);
    expect(sight.forward.brightness).toBeCloseTo(0.5, 1);
    expect(sight.forward.colorHex).toBe('#ff0000');

    expect(sight.backward.isBlocked).toBe(true);
    expect(sight.backward.distance).toBe(3);
    expect(sight.backward.colorHex).toBe('#00ff00');
  });

  it('should clamp brightness when obstacle is at zero distance without dividing by zero', () => {
    const obstacles = [{ x: 2, colorHex: '#ffffff' }];
    const sight = compute1DSight(2, obstacles, 10);
    expect(sight.forward.distance).toBe(0);
    expect(sight.forward.brightness).toBe(1.0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render/subjective-1d.test.ts`
Expected: FAIL (`compute1DSight` not found)

- [ ] **Step 3: Implement `src/render/subjective-1d.ts`**

Implement forward/backward ray search along the 1D axis with quadratic/linear distance-based fog attenuation and [0.0, 1.0] brightness clamping.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render/subjective-1d.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add src/render/subjective-1d.ts tests/render/subjective-1d.test.ts
git commit -m "feat(render): implement 1D subjective sight ray and fog attenuation"
```

---

### Task 3: 2D 主观迷雾地平线计算引擎 (2D Fog-Edge Recognition)

**Files:**
- Create: `src/render/subjective-2d.ts`
- Test: `tests/render/subjective-2d.test.ts`

**Interfaces:**
- Consumes: `PlayerState` from `src/core/dimension.ts`
- Produces:
  - `interface HorizonRayColumn { angleOffset: number; distance: number; brightness: number; wallColor: string }`
  - `function cast2DHorizonRays(player: { x: number; y: number; angle: number }, walls: Array<{ x1: number; y1: number; x2: number; y2: number; color: string }>, fovDegrees?: number, rayCount?: number): HorizonRayColumn[]`

- [ ] **Step 1: Write failing test in `tests/render/subjective-2d.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { cast2DHorizonRays } from '../../src/render/subjective-2d';

describe('2D Subjective Fog Horizon Engine (Flatland Fog-Recognition)', () => {
  it('should cast rays across the 2D field of view and return distance and fog brightness', () => {
    const walls = [
      { x1: 5, y1: -5, x2: 5, y2: 5, color: '#000000' } // Wall 5 units in front
    ];
    const rays = cast2DHorizonRays({ x: 0, y: 0, angle: 0 }, walls, 60, 5);
    expect(rays).toHaveLength(5);
    // Center ray should hit at approx distance 5
    const centerRay = rays[2];
    expect(centerRay.distance).toBeCloseTo(5, 1);
    expect(centerRay.brightness).toBeGreaterThan(0);
    expect(centerRay.brightness).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render/subjective-2d.test.ts`
Expected: FAIL (`cast2DHorizonRays` not found)

- [ ] **Step 3: Implement `src/render/subjective-2d.ts`**

Implement 2D line segment raycasting (Ray-Line Intersection). Each ray calculates exact intersection distance, angle correction (fish-eye reduction), and fog factor where closer edges are stark dark black and distant edges fade into misty background.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render/subjective-2d.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add src/render/subjective-2d.ts tests/render/subjective-2d.test.ts
git commit -m "feat(render): implement 2D fog-edge horizon raycaster"
```

---

### Task 4: 全知 3D 沙盘俯瞰投影模型 (Omniscient 3D Projection)

**Files:**
- Create: `src/render/omniscient.ts`
- Test: `tests/render/omniscient.test.ts`

**Interfaces:**
- Produces:
  - `function project3DtoIso(point: { x: number; y: number; z: number }, scale?: number): { screenX: number; screenY: number }`
  - `interface OmniscientSceneObject { id: string; type: 'line' | 'polygon' | 'cube'; points: Array<{ x: number; y: number; z: number }>; strokeColor: string }`

- [ ] **Step 1: Write failing test in `tests/render/omniscient.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { project3DtoIso } from '../../src/render/omniscient';

describe('Omniscient 3D View Projection', () => {
  it('should project 3D coordinates into 2D isometric screen space', () => {
    const origin = project3DtoIso({ x: 0, y: 0, z: 0 }, 20);
    expect(origin.screenX).toBe(0);
    expect(origin.screenY).toBe(0);

    const elevated = project3DtoIso({ x: 0, y: 0, z: 10 }, 20);
    expect(elevated.screenY).toBeLessThan(0); // In screen coords, elevation points up (-Y)
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/render/omniscient.test.ts`
Expected: FAIL (`project3DtoIso` not found)

- [ ] **Step 3: Implement `src/render/omniscient.ts`**

Implement classic cabinet / isometric 3D projection formulas with rotation and scaling matrices for procedural wireframe rendering.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/render/omniscient.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add src/render/omniscient.ts tests/render/omniscient.test.ts
git commit -m "feat(render): implement omniscient 3D isometric projection model"
```

---

### Task 5: 关卡状态流转与 0D 终局彩蛋 (Level Progression & 0D Easter Egg)

**Files:**
- Create: `src/game/level-manager.ts`
- Test: `tests/game/level-manager.test.ts`

**Interfaces:**
- Consumes: `Dimension`, `PlayerState` from `src/core/dimension.ts`
- Produces:
  - `interface LevelSpec { id: number; initialDimension: Dimension; name: string; introText: string; isAscensionUnlocked: boolean }`
  - `class LevelManager { ... }`

- [ ] **Step 1: Write failing test in `tests/game/level-manager.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { LevelManager } from '../../src/game/level-manager';
import { Dimension } from '../../src/core/dimension';

describe('Level Manager & Ascension Progression', () => {
  it('should initialize at Level 1 (1D Line world)', () => {
    const manager = new LevelManager();
    expect(manager.currentLevel.initialDimension).toBe(Dimension.D1);
    expect(manager.isAscended).toBe(false);
  });

  it('should trigger ascension to D2 in Level 1 when deadlocked', () => {
    const manager = new LevelManager();
    manager.triggerAscension();
    expect(manager.activeDimension).toBe(Dimension.D2);
  });

  it('should unlock 0D Easter Egg after completing Level 3', () => {
    const manager = new LevelManager();
    manager.completeCurrentLevel(); // L1 -> L2
    manager.completeCurrentLevel(); // L2 -> L3
    manager.completeCurrentLevel(); // L3 -> 0D Egg
    expect(manager.activeDimension).toBe(Dimension.D0);
    expect(manager.isEasterEggActive).toBe(true);
    expect(manager.getPointKingSoliloquy(0)).toContain('My own thought');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/game/level-manager.test.ts`
Expected: FAIL (`LevelManager` not found)

- [ ] **Step 3: Implement `src/game/level-manager.ts`**

Implement complete level progression logic:
- Level 1: Lineland dead-end -> Dimension break to 2D
- Level 2: Flatland 4-walled prison cell -> Dimension break to 3D
- Level 3: Spaceland 3D free traversal -> Exit portal
- Level 4 (Bonus): Pointland 0D Solipsism monologue sequence

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/level-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Checkpoint commit**

```bash
git add src/game/level-manager.ts tests/game/level-manager.test.ts
git commit -m "feat(game): implement level ascension manager and 0D Pointland easter egg"
```

---

### Task 6: 维多利亚铜版画双视窗可玩原型集成 (Interactive Dual-Viewport Web App)

**Files:**
- Create: `index.html`
- Create: `src/style.css`
- Create: `src/main.ts`
- Modify: `package.json` (add build & dev scripts)

**Interfaces:**
- Connects all core modules (`LevelManager`, `cast2DHorizonRays`, `compute1DSight`, `project3DtoIso`) to the DOM.

- [ ] **Step 1: Write integration smoke test in `tests/integration/smoke.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { LevelManager } from '../../src/game/level-manager';
import { compute1DSight } from '../../src/render/subjective-1d';
import { cast2DHorizonRays } from '../../src/render/subjective-2d';
import { project3DtoIso } from '../../src/render/omniscient';

describe('Full Game Smoke Integration', () => {
  it('should verify all modules communicate synchronously without runtime errors', () => {
    const manager = new LevelManager();
    const sight1D = compute1DSight(0, [{ x: 5, colorHex: '#000' }]);
    const rays2D = cast2DHorizonRays({ x: 0, y: 0, angle: 0 }, [{ x1: 5, y1: -5, x2: 5, y2: 5, color: '#000' }]);
    const isoPoint = project3DtoIso({ x: 1, y: 2, z: 3 });

    expect(sight1D).toBeDefined();
    expect(rays2D).toBeDefined();
    expect(isoPoint).toBeDefined();
    expect(manager.activeDimension).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run tests/integration/smoke.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `index.html`, `src/style.css`, and `src/main.ts`**
  - Create Victorian Engraving UI layout: parchment background `#f4eedb`, brass compass borders, ornate serif typography.
  - Split viewport: Top screen = 3D Omniscient Sandbox Canvas; Bottom screen = Subjective Perception Canvas.
  - On-screen touch/keyboard controls (WASD/Arrow keys + "Ascend / 突破维度" 按钮).
  - Sound/Monologue notification banner for Abbott's quotes.

- [ ] **Step 4: Verify build and test bundle**

Run: `npm test`
Expected: All test suites PASS (6/6 suites)

- [ ] **Step 5: Checkpoint commit**

```bash
git add index.html src/ tests/
git commit -m "feat(ui): complete Victorian dual-viewport interactive web prototype"
```

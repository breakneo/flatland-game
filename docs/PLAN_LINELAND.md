# 原子计划：序幕·直线国之梦实施路线 (PLAN_LINELAND)

## 微任务清单 (2~5分钟原子链)

- [ ] **任务 1：直线国控制器与红绿灯单测**
  - 测试文件：`tests/core/lineland-controller.test.ts`
  - 核心实现：`assets/sub_gameplay/scripts/controllers/LinelandGameController.ts`
  - 核心逻辑：X 轴单维位移、左右居民巡逻逼近、死锁检测、侧向脱出（Y轴偏移）、通关裂隙判定。

- [ ] **任务 2：全局关卡协调器与流转状态机**
  - 测试文件：`tests/core/level-coordinator.test.ts`
  - 核心实现：`assets/sub_gameplay/scripts/controllers/LevelCoordinator.ts`
  - 核心逻辑：当前关卡状态、关卡切换逻辑、手稿文案与重置分发。

- [ ] **任务 3：直线国双视窗专属渲染适配**
  - 修改文件：`src/main.ts`
  - 表现逻辑：
    - 上屏：单一直线世界网格、线之国王（金色光点与辐射环）、暴躁邻人（暗红线段）、正方形绅士（象牙白色块）；
    - 下屏：纯一维中心光斑（视网膜中央仅一个光点，随距离展现辐射高斯光晕）；
    - 中部独白：国王的傲慢台词与前后死锁压迫。

- [ ] **任务 4：交互闭环与手稿过渡**
  - 修改文件：`src/main.ts`, `index.html`, `src/style.css`
  - 逻辑：
    - 死锁激活【向侧面，而不是向前】按钮；
    - 点击脱出越过国王到达终点，弹出手稿《直线国梦呓》；
    - 点击弹窗按钮【进入第一幕·石牢脱逃】，平滑无缝载入石牢关卡。

- [ ] **任务 5：全阶段门禁与无头真机落图验证**
  - 执行 `pnpm run typecheck && pnpm test && pnpm run build`
  - 运行 Headless Chrome 自动化 CDP 验证控制台零报错并核验双关卡切换。

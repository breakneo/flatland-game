#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scaffold_game.py - Cocos Creator + Antigravity 游戏项目工业级脚手架
用于从 Game-Studio 母库快速派生全新独立游戏项目，注入工程规范、TypeScript 底座与 Antigravity Harness。
"""

import os
import sys
import argparse
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

STUDIO_ROOT = Path(__file__).resolve().parent.parent.parent

# 生产级 TypeScript 基础核心代码骨架
EVENT_BUS_TS = """// assets/main/scripts/core/event/EventBus.ts
// 全局强类型事件中心，支持安全注销与作用域绑定

type EventCallback = (...args: any[]) => void;

interface EventListenerItem {
    callback: EventCallback;
    target?: any;
    once?: boolean;
}

export class EventBus {
    private static _instance: EventBus;
    private _listeners: Map<string, EventListenerItem[]> = new Map();

    public static get instance(): EventBus {
        if (!this._instance) {
            this._instance = new EventBus();
        }
        return this._instance;
    }

    public on(eventName: string, callback: EventCallback, target?: any, once: boolean = false): void {
        let list = this._listeners.get(eventName);
        if (!list) {
            list = [];
            this._listeners.set(eventName, list);
        }
        list.push({ callback, target, once });
    }

    public once(eventName: string, callback: EventCallback, target?: any): void {
        this.on(eventName, callback, target, true);
    }

    public off(eventName: string, callback: EventCallback, target?: any): void {
        const list = this._listeners.get(eventName);
        if (!list) return;

        this._listeners.set(
            eventName,
            list.filter(item => {
                const matchCb = item.callback === callback;
                const matchTarget = target ? item.target === target : true;
                return !(matchCb && matchTarget);
            })
        );
    }

    public offTarget(target: any): void {
        if (!target) return;
        this._listeners.forEach((list, key) => {
            this._listeners.set(
                key,
                list.filter(item => item.target !== target)
            );
        });
    }

    public emit(eventName: string, ...args: any[]): void {
        const list = this._listeners.get(eventName);
        if (!list || list.length === 0) return;

        const copy = [...list];
        for (const item of copy) {
            if (item.target) {
                item.callback.apply(item.target, args);
            } else {
                item.callback(...args);
            }
            if (item.once) {
                this.off(eventName, item.callback, item.target);
            }
        }
    }

    public clear(): void {
        this._listeners.clear();
    }
}
"""

NODE_POOL_TS = """// assets/main/scripts/core/pool/NodePoolManager.ts
// 生产级泛型对象池管理器，强约束对象复用与 GC 防御

export interface IRecyclable {
    onSpawn(...args: any[]): void;
    onRecycle(): void;
}

export class NodePoolManager {
    private static _instance: NodePoolManager;
    private _pools: Map<string, any[]> = new Map();

    public static get instance(): NodePoolManager {
        if (!this._instance) {
            this._instance = new NodePoolManager();
        }
        return this._instance;
    }

    public initPool(poolName: string, prewarmCount: number, factory: () => any): void {
        if (!this._pools.has(poolName)) {
            this._pools.set(poolName, []);
        }
        const pool = this._pools.get(poolName)!;
        for (let i = 0; i < prewarmCount; i++) {
            const item = factory();
            pool.push(item);
        }
    }

    public spawn<T = any>(poolName: string, factory: () => T, ...args: any[]): T {
        const pool = this._pools.get(poolName);
        let item: any;
        if (pool && pool.length > 0) {
            item = pool.pop();
        } else {
            item = factory();
        }

        if (item && typeof (item as IRecyclable).onSpawn === 'function') {
            (item as IRecyclable).onSpawn(...args);
        }
        return item as T;
    }

    public recycle(poolName: string, item: any): void {
        if (!item) return;

        if (typeof (item as IRecyclable).onRecycle === 'function') {
            (item as IRecyclable).onRecycle();
        }

        let pool = this._pools.get(poolName);
        if (!pool) {
            pool = [];
            this._pools.set(poolName, pool);
        }
        pool.push(item);
    }

    public clear(poolName?: string): void {
        if (poolName) {
            this._pools.delete(poolName);
        } else {
            this._pools.clear();
        }
    }
}
"""

BASE_FSM_TS = """// assets/main/scripts/core/fsm/BaseFSM.ts
// 轻量级状态机基类，严禁状态交叉与时序竞争

export interface IState<TContext> {
    onEnter(context: TContext): void;
    onUpdate?(dt: number, context: TContext): void;
    onExit(context: TContext): void;
}

export class BaseFSM<TContext> {
    private _states: Map<string, IState<TContext>> = new Map();
    private _currentState: IState<TContext> | null = null;
    private _currentStateName: string = '';
    private _context: TContext;

    constructor(context: TContext) {
        this._context = context;
    }

    public register(name: string, state: IState<TContext>): this {
        this._states.set(name, state);
        return this;
    }

    public changeState(name: string): boolean {
        if (this._currentStateName === name) return false;

        const nextState = this._states.get(name);
        if (!nextState) {
            console.error(`[BaseFSM] 未知状态: ${name}`);
            return false;
        }

        if (this._currentState) {
            this._currentState.onExit(this._context);
        }

        this._currentStateName = name;
        this._currentState = nextState;
        this._currentState.onEnter(this._context);
        return true;
    }

    public update(dt: number): void {
        if (this._currentState && this._currentState.onUpdate) {
            this._currentState.onUpdate(dt, this._context);
        }
    }

    public get currentStateName(): string {
        return this._currentStateName;
    }
}
"""

def generate_gemini_md(game_name: str, studio_path: Path) -> str:
    return f"""# Antigravity 游戏工程闭环法典 ({game_name})

本项目是由 **Game-Studio 母库**派生的独立游戏工程，严格遵循 Cocos Creator 3.x 工业级最佳实践与 Antigravity 四阶段闭环 Harness 纪律。

## 母库关联与权威参考
- **Game-Studio 母库路径**：`{studio_path.resolve()}`
- **Cocos 官方最佳实践**：查看母库 `docs/cocos-creator-3.x/` 目录
- **反哺母库经验**：运行 `python3 {studio_path.resolve()}/.agents/scripts/sync_back_to_studio.py`

---

## 游戏专项工程红线 (Cocos Creator 3.x)

1. **纯逻辑解耦**：`assets/main/scripts/core/` 目录严禁导入 Cocos API (`import {{ Node, Component }} from 'cc'`)；
2. **生命周期安全**：禁止在组件生命周期之外持有已销毁节点；异步回调前必须自检 `this.isValid`；
3. **事件与定时器闭环**：`onEnable` 绑定的事件/定时器必须在 `onDisable` 成对注销；
4. **DrawCall 门禁**：UI 界面 DrawCall <= 25，核心战斗 DrawCall <= 50；必须启用 Auto Atlas 合批；
5. **GC 与对象池**：发射物、飘字、特效必须 100% 使用 `NodePoolManager` 复用，严禁在 `update` 中频繁 `instantiate`；
6. **分包与包体**：严格隔离主包与玩法分包，主包控制在 3.5MB 以内。

---

## 四阶段闭环工程纪律

1. **阶段一：需求与核心循环对齐 (GAME_SPEC.md)**：
   - 必须先锁定明天就能交付的最狭窄可玩闭环 (Narrowest Playable Slice)；
   - 明确显式非目标与性能红线指标。
2. **阶段二：原子计划拆解**：
   - 优先复用已有基础库 (`EventBus`, `NodePoolManager`, `BaseFSM`)；
   - 切分为 2~5 分钟微任务。
3. **阶段三：闭环编码与红绿灯 TDD**：
   - 先写核心算法与状态机的单测或最小验证；
   - 严禁在未查明根因前盲目修补业务代码。
4. **阶段四：闭环验证与直觉沉淀**：
   - 验证浏览器/模拟器运行无报错、DrawCall 达标；
   - 踩坑经验记录至 `.agents/INSTINCTS.md` 并反哺母库。
"""

def scaffold_game(game_name: str, target_dir: Path, studio_root: Path):
    print(f"🎮 [Game-Studio] 正在构建游戏工程: {game_name}")
    print(f"📁 目标目录: {target_dir}")

    # 1. 创建完整目录树
    dirs_to_create = [
        target_dir / "assets" / "main" / "scenes",
        target_dir / "assets" / "main" / "scripts" / "core" / "event",
        target_dir / "assets" / "main" / "scripts" / "core" / "pool",
        target_dir / "assets" / "main" / "scripts" / "core" / "fsm",
        target_dir / "assets" / "main" / "scripts" / "core" / "utils",
        target_dir / "assets" / "main" / "scripts" / "platform",
        target_dir / "assets" / "main" / "scripts" / "ui",
        target_dir / "assets" / "main" / "textures" / "common",
        target_dir / "assets" / "sub_gameplay" / "prefabs",
        target_dir / "assets" / "sub_gameplay" / "scenes",
        target_dir / "assets" / "sub_gameplay" / "scripts" / "controllers",
        target_dir / "assets" / "sub_gameplay" / "scripts" / "components",
        target_dir / "assets" / "sub_gameplay" / "scripts" / "models",
        target_dir / "assets" / "sub_gameplay" / "textures" / "pixel",
        target_dir / "assets_raw" / "aseprite",
        target_dir / "assets_raw" / "piskel",
        target_dir / ".agents" / "scripts",
        target_dir / ".agents" / "rules",
        target_dir / ".agents" / "templates",
        target_dir / ".agents" / "skills",
        target_dir / "docs",
        target_dir / "tests",
    ]

    for d in dirs_to_create:
        d.mkdir(parents=True, exist_ok=True)

    # 写入 assets_raw 规范说明
    (target_dir / "assets_raw" / "README.md").write_text(
        "# 美术源文件目录 (不打入最终包体)\n\n"
        "- `aseprite/`: 存放 .aseprite 角色/场景源工程，运行 `python3 .agents/scripts/export_aseprite.py` 自动导出\n"
        "- `piskel/`: 存放 Piskel 导出的原型草稿或 .piskel 文件\n",
        encoding="utf-8"
    )


    # 2. 写入 TypeScript 生产级基础库
    (target_dir / "assets" / "main" / "scripts" / "core" / "event" / "EventBus.ts").write_text(EVENT_BUS_TS, encoding="utf-8")
    (target_dir / "assets" / "main" / "scripts" / "core" / "pool" / "NodePoolManager.ts").write_text(NODE_POOL_TS, encoding="utf-8")
    (target_dir / "assets" / "main" / "scripts" / "core" / "fsm" / "BaseFSM.ts").write_text(BASE_FSM_TS, encoding="utf-8")

    # 复制母库通用脚本
    scripts_src = studio_root / ".agents" / "scripts"
    if scripts_src.exists():
        for script_file in scripts_src.glob("*.py"):
            shutil.copy2(script_file, target_dir / ".agents" / "scripts" / script_file.name)
            os.chmod(target_dir / ".agents" / "scripts" / script_file.name, 0o755)

    # 3. 复制母库通用规范与模板

    rules_src = studio_root / ".agents" / "rules"
    if rules_src.exists():
        for item in rules_src.glob("*.md"):
            shutil.copy2(item, target_dir / ".agents" / "rules" / item.name)

    templates_src = studio_root / ".agents" / "templates"
    if templates_src.exists():
        for item in templates_src.glob("*.md"):
            shutil.copy2(item, target_dir / ".agents" / "templates" / item.name)

    # 4. 软链接母库技能至游戏工程内部（按需加载，隔离全局）
    skills_src = studio_root / ".agents" / "skills"
    if skills_src.exists():
        for skill_dir in skills_src.iterdir():
            if skill_dir.is_dir():
                target_skill_link = target_dir / ".agents" / "skills" / skill_dir.name
                if not target_skill_link.exists():
                    try:
                        # 相对软链接
                        rel_path = os.path.relpath(skill_dir, target_skill_link.parent)
                        os.symlink(rel_path, target_skill_link)
                    except OSError:
                        shutil.copytree(skill_dir, target_skill_link)

    # 5. 生成项目专属 GAME_SPEC.md 与 GEMINI.md
    game_spec_content = (templates_src / "GAME_SPEC.md").read_text(encoding="utf-8") if (templates_src / "GAME_SPEC.md").exists() else "# 游戏原型需求契约\n"
    game_spec_content = game_spec_content.replace("[例如：微信小游戏 / 休闲轻度玩家]", f"[{game_name} 目标平台与受众]")
    (target_dir / "GAME_SPEC.md").write_text(game_spec_content, encoding="utf-8")

    gemini_md_content = generate_gemini_md(game_name, studio_root)
    (target_dir / "GEMINI.md").write_text(gemini_md_content, encoding="utf-8")

    # 6. 初始化 INSTINCTS.md 容器
    instincts_content = f"# {game_name} 游戏开发实战经验与避坑直觉库 (INSTINCTS.md)\n\n> 本文件记录 {game_name} 开发过程中提炼的实战经验，可自动同步回 Game-Studio 母库。\n\n## 避坑记录\n"
    (target_dir / ".agents" / "INSTINCTS.md").write_text(instincts_content, encoding="utf-8")

    # 7. 生成 tsconfig.json 与 package.json 方便单测
    tsconfig = """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["assets/**/*", "tests/**/*"]
}
"""
    (target_dir / "tsconfig.json").write_text(tsconfig, encoding="utf-8")

    package_json = f"""{{
  "name": "{game_name.lower()}",
  "version": "0.1.0",
  "description": "Cocos Creator game project derived from Game-Studio",
  "scripts": {{
    "test": "node --test"
  }},
  "keywords": ["cocos-creator", "antigravity", "game"],
  "author": "Antigravity",
  "license": "MIT"
}}
"""
    (target_dir / "package.json").write_text(package_json, encoding="utf-8")

    # 8. Git 初始化
    if not (target_dir / ".git").exists():
        try:
            subprocess.run(["git", "init"], cwd=target_dir, check=True, capture_output=True)
            gitignore = """node_modules/
temp/
build/
dist/
library/
local/
profiles/
.DS_Store
"""
            (target_dir / ".gitignore").write_text(gitignore, encoding="utf-8")
        except Exception as e:
            print(f"⚠️ Git 初始化跳过: {e}")

    print(f"✅ 游戏工程 {game_name} 脚手架初始化完成！")
    print(f"👉 核心契约文件: {target_dir / 'GAME_SPEC.md'}")
    print(f"👉 规则法典: {target_dir / 'GEMINI.md'}")

def main():
    parser = argparse.ArgumentParser(description="Game-Studio Cocos 游戏工程快速脚手架")
    parser.add_argument("name", help="游戏项目名称 (如: flappy-bird, bubble-shooter)")
    parser.add_argument("--path", help="指定生成目录，默认在 /Users/neo/Anti/Games/<name>", default=None)

    args = parser.parse_args()
    game_name = args.name.strip()

    if args.path:
        target_path = Path(args.path).resolve()
    else:
        target_path = Path("/Users/neo/Anti/Games") / game_name

    scaffold_game(game_name, target_path, STUDIO_ROOT)

if __name__ == "__main__":
    main()

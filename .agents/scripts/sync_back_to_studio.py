#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_back_to_studio.py - 经验反哺同步中枢
将各独立游戏项目中提炼的实战避坑经验 (INSTINCTS.md) 与改进规范安全反哺合并回 Game-Studio 母库。
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

STUDIO_ROOT = Path(__file__).resolve().parent.parent.parent
STUDIO_INSTINCTS = STUDIO_ROOT / ".agents" / "INSTINCTS.md"

def sync_from_project(project_path: Path):
    project_path = project_path.resolve()
    if not project_path.exists():
        print(f"❌ 找不到项目目录: {project_path}")
        return False

    project_name = project_path.name
    project_instincts = project_path / ".agents" / "INSTINCTS.md"
    
    if not project_instincts.exists():
        print(f"ℹ️ 该项目未发现避坑经验文件: {project_instincts}")
        return False

    content = project_instincts.read_text(encoding="utf-8").strip()
    if not content or len(content) < 30:
        print(f"ℹ️ {project_name} 的经验文件为空，无需同步。")
        return False

    # 读取母库 INSTINCTS
    if not STUDIO_INSTINCTS.exists():
        STUDIO_INSTINCTS.parent.mkdir(parents=True, exist_ok=True)
        initial_header = "# Game-Studio 游戏开发实战经验与避坑直觉库 (Dynamic Instincts Vault)\n\n> 本文档汇聚各派生游戏项目反哺的实战避坑经验，随着研发磨合持续进化。\n\n"
        STUDIO_INSTINCTS.write_text(initial_header, encoding="utf-8")

    current_studio_content = STUDIO_INSTINCTS.read_text(encoding="utf-8")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sync_block = f"""
### 🔄 来自项目 [{project_name}] 的反哺同步 ({timestamp})
- **来源路径**：`{project_path}`

{content}
---
"""

    # 追加反哺记录
    with open(STUDIO_INSTINCTS, "a", encoding="utf-8") as f:
        f.write(sync_block)

    print(f"✅ 成功将 [{project_name}] 的实战经验反哺合并至 Game-Studio 母库！")
    print(f"📄 母库经验文件: {STUDIO_INSTINCTS}")
    return True

def auto_scan_and_sync(games_dir: Path):
    if not games_dir.exists():
        print(f"ℹ️ 游戏根目录不存在: {games_dir}")
        return

    print(f"🔍 正在扫描游戏目录: {games_dir}")
    synced_count = 0
    for child in games_dir.iterdir():
        if child.is_dir() and (child / ".agents" / "INSTINCTS.md").exists():
            print(f"📦 发现游戏项目: {child.name}")
            if sync_from_project(child):
                synced_count += 1

    print(f"🎉 扫描完成，共同步了 {synced_count} 个项目的经验。")

def main():
    parser = argparse.ArgumentParser(description="Game-Studio 经验反哺同步工具")
    parser.add_argument("project_path", nargs="?", help="指定游戏项目路径；如不指定则自动扫描 /Users/neo/Anti/Games")
    args = parser.parse_args()

    if args.project_path:
        sync_from_project(Path(args.project_path))
    else:
        default_games_dir = Path("/Users/neo/Anti/Games")
        auto_scan_and_sync(default_games_dir)

if __name__ == "__main__":
    main()

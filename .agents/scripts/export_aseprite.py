#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_aseprite.py - Aseprite 自动化像素管线批处理工具
自动将 assets_raw/aseprite 下的源文件导出为 Cocos Creator 3.x SpriteSheet 与 JSON，
并自动注入强制 Nearest 邻近采样的 .meta 描述文件，彻底根除像素模糊发虚。
"""

import os
import sys
import json
import shutil
import subprocess
import argparse
from pathlib import Path

def find_aseprite_binary() -> str:
    # 1. 优先检查环境变量
    custom_bin = os.environ.get("ASEPRITE_BIN")
    if custom_bin and os.path.exists(custom_bin):
        return custom_bin

    # 2. 检查系统 PATH
    path_bin = shutil.which("aseprite")
    if path_bin:
        return path_bin

    # 3. macOS 默认应用程序路径
    mac_app_bin = "/Applications/Aseprite.app/Contents/MacOS/aseprite"
    if os.path.exists(mac_app_bin):
        return mac_app_bin

    return ""

def generate_cocos_nearest_meta(png_path: Path):
    """为导出的 PNG 生成 Cocos Creator 3.x 邻近采样 .meta 文件"""
    meta_path = Path(str(png_path) + ".meta")
    if meta_path.exists():
        try:
            data = json.loads(meta_path.read_text(encoding="utf-8"))
            sub_metas = data.get("subMetas", {})
            modified = False
            for sub_key, sub_val in sub_metas.items():
                userData = sub_val.get("userData", {})
                if userData.get("minfilter") != "nearest" or userData.get("magfilter") != "nearest":
                    userData["minfilter"] = "nearest"
                    userData["magfilter"] = "nearest"
                    userData["mipfilter"] = "none"
                    sub_val["userData"] = userData
                    modified = True
            if modified:
                meta_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
                print(f"🔧 已更新 {png_path.name}.meta 为 Nearest 邻近采样")
            return
        except Exception as e:
            pass

    # 默认极简 Texture2D meta 结构
    meta_content = {
        "ver": "1.0.1",
        "importer": "texture",
        "imported": True,
        "files": [],
        "subMetas": {
            "6c48a": {
                "ver": "1.0.4",
                "importer": "texture",
                "rules": {},
                "displayName": png_path.stem,
                "id": "6c48a",
                "userData": {
                    "wrapModeS": "clamp-to-edge",
                    "wrapModeT": "clamp-to-edge",
                    "minfilter": "nearest",
                    "magfilter": "nearest",
                    "mipfilter": "none",
                    "anisotropy": 0,
                    "isCompressed": False
                }
            }
        },
        "userData": {
            "type": "sprite-frame",
            "fixAlphaTransparencyArtifacts": True,
            "hasAlpha": True,
            "redirect": ""
        }
    }
    meta_path.write_text(json.dumps(meta_content, indent=2), encoding="utf-8")
    print(f"✨ 自动生成 {png_path.name}.meta (强制锁定 Nearest 邻近采样)")

def export_file(aseprite_bin: str, src_file: Path, dest_dir: Path):
    name = src_file.stem
    dest_png = dest_dir / f"{name}.png"
    dest_json = dest_dir / f"{name}.json"

    dest_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        aseprite_bin,
        "-b", str(src_file),
        "--sheet", str(dest_png),
        "--data", str(dest_json),
        "--format", "json-array",
        "--list-tags",
        "--list-slices",
        "--sheet-pack",
        "--inner-padding", "1",
        "--trim"
    ]

    print(f"🎨 正在转换: {src_file.name} -> {dest_png.name} & {dest_json.name}")
    try:
        res = subprocess.run(cmd, check=True, capture_output=True, text=True)
        # 生成/修复 Nearest 采样的 meta 文件
        generate_cocos_nearest_meta(dest_png)
        print(f"✅ 转换成功: {dest_png.name}")
    except subprocess.CalledProcessError as e:
        print(f"❌ 转换失败: {e.stderr}")

def main():
    parser = argparse.ArgumentParser(description="Aseprite 自动化像素管线批处理工具")
    parser.add_argument("--src", help="源文件目录，默认 ./assets_raw/aseprite", default="./assets_raw/aseprite")
    parser.add_argument("--dest", help="导出目录，默认 ./assets/sub_gameplay/textures/pixel", default="./assets/sub_gameplay/textures/pixel")
    args = parser.parse_args()

    src_dir = Path(args.src).resolve()
    dest_dir = Path(args.dest).resolve()

    aseprite_bin = find_aseprite_binary()
    if not aseprite_bin:
        print("⚠️ 未在系统 PATH 或 /Applications 中找到 Aseprite 执行文件！")
        print("💡 解决方案：")
        print("   1. 安装 Aseprite 或通过环境变量指定: export ASEPRITE_BIN=/path/to/aseprite")
        print("   2. 若使用 Piskel，可在 Web 端导出 SpriteSheet 后放入该目录。")
        sys.exit(0)

    if not src_dir.exists():
        print(f"ℹ️ 源目录不存在: {src_dir}，自动为您创建示例目录骨架。")
        src_dir.mkdir(parents=True, exist_ok=True)
        (src_dir / "README.md").write_text("# Aseprite 源文件目录\n将 .aseprite 工程文件放置于此，运行 export_aseprite.py 即可自动导出。\n", encoding="utf-8")
        return

    ase_files = list(src_dir.rglob("*.aseprite")) + list(src_dir.rglob("*.ase"))
    if not ase_files:
        print(f"ℹ️ 在 {src_dir} 中未找到 .aseprite 文件。")
        return

    print(f"🚀 找到 {len(ase_files)} 个 Aseprite 源文件，启动批量转换流水线...")
    for f in ase_files:
        export_file(aseprite_bin, f, dest_dir)
    print("🎉 像素美术资产自动化导出完成！")

if __name__ == "__main__":
    main()

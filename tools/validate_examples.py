#!/usr/bin/env python3
"""Extract standalone C examples and optionally syntax-check them.

Only clearly self-contained fenced C blocks are compiled. Multi-file examples,
deliberately broken snippets, shell/Make/CMake snippets and header fragments are
reported separately instead of being treated as failures.

Usage:
  python tools/validate_examples.py
  python tools/validate_examples.py --compile
  python tools/validate_examples.py --compile --strict
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = ROOT / "modules"
EXTRACT_DIR = ROOT / "examples" / "extracted"
FENCE_RE = re.compile(r"^```([A-Za-z0-9_+-]*)\s*$")
ENTRY_RE = re.compile(r"^## (E\d{2}\.\d{2})\s+")
BROKEN_RE = re.compile(r"错误[：:]|错误示例|不要这样|UND(?:EF)?INED|/\*\s*错误", re.IGNORECASE)


def extract_blocks() -> list[dict[str, str]]:
    blocks: list[dict[str, str]] = []
    for path in sorted(MODULES_DIR.glob("*.md")):
        lines = path.read_text(encoding="utf-8").splitlines()
        current_entry = "unknown"
        index = 0
        while index < len(lines):
            entry_match = ENTRY_RE.match(lines[index])
            if entry_match:
                current_entry = entry_match.group(1)
            fence_match = FENCE_RE.match(lines[index])
            if not fence_match or lines[index].startswith("````"):
                index += 1
                continue
            language = fence_match.group(1).lower() or "text"
            index += 1
            code_lines: list[str] = []
            while index < len(lines) and not lines[index].startswith("```"):
                code_lines.append(lines[index])
                index += 1
            index += 1  # closing fence
            code = "\n".join(code_lines).strip()
            blocks.append({
                "file": path.name,
                "entry": current_entry,
                "language": language,
                "code": code,
                "index": str(len([item for item in blocks if item["entry"] == current_entry]) + 1),
            })
    return blocks


def is_standalone_c(block: dict[str, str]) -> bool:
    if block["language"] not in {"c", "h"}:
        return False
    code = block["code"]
    if BROKEN_RE.search(code):
        return False
    if "#include \"" in code:
        return False  # 依赖同一条目中的其他本地文件片段
    if not re.search(r"\bint\s+main\s*\(", code):
        return False
    if not re.search(r"#include\s*<[^>]+>", code):
        return False
    return True


def find_compiler() -> str | None:
    configured = os.environ.get("CC")
    if configured and (shutil.which(configured) or Path(configured).exists()):
        return configured
    for candidate in ("cc", "gcc", "clang"):
        found = shutil.which(candidate)
        if found:
            return candidate
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract and syntax-check C Atlas examples")
    parser.add_argument("--compile", action="store_true", help="在找到 C 编译器时执行语法检查")
    parser.add_argument("--strict", action="store_true", help="把编译器警告视为失败（隐含 --compile）")
    args = parser.parse_args()
    should_compile = args.compile or args.strict

    blocks = extract_blocks()
    c_blocks = [block for block in blocks if block["language"] in {"c", "h"}]
    standalone = [block for block in c_blocks if is_standalone_c(block)]

    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    for old in EXTRACT_DIR.glob("*.c"):
        old.unlink()

    for ordinal, block in enumerate(standalone, start=1):
        target = EXTRACT_DIR / f"{ordinal:03d}_{block['entry'].replace('.', '-')}.c"
        target.write_text(block["code"] + "\n", encoding="utf-8")
        block["target"] = str(target)

    print(f"发现 {len(blocks)} 个代码围栏，其中 C/H {len(c_blocks)} 个")
    print(f"可独立做语法检查的 C 示例：{len(standalone)} 个，已提取到 {EXTRACT_DIR.relative_to(ROOT)}")
    print(f"跳过多文件片段、头文件片段、危险示例及非 C 命令块：{len(blocks) - len(standalone)} 个")

    if not should_compile:
        print("未请求编译；添加 --compile 可在存在编译器时执行检查")
        return 0

    compiler = find_compiler()
    if not compiler:
        print("未找到 CC/cc/gcc/clang；已保留提取结果，语法检查标记为 SKIP")
        return 0

    failures = 0
    for block in standalone:
        command = [
            compiler,
            "-std=c17",
            "-Wall",
            "-Wextra",
            "-Wpedantic",
            "-fsyntax-only",
            block["target"],
        ]
        if args.strict:
            command.insert(-1, "-Werror")
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            failures += 1
            print(f"FAIL {block['entry']} ({block['file']})")
            diagnostic = (result.stdout + result.stderr).strip()
            print("  " + diagnostic.replace("\n", "\n  ")[:1200])
    print(f"编译器 {compiler}：检查 {len(standalone)} 个示例，失败 {failures} 个")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

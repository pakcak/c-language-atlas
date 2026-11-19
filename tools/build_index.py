#!/usr/bin/env python3
"""Validate the C Atlas Markdown source and build offline search indexes.

The module Markdown files are the single source of truth. This script checks
structure, stable IDs, required fields, cross-references and tags, then writes:
  - INDEX.md              human-readable entry index
  - data/library.js       browser data loaded without fetch()
  - data/library.json     machine-readable data for other tools
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MODULES_DIR = ROOT / "modules"
DATA_DIR = ROOT / "data"

MODULE_RE = re.compile(r"^# (M\d{2}) (.+)$", re.MULTILINE)
ENTRY_RE = re.compile(r"^## (E(\d{2})\.(\d{2})) (.+)$", re.MULTILINE)
META_RE = re.compile(r"^- \*\*(标签|难度|前置|关联)\*\*：(.+)$")
SECTION_RE = re.compile(r"^### (.+?)\s*$", re.MULTILINE)
TAG_RE = re.compile(r"`([^`]+)`")
CROSS_REF_RE = re.compile(r"E\d{2}\.\d{2}")
FENCE_RE = re.compile(r"^```", re.MULTILINE)

REQUIRED_FIELDS = ("标签", "难度", "前置", "关联")
REQUIRED_SECTIONS = ("概念解释", "语法要点", "使用场景", "示例", "注意事项", "常见问题")
ALLOWED_DIFFICULTIES = {"入门", "进阶", "工程"}
PLACEHOLDER_RE = re.compile(r"待补|TODO|占位|此处省略|待确认", re.IGNORECASE)


class BuildError(Exception):
    pass


def strip_markdown(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text, flags=re.DOTALL)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^\s{0,3}[#>|+\-]+\s*", "", text, flags=re.MULTILINE)
    return re.sub(r"\s+", " ", text).strip()


def first_paragraph(text: str, limit: int = 128) -> str:
    for block in text.split("\n\n"):
        plain = strip_markdown(block)
        if plain and not plain.startswith("```"):
            return plain[:limit] + ("…" if len(plain) > limit else "")
    return ""


def parse_sections(content: str) -> tuple[dict[str, str], list[str]]:
    matches = list(SECTION_RE.finditer(content))
    sections: dict[str, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(content)
        sections[match.group(1).strip()] = content[match.end():end].strip()
    return sections, [match.group(1).strip() for match in matches]


def parse_metadata(body: str) -> tuple[dict[str, str], list[str], str]:
    metadata: dict[str, str] = {}
    tags: list[str] = []
    lines = body.splitlines()
    consumed = 0

    for line in lines:
        match = META_RE.match(line)
        if not match:
            if not line.strip():
                consumed += 1
                continue
            break
        key, value = match.group(1), match.group(2).strip()
        metadata[key] = value
        if key == "标签":
            tags = TAG_RE.findall(value)
        consumed += 1

    content = "\n".join(lines[consumed:]).strip()
    return metadata, tags, content


def parse_module(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    module_match = MODULE_RE.search(text)
    if not module_match or module_match.start() != 0:
        raise BuildError(f"{path.name}: 缺少形如 '# Mxx 模块名' 的一级标题")

    module_id, module_title = module_match.group(1), module_match.group(2).strip()
    if not path.name.startswith(module_id[1:] + "-"):
        raise BuildError(f"{path.name}: 文件名前缀与模块编号 {module_id} 不一致")

    intro_lines = []
    for line in text.splitlines()[1:]:
        if line.startswith("> "):
            intro_lines.append(line[2:].strip())
        elif line.strip():
            break
    intro = " ".join(intro_lines)

    matches = list(ENTRY_RE.finditer(text))
    if not matches:
        raise BuildError(f"{path.name}: 没有条目")

    entries: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        entry_id = match.group(1)
        entry_module_number = match.group(2)
        title = match.group(4).strip()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end():end].strip()

        metadata, tags, content = parse_metadata(body)
        sections, section_order = parse_sections(content)

        entry = {
            "id": entry_id,
            "title": title,
            "module": module_id,
            "moduleTitle": module_title,
            "moduleFile": f"modules/{path.name}",
            "difficulty": metadata.get("难度", ""),
            "tags": tags,
            "prerequisite": metadata.get("前置", ""),
            "related": metadata.get("关联", ""),
            "content": content,
            "sections": sections,
            "sectionOrder": section_order,
            "summary": first_paragraph(sections.get("概念解释", "")),
            "plainText": strip_markdown(content),
        }
        entry["searchText"] = " ".join([
            entry_id,
            title,
            module_id,
            module_title,
            entry["difficulty"],
            " ".join(tags),
            entry["prerequisite"],
            entry["related"],
            entry["plainText"],
            entry["content"],  # 保留源码，支持搜索 printf、malloc 等代码标识符
        ])
        entries.append(entry)

        # Per-entry structural validation.
        if entry_module_number != module_id[1:]:
            raise BuildError(f"{path.name} {entry_id}: 编号中的模块号与文件不一致")
        missing_fields = [field for field in REQUIRED_FIELDS if not metadata.get(field)]
        if missing_fields:
            raise BuildError(f"{path.name} {entry_id}: 缺少元数据 {missing_fields}")
        if not tags:
            raise BuildError(f"{path.name} {entry_id}: 标签为空")
        if entry["difficulty"] not in ALLOWED_DIFFICULTIES:
            raise BuildError(f"{path.name} {entry_id}: 难度必须是入门/进阶/工程")
        missing_sections = [name for name in REQUIRED_SECTIONS if not sections.get(name)]
        if missing_sections:
            raise BuildError(f"{path.name} {entry_id}: 缺少小节 {missing_sections}")
        if section_order[:len(REQUIRED_SECTIONS)] != list(REQUIRED_SECTIONS):
            raise BuildError(f"{path.name} {entry_id}: 六个必备小节顺序不符合模板")
        if "```" not in sections["示例"]:
            raise BuildError(f"{path.name} {entry_id}: 示例小节缺少代码块")
        if "**问：" not in sections["常见问题"]:
            raise BuildError(f"{path.name} {entry_id}: 常见问题缺少具体的问句")
        if PLACEHOLDER_RE.search(content):
            raise BuildError(f"{path.name} {entry_id}: 含占位或待补内容")

    expected_numbers = list(range(1, len(entries) + 1))
    actual_numbers = [int(entry["id"].split(".")[1]) for entry in entries]
    if actual_numbers != expected_numbers:
        raise BuildError(f"{path.name}: 条目编号应从 01 起连续，实际为 {actual_numbers}")

    return {
        "id": module_id,
        "title": module_title,
        "intro": intro,
        "file": f"modules/{path.name}",
        "entries": entries,
    }


def known_tags() -> set[str]:
    text = (ROOT / "TAGS.md").read_text(encoding="utf-8")
    # Every inline code span in the tag specification is treated as registered.
    return set(TAG_RE.findall(text))


def build_index_document(modules: list[dict[str, Any]], entries: list[dict[str, Any]], tag_counts: dict[str, int]) -> str:
    lines = [
        "# C 语言资料库 · 全量条目索引",
        "",
        "> 本文件由 `tools/build_index.py` 从 `modules/*.md` 自动生成，请勿手工修改条目表。",
        "",
        f"- 模块：**{len(modules)}**",
        f"- 条目：**{len(entries)}**",
        f"- 标签：**{len(tag_counts)}**",
        f"- 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "按编号点击可在离线查阅页中打开对应条目；也可直接在 `modules/` 中搜索稳定编号。",
        "",
        "## 模块与条目",
        "",
    ]

    for module in modules:
        lines.extend([
            f"### {module['id']} {module['title']}（{len(module['entries'])} 条）",
            "",
            module["intro"],
            "",
            "| 编号 | 条目 | 难度 | 标签 | 源文件 |",
            "|---|---|---|---|---|",
        ])
        for entry in module["entries"]:
            tags = " ".join(f"`{tag}`" for tag in entry["tags"])
            lines.append(
                f"| [{entry['id']}](index.html?entry={entry['id']}) | {entry['title']} | "
                f"{entry['difficulty']} | {tags} | [{Path(entry['moduleFile']).name}]({entry['moduleFile']}) |"
            )
        lines.append("")

    lines.extend([
        "## 标签频次",
        "",
        "| 标签 | 条目数 |",
        "|---|---:|",
    ])
    for tag, count in sorted(tag_counts.items(), key=lambda item: (-item[1], item[0])):
        lines.append(f"| `{tag}` | {count} |")
    lines.extend([
        "",
        "## 维护命令",
        "",
        "```sh",
        "python tools/build_index.py",
        "python tools/validate_examples.py --compile",
        "```",
        "",
        "第一条重新生成 `INDEX.md` 和 `data/library.js`；第二条在检测到 C 编译器时检查可独立编译的示例。",
        "",
    ])
    return "\n".join(lines)


def main() -> int:
    module_paths = sorted(MODULES_DIR.glob("*.md"))
    if len(module_paths) != 18:
        raise BuildError(f"应有 18 个模块文档，实际发现 {len(module_paths)} 个")

    modules = [parse_module(path) for path in module_paths]
    entries = [entry for module in modules for entry in module["entries"]]

    module_ids = [module["id"] for module in modules]
    expected_modules = [f"M{number:02d}" for number in range(1, 19)]
    if module_ids != expected_modules:
        raise BuildError(f"模块编号不完整或顺序错误：{module_ids}")

    entry_ids = [entry["id"] for entry in entries]
    duplicates = sorted({item for item in entry_ids if entry_ids.count(item) > 1})
    if duplicates:
        raise BuildError(f"条目编号重复：{duplicates}")
    identifier_set = set(entry_ids)

    warnings: list[str] = []
    registered_tags = known_tags()
    tag_counts: dict[str, int] = {}
    for entry in entries:
        for tag in entry["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
            if tag not in registered_tags:
                warnings.append(f"{entry['id']}: 标签 `{tag}` 未在 TAGS.md 登记")
        for reference in CROSS_REF_RE.findall(entry["prerequisite"] + " " + entry["related"] + " " + entry["content"]):
            if reference not in identifier_set:
                warnings.append(f"{entry['id']}: 引用了不存在的条目 {reference}")
    for path in module_paths:
        text = path.read_text(encoding="utf-8")
        if len(FENCE_RE.findall(text)) % 2 != 0:
            raise BuildError(f"{path.name}: 代码围栏数量为奇数，存在未闭合代码块")

    payload = {
        "title": "C 语言资料库",
        "subtitle": "系统学习与快速查阅",
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "modules": [
            {key: value for key, value in module.items() if key != "entries"}
            | {"entryCount": len(module["entries"]), "entryIds": [entry["id"] for entry in module["entries"]]}
            for module in modules
        ],
        "entries": entries,
        "tagCounts": tag_counts,
        "stats": {
            "moduleCount": len(modules),
            "entryCount": len(entries),
            "tagCount": len(tag_counts),
            "sourceLines": sum(len(path.read_text(encoding="utf-8").splitlines()) for path in module_paths),
        },
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(payload, ensure_ascii=False, indent=2)
    (DATA_DIR / "library.json").write_text(json_text + "\n", encoding="utf-8")
    js_text = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    (DATA_DIR / "library.js").write_text(f"window.C_LIBRARY = {js_text};\n", encoding="utf-8")
    (ROOT / "INDEX.md").write_text(build_index_document(modules, entries, tag_counts), encoding="utf-8")

    print(f"校验通过：{len(modules)} 个模块、{len(entries)} 个条目、{len(tag_counts)} 个标签、{payload['stats']['sourceLines']} 行源文档")
    print("已生成：INDEX.md、data/library.js、data/library.json")
    if warnings:
        print(f"警告 {len(warnings)} 项：")
        for warning in warnings[:40]:
            print(f"  - {warning}")
        if len(warnings) > 40:
            print(f"  - 另有 {len(warnings) - 40} 项，请查看完整输出")
    else:
        print("标签和交叉引用：全部有效")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BuildError as error:
        print(f"构建失败：{error}", file=sys.stderr)
        sys.exit(1)

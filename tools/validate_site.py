#!/usr/bin/env python3
"""Check the offline C Atlas site and its generated data.

The script verifies HTML tag nesting, local asset references, absence of remote
dependencies, consistency between library.js and library.json, and INDEX.md
coverage. If Node.js is present, it also runs a JavaScript syntax check and
evaluates the generated browser data.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
REQUIRED_SECTIONS = ("概念解释", "语法要点", "使用场景", "示例", "注意事项", "常见问题")


class HtmlChecker(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.references: list[str] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag not in VOID_TAGS:
            self.stack.append(tag)
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.references.append(value)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.references.append(value)

    def handle_endtag(self, tag: str) -> None:
        if tag in VOID_TAGS:
            return
        if not self.stack:
            self.errors.append(f"多余的结束标签 </{tag}>")
            return
        if self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.errors.append(f"未闭合标签 <{self.stack.pop()}> 与 </{tag}> 交叉")
            if self.stack:
                self.stack.pop()
        else:
            self.errors.append(f"结束标签 </{tag}> 没有对应起始标签")


def check_html() -> list[str]:
    errors: list[str] = []
    checker = HtmlChecker()
    checker.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    checker.close()
    errors.extend(checker.errors)
    for tag in checker.stack:
        errors.append(f"文档结束时仍有未闭合标签 <{tag}>")

    for reference in checker.references:
        parsed = urlparse(reference)
        if parsed.scheme in {"http", "https", "//"}:
            errors.append(f"离线页面不应依赖远程资源：{reference}")
            continue
        if parsed.scheme or reference.startswith("#"):
            continue
        local_path = ROOT / parsed.path
        if not local_path.exists():
            errors.append(f"引用了不存在的本地文件：{reference}")

    for required in ("assets/style.css", "assets/app.js", "data/library.js"):
        if required not in checker.references:
            errors.append(f"index.html 缺少必要引用：{required}")
    return errors


def check_data() -> list[str]:
    errors: list[str] = []
    data = json.loads((ROOT / "data/library.json").read_text(encoding="utf-8"))
    modules = data.get("modules", [])
    entries = data.get("entries", [])
    stats = data.get("stats", {})

    if len(modules) != 18 or stats.get("moduleCount") != 18:
        errors.append("模块数应为 18")
    if len(entries) != stats.get("entryCount"):
        errors.append("条目数与 stats.entryCount 不一致")
    if len(data.get("tagCounts", {})) != stats.get("tagCount"):
        errors.append("标签数与 stats.tagCount 不一致")

    entry_ids = [entry.get("id") for entry in entries]
    if len(entry_ids) != len(set(entry_ids)):
        errors.append("生成数据中存在重复条目编号")
    entry_id_set = set(entry_ids)

    for module in modules:
        expected = set(module.get("entryIds", []))
        actual = {entry["id"] for entry in entries if entry.get("module") == module.get("id")}
        if expected != actual:
            errors.append(f"{module.get('id')}: 模块条目索引与全量条目不一致")
        if module.get("entryCount") != len(expected):
            errors.append(f"{module.get('id')}: entryCount 与 entryIds 不一致")
        if not (ROOT / module.get("file", "")).exists():
            errors.append(f"{module.get('id')}: 源文件不存在")

    for entry in entries:
        entry_id = entry.get("id", "<unknown>")
        for key in ("title", "module", "difficulty", "tags", "content", "summary", "searchText"):
            if not entry.get(key):
                errors.append(f"{entry_id}: 生成数据缺少 {key}")
        sections = entry.get("sections", {})
        for section in REQUIRED_SECTIONS:
            if not sections.get(section):
                errors.append(f"{entry_id}: 生成数据缺少小节 {section}")
        for reference in re.findall(r"E\d{2}\.\d{2}", entry.get("related", "") + " " + entry.get("prerequisite", "")):
            if reference not in entry_id_set:
                errors.append(f"{entry_id}: 元数据引用不存在的 {reference}")

    index_text = (ROOT / "INDEX.md").read_text(encoding="utf-8")
    missing = [entry_id for entry_id in entry_ids if entry_id not in index_text]
    if missing:
        errors.append(f"INDEX.md 缺少 {len(missing)} 个条目，例如 {missing[:5]}")

    js_text = (ROOT / "data/library.js").read_text(encoding="utf-8")
    if not js_text.startswith("window.C_LIBRARY = ") or not js_text.rstrip().endswith(";"):
        errors.append("data/library.js 的封装格式不正确")
    return errors


def check_no_remote_dependencies() -> list[str]:
    errors: list[str] = []
    app = (ROOT / "assets/app.js").read_text(encoding="utf-8")
    css = (ROOT / "assets/style.css").read_text(encoding="utf-8")
    if re.search(r"\bfetch\s*\(|XMLHttpRequest|https?://", app):
        errors.append("app.js 含网络请求或远程 URL，不符合离线要求")
    if re.search(r"@import\s+url\(\s*['\"]?https?://", css, re.IGNORECASE):
        errors.append("style.css 含远程样式导入")
    if css.count("{") != css.count("}"):
        errors.append("style.css 花括号数量不平衡")
    return errors


def check_with_node() -> tuple[list[str], list[str]]:
    errors: list[str] = []
    notes: list[str] = []
    node = shutil.which("node")
    if not node:
        return errors, ["未找到 Node.js：跳过 JavaScript 运行时/语法自动检查"]

    app_check = subprocess.run([node, "--check", str(ROOT / "assets/app.js")],
                               capture_output=True, text=True, check=False)
    if app_check.returncode != 0:
        errors.append("app.js 语法检查失败：" + (app_check.stderr or app_check.stdout).strip()[:500])

    script = r"""
const fs = require('fs');
const vm = require('vm');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(process.argv[1], 'utf8'), sandbox, { filename: 'library.js' });
const data = sandbox.window.C_LIBRARY;
if (!data || !Array.isArray(data.modules) || !Array.isArray(data.entries)) {
  console.error('window.C_LIBRARY 结构无效');
  process.exit(2);
}
if (data.modules.length !== 18) {
  console.error('模块数不是 18');
  process.exit(3);
}
if (data.entries.length !== data.stats.entryCount) {
  console.error('条目数与统计不一致');
  process.exit(4);
}
console.log(`browser-data-ok:${data.entries.length}:${Object.keys(data.tagCounts).length}`);
"""
    data_check = subprocess.run([node, "-e", script, str(ROOT / "data/library.js")],
                                capture_output=True, text=True, check=False)
    if data_check.returncode != 0:
        errors.append("library.js 浏览器数据检查失败：" + (data_check.stderr or data_check.stdout).strip()[:500])
    else:
        notes.append("Node.js：" + data_check.stdout.strip())
    return errors, notes


def main() -> int:
    errors: list[str] = []
    errors.extend(check_html())
    errors.extend(check_data())
    errors.extend(check_no_remote_dependencies())
    node_errors, notes = check_with_node()
    errors.extend(node_errors)

    for note in notes:
        print("提示：" + note)
    if errors:
        print(f"站点校验失败，共 {len(errors)} 项：")
        for error in errors[:60]:
            print("  - " + error)
        if len(errors) > 60:
            print(f"  - 另有 {len(errors) - 60} 项")
        return 1

    data = json.loads((ROOT / "data/library.json").read_text(encoding="utf-8"))
    print(f"站点校验通过：{data['stats']['moduleCount']} 个模块、{data['stats']['entryCount']} 个条目、{data['stats']['tagCount']} 个标签")
    print("已检查：HTML 标签与本地资源、生成数据一致性、INDEX.md 覆盖、离线依赖约束")
    return 0


if __name__ == "__main__":
    sys.exit(main())

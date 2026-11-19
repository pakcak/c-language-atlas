(function () {
    "use strict";

    var library = window.C_LIBRARY;
    var main = document.getElementById("main");
    var searchInput = document.getElementById("search-input");
    var searchClear = document.getElementById("search-clear");
    var moduleNav = document.getElementById("module-nav");

    if (!library || !Array.isArray(library.entries)) {
        main.innerHTML = '<section class="empty-state"><h3>检索数据未载入</h3>' +
            '<p>请确认 data/library.js 存在，或在资料库目录运行 python tools/build_index.py。</p></section>';
        return;
    }

    var entryMap = new Map(library.entries.map(function (entry) { return [entry.id, entry]; }));
    var moduleMap = new Map(library.modules.map(function (module) { return [module.id, module]; }));
    var difficulties = ["入门", "进阶", "工程"];
    var difficultyClass = { "入门": "entry", "进阶": "advanced", "工程": "engineering" };
    var allTags = Object.keys(library.tagCounts || {}).sort(function (a, b) {
        var byCount = (library.tagCounts[b] || 0) - (library.tagCounts[a] || 0);
        return byCount || a.localeCompare(b, "zh-CN");
    });

    library.entries.forEach(function (entry) {
        entry._search = normalize(entry.searchText || (entry.content || ""));
    });

    var state = {
        view: "home",
        entryId: null,
        query: "",
        module: "all",
        difficulty: "all",
        tag: "all"
    };
    var ignoreNextHashChange = false;

    function normalize(value) {
        return String(value || "").normalize("NFKC").toLowerCase();
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeHref(value) {
        var href = String(value || "");
        if (/^\s*javascript:/i.test(href)) {
            return "#";
        }
        return escapeHtml(href);
    }

    function renderInline(text) {
        var html = escapeHtml(text);
        var tokens = [];
        html = html.replace(/`([^`]+)`/g, function (_, code) {
            var index = tokens.length;
            tokens.push("<code>" + code + "</code>");
            return "\uE000" + index + "\uE001";
        });
        html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
            return '<a href="' + safeHref(url) + '">' + label + "</a>";
        });
        html = html.replace(/\uE000(\d+)\uE001/g, function (_, index) {
            return tokens[Number(index)];
        });
        return html;
    }

    function isSpecialLine(line) {
        return !line.trim() ||
            /^```/.test(line) ||
            /^#{2,4}\s+/.test(line) ||
            /^>\s?/.test(line) ||
            /^\s*[-*]\s+/.test(line) ||
            /^\s*\d+\.\s+/.test(line) ||
            /^\s*\|/.test(line);
    }

    function tableCells(line) {
        var text = line.trim();
        if (text.charAt(0) === "|") { text = text.slice(1); }
        if (text.charAt(text.length - 1) === "|") { text = text.slice(0, -1); }
        return text.split("|").map(function (cell) { return cell.trim(); });
    }

    function isTableSeparator(line) {
        var cells = tableCells(line);
        return cells.length > 0 && cells.every(function (cell) {
            return /^:?-{3,}:?$/.test(cell);
        });
    }

    function renderMarkdown(markdown) {
        var lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
        var output = [];
        var sectionCounter = 0;
        var index = 0;

        while (index < lines.length) {
            var line = lines[index];

            if (!line.trim()) {
                index += 1;
                continue;
            }

            var fence = line.match(/^```([A-Za-z0-9_+-]*)\s*$/);
            if (fence) {
                var language = fence[1] || "text";
                var code = [];
                index += 1;
                while (index < lines.length && !/^```/.test(lines[index])) {
                    code.push(lines[index]);
                    index += 1;
                }
                index += 1;
                output.push(
                    '<div class="code-frame">' +
                    '<div class="code-label"><span>' + escapeHtml(language) + '</span>' +
                    '<button class="copy-code" type="button" data-copy>复制代码</button></div>' +
                    '<pre><code class="language-' + escapeHtml(language) + '">' +
                    escapeHtml(code.join("\n")) + "</code></pre></div>"
                );
                continue;
            }

            var heading = line.match(/^(#{2,4})\s+(.+)$/);
            if (heading) {
                var level = heading[1].length;
                if (level === 3) { sectionCounter += 1; }
                var idAttribute = level === 3 ? ' id="entry-section-' + sectionCounter + '"' : "";
                output.push("<h" + level + idAttribute + ">" + renderInline(heading[2]) + "</h" + level + ">");
                index += 1;
                continue;
            }

            if (/^\s*\|/.test(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
                var header = tableCells(line);
                index += 2;
                var rows = [];
                while (index < lines.length && /^\s*\|/.test(lines[index]) && lines[index].trim()) {
                    rows.push(tableCells(lines[index]));
                    index += 1;
                }
                var table = '<table><thead><tr>';
                header.forEach(function (cell) { table += "<th>" + renderInline(cell) + "</th>"; });
                table += "</tr></thead><tbody>";
                rows.forEach(function (row) {
                    table += "<tr>";
                    row.forEach(function (cell) { table += "<td>" + renderInline(cell) + "</td>"; });
                    table += "</tr>";
                });
                output.push(table + "</tbody></table>");
                continue;
            }

            if (/^>\s?/.test(line)) {
                var quote = [];
                while (index < lines.length && /^>\s?/.test(lines[index])) {
                    quote.push(lines[index].replace(/^>\s?/, ""));
                    index += 1;
                }
                output.push("<blockquote>" + renderInline(quote.join(" ")) + "</blockquote>");
                continue;
            }

            var ordered = /^\s*\d+\.\s+/.test(line);
            if (ordered || /^\s*[-*]\s+/.test(line)) {
                var listTag = ordered ? "ol" : "ul";
                var listHtml = "<" + listTag + ">";
                var bulletPattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*]\s+(.+)$/;
                while (index < lines.length) {
                    var listMatch = lines[index].match(bulletPattern);
                    if (!listMatch) { break; }
                    var item = listMatch[1];
                    index += 1;
                    while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !isSpecialLine(lines[index])) {
                        item += " " + lines[index].trim();
                        index += 1;
                    }
                    listHtml += "<li>" + renderInline(item) + "</li>";
                }
                output.push(listHtml + "</" + listTag + ">");
                continue;
            }

            var paragraph = [line.trim()];
            index += 1;
            while (index < lines.length && lines[index].trim() && !isSpecialLine(lines[index])) {
                paragraph.push(lines[index].trim());
                index += 1;
            }
            output.push("<p>" + renderInline(paragraph.join(" ")) + "</p>");
        }

        return output.join("\n");
    }

    function splitTerms(query) {
        return normalize(query).split(/\s+/).filter(Boolean);
    }

    function scoreEntry(entry, terms) {
        if (!terms.length) { return 0; }
        var score = 0;
        for (var i = 0; i < terms.length; i += 1) {
            var term = terms[i];
            if (entry._search.indexOf(term) === -1) { return -1; }
            if (normalize(entry.id) === term) { score += 40; }
            if (normalize(entry.title).indexOf(term) !== -1) { score += 18; }
            if (entry.tags.some(function (tag) { return normalize(tag).indexOf(term) !== -1; })) { score += 10; }
            if (normalize(entry.summary).indexOf(term) !== -1) { score += 6; }
            score += 1;
        }
        return score;
    }

    function filteredEntries() {
        var terms = splitTerms(state.query);
        return library.entries
            .filter(function (entry) {
                return (state.module === "all" || entry.module === state.module) &&
                    (state.difficulty === "all" || entry.difficulty === state.difficulty) &&
                    (state.tag === "all" || entry.tags.indexOf(state.tag) !== -1);
            })
            .map(function (entry) { return { entry: entry, score: scoreEntry(entry, terms) }; })
            .filter(function (item) { return item.score >= 0; })
            .sort(function (a, b) {
                if (b.score !== a.score) { return b.score - a.score; }
                return a.entry.id.localeCompare(b.entry.id);
            });
    }

    function selectedOption(value, current) {
        return value === current ? " selected" : "";
    }

    function tagMarkup(tags, activeTag) {
        return tags.map(function (tag) {
            var active = tag === activeTag ? " active" : "";
            return '<button class="chip' + active + '" type="button" data-tag="' + escapeHtml(tag) + '">' +
                escapeHtml(tag) + "</button>";
        }).join("");
    }

    function renderSidebar() {
        var activeModule = state.module;
        if (state.view === "detail" && entryMap.has(state.entryId)) {
            activeModule = entryMap.get(state.entryId).module;
        }
        moduleNav.innerHTML = library.modules.map(function (module) {
            var active = module.id === activeModule ? " active" : "";
            return '<button class="module-link' + active + '" type="button" data-module="' + module.id + '">' +
                '<span class="module-number">' + module.id + "</span>" +
                '<span class="module-name">' + escapeHtml(module.title) + "</span>" +
                '<span class="module-count">' + module.entryCount + "</span></button>";
        }).join("");
        document.getElementById("side-entry-count").textContent = library.stats.entryCount;
        document.getElementById("side-tag-count").textContent = library.stats.tagCount;
    }

    function renderHome() {
        var popularTags = allTags.slice(0, 14);
        var quickTerms = ["未定义行为", "越界", "内存泄漏", "悬空指针", "缓冲区溢出", "重复定义", "未定义引用", "qsort", "GDB", "ASan"];
        var paths = [
            { no: "01", title: "零基础主线", desc: "从程序结构、类型、运算符到函数、数组、字符串和指针。", module: "M01", label: "从 M01 开始" },
            { no: "02", title: "数据结构与实践线", desc: "围绕指针、聚合类型、内存所有权和常见算法构建能力。", module: "M08", label: "进入 M08" },
            { no: "03", title: "工程能力线", desc: "补齐文件、预处理、编译链接、标准库、调试与排错。", module: "M12", label: "进入 M12" }
        ];

        return '' +
            '<section class="hero">' +
            '<span class="hero-tag">ISO C11 / C17 · 离线可用</span>' +
            '<h1>把 C 语言学成一张可检索的地图</h1>' +
            '<p>从第一条语句到内存模型、编译链接和未定义行为；既能按模块顺序学习，也能在写错代码时按现象、函数、标签和编号快速查回答案。</p>' +
            '<div class="hero-actions">' +
            '<button class="primary-button" type="button" data-action="browse-all">浏览全部条目</button>' +
            '<button class="ghost-button" type="button" data-module="M18">查看易错清单</button>' +
            '</div>' +
            '<div class="hero-metrics">' +
            '<div class="metric"><strong>' + library.stats.moduleCount + '</strong><span>知识模块</span></div>' +
            '<div class="metric"><strong>' + library.stats.entryCount + '</strong><span>结构化条目</span></div>' +
            '<div class="metric"><strong>' + library.stats.tagCount + '</strong><span>检索标签</span></div>' +
            '<div class="metric"><strong>' + library.stats.sourceLines + '</strong><span>行源文档</span></div>' +
            '</div></section>' +

            '<div class="section-head"><div><h2>三条推荐学习路径</h2><p>路径只是阅读顺序；每条知识条目都是独立的查阅单元。</p></div></div>' +
            '<section class="path-grid">' + paths.map(function (path) {
                return '<article class="path-card"><span class="path-index">PATH ' + path.no + '</span>' +
                    '<h3>' + escapeHtml(path.title) + '</h3><p>' + escapeHtml(path.desc) + '</p>' +
                    '<button class="text-link" type="button" data-module="' + path.module + '">' + path.label + ' →</button></article>';
            }).join("") + '</section>' +

            '<div class="section-head"><div><h2>快速检索</h2><p>点击高频标签或常见报错词，也可以直接输入编号 E08.02。</p></div></div>' +
            '<section class="quick-grid">' +
            '<div class="quick-card"><h3>高频标签</h3><div class="chip-row">' + tagMarkup(popularTags, state.tag) + '</div></div>' +
            '<div class="quick-card"><h3>常见排错入口</h3><div class="chip-row">' + quickTerms.map(function (term) {
                return '<button class="chip chip-code" type="button" data-query="' + escapeHtml(term) + '">' + escapeHtml(term) + '</button>';
            }).join("") + '</div></div></section>' +

            '<div class="section-head"><div><h2>模块地图</h2><p>18 个模块按语言核心、工程能力和实践复习组织。</p></div>' +
            '<button class="text-link" type="button" data-action="browse-all">查看全部 →</button></div>' +
            '<section class="module-grid">' + library.modules.map(function (module) {
                return '<button class="module-card" type="button" data-module="' + module.id + '">' +
                    '<div class="module-card-top"><span class="module-card-id">' + module.id + '</span>' +
                    '<span class="module-card-count">' + module.entryCount + ' 条</span></div>' +
                    '<h3>' + escapeHtml(module.title) + '</h3><p>' + escapeHtml(module.intro) + '</p></button>';
            }).join("") + '</section>';
    }

    function renderBrowse() {
        var items = filteredEntries();
        var activeModule = state.module !== "all" && moduleMap.has(state.module) ? moduleMap.get(state.module) : null;
        var heading = activeModule ? activeModule.id + " " + activeModule.title : "全部知识条目";
        var description = activeModule ? activeModule.intro : "使用关键词、模块、难度与标签组合筛选；所有结果都来自 modules 目录中的 Markdown 源文件。";

        var moduleOptions = '<option value="all"' + selectedOption("all", state.module) + '>全部模块</option>' +
            library.modules.map(function (module) {
                return '<option value="' + module.id + '"' + selectedOption(module.id, state.module) + '>' +
                    escapeHtml(module.id + " " + module.title) + "</option>";
            }).join("");
        var difficultyOptions = '<option value="all"' + selectedOption("all", state.difficulty) + '>全部难度</option>' +
            difficulties.map(function (level) {
                return '<option value="' + level + '"' + selectedOption(level, state.difficulty) + '>' + level + "</option>";
            }).join("");
        var tagOptions = '<option value="all"' + selectedOption("all", state.tag) + '>全部标签</option>' +
            allTags.map(function (tag) {
                return '<option value="' + escapeHtml(tag) + '"' + selectedOption(tag, state.tag) + '>' +
                    escapeHtml(tag) + " (" + library.tagCounts[tag] + ")</option>";
            }).join("");

        var cards = items.map(function (item) {
            var entry = item.entry;
            return '<article class="result-card" role="button" tabindex="0" data-entry="' + entry.id + '">' +
                '<div class="result-top"><div><span class="result-id">' + entry.id + '</span>' +
                '<h3>' + escapeHtml(entry.title) + '</h3></div>' +
                '<span class="difficulty ' + difficultyClass[entry.difficulty] + '">' + entry.difficulty + '</span></div>' +
                '<p>' + escapeHtml(entry.summary) + '</p>' +
                '<div class="result-meta"><span class="result-module">' + entry.module + " · " + escapeHtml(entry.moduleTitle) + "</span>" +
                tagMarkup(entry.tags.slice(0, 5), state.tag) + '</div></article>';
        }).join("");

        return '' +
            '<section class="browse-header"><h1>' + escapeHtml(heading) + '</h1><p>' + escapeHtml(description) + '</p>' +
            '<div class="filter-bar">' +
            '<div class="field"><label for="filter-module">模块</label><select id="filter-module">' + moduleOptions + '</select></div>' +
            '<div class="field"><label for="filter-difficulty">难度</label><select id="filter-difficulty">' + difficultyOptions + '</select></div>' +
            '<div class="field"><label for="filter-tag">标签</label><select id="filter-tag">' + tagOptions + '</select></div>' +
            '<div class="filter-actions"><button class="ghost-button" type="button" data-action="clear-filters">重置筛选</button></div>' +
            '</div></section>' +
            '<div class="result-summary"><span>共 <strong>' + items.length + '</strong> 条结果</span>' +
            '<span>点击条目查看完整知识卡</span></div>' +
            (items.length ? '<section class="result-list">' + cards + '</section>' :
                '<section class="empty-state"><h3>没有匹配的条目</h3><p>试试更短的关键词、清除某个筛选条件，或搜索稳定编号。</p>' +
                '<button class="primary-button" type="button" data-action="clear-filters">重置筛选</button></section>');
    }

    function renderDetail() {
        var entry = entryMap.get(state.entryId);
        if (!entry) {
            return '<section class="empty-state"><h3>条目不存在</h3><p>请检查编号，或从目录重新选择。</p>' +
                '<button class="primary-button" type="button" data-action="browse-all">浏览全部</button></section>';
        }

        var globalIndex = library.entries.findIndex(function (item) { return item.id === entry.id; });
        var previous = globalIndex > 0 ? library.entries[globalIndex - 1] : null;
        var next = globalIndex >= 0 && globalIndex + 1 < library.entries.length ? library.entries[globalIndex + 1] : null;
        var referenceText = [entry.prerequisite, entry.related, entry.content].join(" ");
        var references = Array.from(new Set((referenceText.match(/E\d{2}\.\d{2}/g) || [])))
            .filter(function (id) { return id !== entry.id && entryMap.has(id); })
            .slice(0, 14);
        var toc = (entry.sectionOrder || []).map(function (name, index) {
            return '<button type="button" data-scroll="entry-section-' + (index + 1) + '">' +
                String(index + 1).padStart(2, "0") + " " + escapeHtml(name) + "</button>";
        }).join("");

        var relatedMarkup = references.length ? references.map(function (id) {
            var related = entryMap.get(id);
            return '<button class="related-button" type="button" data-entry="' + id + '">' +
                id + " · " + escapeHtml(related.title) + "</button>";
        }).join("") : '<span class="meta-pill">本条目未列出编号关联</span>';

        var previousMarkup = previous ? '<button type="button" data-entry="' + previous.id + '"><small>上一条</small>' +
            '<span>' + previous.id + " " + escapeHtml(previous.title) + "</span></button>" :
            '<button type="button" disabled><small>上一条</small><span>已经是第一条</span></button>';
        var nextMarkup = next ? '<button type="button" data-entry="' + next.id + '"><small>下一条</small>' +
            '<span>' + next.id + " " + escapeHtml(next.title) + "</span></button>" :
            '<button type="button" disabled><small>下一条</small><span>已经是最后一条</span></button>';

        return '' +
            '<div class="detail-bar"><div class="breadcrumbs">资料库 / <strong>' + entry.module + '</strong> / ' +
            escapeHtml(entry.moduleTitle) + ' / ' + entry.id + '</div>' +
            '<button class="ghost-button" type="button" data-action="browse-all">返回结果</button></div>' +
            '<article class="detail-card">' +
            '<header class="detail-header"><span class="detail-id">' + entry.id + '</span>' +
            '<h1>' + escapeHtml(entry.title) + '</h1><div class="detail-meta">' +
            '<span class="meta-pill">模块 <strong>' + entry.module + " " + escapeHtml(entry.moduleTitle) + '</strong></span>' +
            '<span class="meta-pill">难度 <strong>' + entry.difficulty + '</strong></span>' +
            '<span class="meta-pill">前置 <strong>' + escapeHtml(entry.prerequisite) + '</strong></span>' +
            '<span class="meta-pill">关联 <strong>' + escapeHtml(entry.related) + '</strong></span>' +
            '</div></header>' +
            '<div class="article-layout"><div class="markdown">' + renderMarkdown(entry.content) + '</div>' +
            '<aside class="article-toc"><h2>本条目导航</h2><nav>' + toc + '</nav>' +
            '<a class="toc-source" href="' + safeHref(entry.moduleFile) + '">查看 Markdown 源文件 →</a></aside></div>' +
            '<footer class="detail-footer"><h3 class="related-title">编号关联</h3>' +
            '<div class="related-list">' + relatedMarkup + '</div>' +
            '<div class="entry-nav">' + previousMarkup + nextMarkup + '</div></footer>' +
            '</article>';
    }

    function render() {
        if (searchInput.value !== state.query) { searchInput.value = state.query; }
        searchClear.classList.toggle("visible", Boolean(state.query));
        renderSidebar();

        if (state.view === "detail") {
            main.innerHTML = renderDetail();
            var current = entryMap.get(state.entryId);
            document.title = current ? current.id + " " + current.title + " · C Atlas" : "C Atlas · C 语言资料库";
        } else if (state.view === "browse") {
            main.innerHTML = renderBrowse();
            document.title = "检索结果 · C Atlas";
        } else {
            main.innerHTML = renderHome();
            document.title = "C Atlas · C 语言资料库";
        }
    }

    function routeParams() {
        var params = {};
        if (state.view === "detail" && state.entryId) {
            params.view = "detail";
            params.entry = state.entryId;
        } else if (state.view === "browse") {
            params.view = "browse";
        } else {
            params.view = "home";
        }
        if (state.query) { params.q = state.query; }
        if (state.module !== "all") { params.module = state.module; }
        if (state.difficulty !== "all") { params.difficulty = state.difficulty; }
        if (state.tag !== "all") { params.tag = state.tag; }
        return params;
    }

    function updateRoute(replace) {
        var query = new URLSearchParams(routeParams()).toString();
        var url = new URL(window.location.href);
        url.search = "";
        url.hash = query;
        var target = url.toString();
        try {
            if (replace) {
                history.replaceState(null, "", target);
            } else {
                history.pushState(null, "", target);
            }
        } catch (error) {
            ignoreNextHashChange = true;
            window.location.hash = "#" + query;
            window.setTimeout(function () { ignoreNextHashChange = false; }, 0);
        }
    }

    function syncFromRoute() {
        var params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.replace(/^\?/, ""));
        var entryParam = params.get("entry");
        state.query = params.get("q") || "";
        state.module = params.get("module") || "all";
        state.difficulty = params.get("difficulty") || "all";
        state.tag = params.get("tag") || "all";
        if (moduleMap.has(state.module) === false) { state.module = "all"; }
        if (difficulties.indexOf(state.difficulty) === -1) { state.difficulty = "all"; }
        if (allTags.indexOf(state.tag) === -1) { state.tag = "all"; }

        if (entryParam) {
            state.view = "detail";
            state.entryId = entryParam;
        } else if (params.get("view") === "browse" || state.query || state.module !== "all" ||
            state.difficulty !== "all" || state.tag !== "all") {
            state.view = "browse";
            state.entryId = null;
        } else {
            state.view = "home";
            state.entryId = null;
        }
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "auto" });
    }

    function goHome() {
        state.view = "home";
        state.entryId = null;
        state.query = "";
        state.module = "all";
        state.difficulty = "all";
        state.tag = "all";
        updateRoute(false);
        render();
        scrollToTop();
    }

    function browseAll() {
        state.view = "browse";
        state.entryId = null;
        state.query = "";
        state.module = "all";
        state.difficulty = "all";
        state.tag = "all";
        updateRoute(false);
        render();
        scrollToTop();
    }

    function clearFilters() {
        state.query = "";
        state.module = "all";
        state.difficulty = "all";
        state.tag = "all";
        state.entryId = null;
        state.view = "browse";
        updateRoute(true);
        render();
    }

    function openEntry(id) {
        if (!entryMap.has(id)) { return; }
        state.view = "detail";
        state.entryId = id;
        updateRoute(false);
        render();
        scrollToTop();
    }

    function openModule(id) {
        if (!moduleMap.has(id)) { return; }
        state.view = "browse";
        state.entryId = null;
        state.query = "";
        state.module = id;
        state.difficulty = "all";
        state.tag = "all";
        updateRoute(false);
        render();
        scrollToTop();
    }

    function openTag(tag) {
        state.view = "browse";
        state.entryId = null;
        state.query = "";
        state.tag = allTags.indexOf(tag) !== -1 ? tag : "all";
        state.difficulty = "all";
        updateRoute(false);
        render();
        scrollToTop();
    }

    function openQuery(query) {
        state.view = "browse";
        state.entryId = null;
        state.query = query;
        state.module = "all";
        state.difficulty = "all";
        state.tag = "all";
        updateRoute(false);
        render();
        scrollToTop();
    }

    function showToast(message) {
        var old = document.querySelector(".toast");
        if (old) { old.remove(); }
        var toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        document.body.appendChild(toast);
        window.setTimeout(function () { toast.remove(); }, 1600);
    }

    function copyCode(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () {
                showToast("代码已复制");
            }).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        var copied = false;
        try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
        textarea.remove();
        showToast(copied ? "代码已复制" : "复制失败，请手动选择代码");
    }

    main.addEventListener("click", function (event) {
        var target = event.target;
        var copyButton = target.closest("[data-copy]");
        if (copyButton) {
            var frame = copyButton.closest(".code-frame");
            var code = frame ? frame.querySelector("code") : null;
            if (code) { copyCode(code.textContent); }
            return;
        }

        var scrollButton = target.closest("[data-scroll]");
        if (scrollButton) {
            var section = document.getElementById(scrollButton.getAttribute("data-scroll"));
            if (section) { section.scrollIntoView({ behavior: "smooth", block: "start" }); }
            return;
        }

        var actionButton = target.closest("[data-action]");
        if (actionButton) {
            var action = actionButton.getAttribute("data-action");
            if (action === "home") { goHome(); }
            else if (action === "browse-all") { browseAll(); }
            else if (action === "clear-filters") { clearFilters(); }
            return;
        }

        var moduleButton = target.closest("[data-module]");
        if (moduleButton) {
            openModule(moduleButton.getAttribute("data-module"));
            return;
        }

        var tagButton = target.closest("[data-tag]");
        if (tagButton) {
            openTag(tagButton.getAttribute("data-tag"));
            return;
        }

        var queryButton = target.closest("[data-query]");
        if (queryButton) {
            openQuery(queryButton.getAttribute("data-query"));
            return;
        }

        var entryButton = target.closest("[data-entry]");
        if (entryButton) {
            openEntry(entryButton.getAttribute("data-entry"));
        }
    });

    main.addEventListener("keydown", function (event) {
        if ((event.key === "Enter" || event.key === " ") && event.target.matches(".result-card[data-entry]")) {
            event.preventDefault();
            openEntry(event.target.getAttribute("data-entry"));
        }
    });

    main.addEventListener("change", function (event) {
        var target = event.target;
        if (target.id === "filter-module") { state.module = target.value; }
        else if (target.id === "filter-difficulty") { state.difficulty = target.value; }
        else if (target.id === "filter-tag") { state.tag = target.value; }
        else { return; }
        state.entryId = null;
        state.view = "browse";
        updateRoute(true);
        render();
    });

    moduleNav.addEventListener("click", function (event) {
        var moduleButton = event.target.closest("[data-module]");
        if (moduleButton) {
            openModule(moduleButton.getAttribute("data-module"));
        }
    });

    searchInput.addEventListener("input", function () {
        state.view = "browse";
        state.entryId = null;
        state.query = searchInput.value;
        updateRoute(true);
        render();
    });

    searchClear.addEventListener("click", function () {
        state.query = "";
        state.view = "browse";
        state.entryId = null;
        updateRoute(true);
        render();
        searchInput.focus();
    });

    document.addEventListener("keydown", function (event) {
        var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        var shortcut = event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k");
        if (shortcut && !typing) {
            event.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (event.key === "Escape" && document.activeElement === searchInput && state.query) {
            state.query = "";
            state.view = "browse";
            state.entryId = null;
            updateRoute(true);
            render();
        }
    });

    document.querySelector(".brand").addEventListener("click", goHome);
    document.querySelectorAll('[data-action="browse-all"]').forEach(function (button) {
        if (button.closest(".topbar")) {
            button.addEventListener("click", browseAll);
        }
    });

    window.addEventListener("hashchange", function () {
        if (ignoreNextHashChange) { return; }
        syncFromRoute();
        render();
    });

    window.addEventListener("popstate", function () {
        syncFromRoute();
        render();
    });

    syncFromRoute();
    render();
}());

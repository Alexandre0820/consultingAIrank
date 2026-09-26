#!/usr/bin/env node
// 从 git 历史重建各期快照排名，生成 rank-history-preview.html（折线图 + 表格原型）。
// 用法：node research/build-rank-history-preview.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const COMMITS = [
  ["5ed9884", "06-19"], ["349ee57", "06-27"], ["267b33c", "07-04"],
  ["e7ca699", "07-10"], ["03c7c92", "07-19"], ["c3c6a62", "07-25"],
  ["b1bf912", "08-02"], ["93e87fc", "09-03"], ["9c15880", "09-06"],
  ["80b535d", "09-12"], ["d5ac490", "09-19"], ["da37507", "09-25"],
];
const CURVE = 70;

function ts(date) {
  if (!date) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(date + "T00:00:00Z") || 0;
  if (/^\d{4}-\d{2}$/.test(date)) return Date.parse(date + "-01T00:00:00Z") || 0;
  if (/^\d{4}$/.test(date)) return Date.parse(date + "-01-01T00:00:00Z") || 0;
  return Date.parse(date) || 0;
}
function weight(e, now) {
  const raw = Number(e.event_score || 0);
  const age = Math.max(0, (now - ts(e.date)) / 86400000);
  const rec = age <= 30 ? 1 : age <= 90 ? 0.92 : age <= 180 ? 0.82 : age <= 365 ? 0.72 : 0.58;
  const conf = e.confidence === "high" ? 1 : e.confidence === "medium" ? 0.93 : 0.82;
  const src = e.source_level === "official" || e.source_level === "official_press_release" ? 1
    : e.source_level === "vendor_official" ? 0.96 : e.source_level === "media" ? 0.9 : 0.86;
  return raw * rec * conf * src;
}
const decay = (i) => 1 / (1 + 0.45 * i);

function snapshot(commit) {
  const out = execSync(`git show ${commit}:data/ai-consulting-leaderboard.json`, { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 });
  const d = JSON.parse(out);
  const now = Date.parse(d.meta.updated_at + "T00:00:00Z");
  const rows = (d.companies || []).map((co) => {
    const evs = (co.events || []).filter((e) => ts(e.date) <= now).map((e) => weight(e, now)).filter((w) => w > 0).sort((a, b) => b - a);
    const total = evs.reduce((s, w, i) => s + w * decay(i), 0);
    return { id: co.id, name: co.name, total };
  });
  const max = Math.max(...rows.map((r) => r.total), 0);
  const maxRaw = 100 * (1 - Math.exp(-max / CURVE));
  const headFloor = 90;
  rows.forEach((r) => {
    r.score = 100 * (1 - Math.exp(-r.total / CURVE));
    if (maxRaw > headFloor && r.score > headFloor) {
      const n = Math.max(0, Math.min(1, (r.score - headFloor) / (maxRaw - headFloor)));
      r.score = headFloor + n * (100 - headFloor);
    }
  });
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

const periods = [];
const rankMap = new Map();
for (const [commit, label] of COMMITS) {
  const rows = snapshot(commit);
  periods.push(label);
  rows.forEach((r, i) => {
    if (!rankMap.has(r.name)) rankMap.set(r.name, { ranks: [], scores: [] });
    const entry = rankMap.get(r.name);
    entry.ranks[periods.length - 1] = i + 1;
    entry.scores[periods.length - 1] = Math.round(r.score * 10) / 10;
  });
}
const N = periods.length;
for (const entry of rankMap.values()) {
  for (let i = 0; i < N; i++) {
    if (!entry.ranks[i]) { entry.ranks[i] = null; entry.scores[i] = null; }
  }
}
// 按最新一期排名排序
const companies = [...rankMap.entries()].sort((a, b) => a[1].ranks[N - 1] - b[1].ranks[N - 1]).map(([name]) => name);

const PALETTE = ["#b42318", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#0369a1", "#15803d", "#a16207", "#4b5563", "#9333ea", "#0e7490", "#dc2626", "#4d7c0f", "#c2410c", "#334155", "#831843"];
const colorOf = new Map(companies.map((name, i) => [name, PALETTE[i % PALETTE.length]]));

const W = 1180, H = 640, L = 52, R = 168, T = 34, B = 48;
const x = (i) => L + (i * (W - L - R)) / (N - 1);
const y = (rank) => T + ((rank - 1) * (H - T - B)) / 16;

let grid = "";
for (let r = 1; r <= 17; r++) {
  grid += `<line x1="${L}" y1="${y(r)}" x2="${W - R + 24}" y2="${y(r)}" stroke="${r === 1 ? "#c9b98f" : "#e4dcc8"}" stroke-width="${r === 1 ? 1.4 : 1}"/><text x="${L - 10}" y="${y(r) + 4}" text-anchor="end" font-size="12" fill="#8a8069">#${r}</text>`;
}
let xLabels = "";
periods.forEach((p, i) => {
  xLabels += `<text x="${x(i)}" y="${H - B + 24}" text-anchor="middle" font-size="12" fill="#6b6350">${p}</text>`;
});

let lines = "", dots = "", endLabels = "";
for (const name of companies) {
  const { ranks } = rankMap.get(name);
  const color = colorOf.get(name);
  const pts = ranks.map((r, i) => (r ? `${x(i)},${y(r)}` : null)).filter(Boolean).join(" ");
  lines += `<polyline class="rk-line" data-name="${name}" points="${pts}" fill="none" stroke="${color}" stroke-width="2" opacity="0.85" stroke-linejoin="round"/>`;
  ranks.forEach((r, i) => {
    if (r) dots += `<circle class="rk-dot" data-name="${name}" cx="${x(i)}" cy="${y(r)}" r="3.4" fill="${color}" opacity="0.9"><title>${name} · ${periods[i]} · 第 ${r} 名</title></circle>`;
  });
  endLabels += `<text x="${W - R + 30}" y="${y(ranks[N - 1]) + 4}" font-size="12.5" font-weight="600" fill="${color}">${name} (#${ranks[N - 1]})</text>`;
}

let tableRows = "";
for (const name of companies) {
  const { ranks, scores } = rankMap.get(name);
  const cells = ranks.map((r, i) => {
    if (r === null) return "<td>–</td>";
    let arrow = "";
    if (i > 0 && ranks[i - 1] !== null) {
      if (r < ranks[i - 1]) arrow = `<span class="up">▲${ranks[i - 1] - r}</span>`;
      else if (r > ranks[i - 1]) arrow = `<span class="down">▼${r - ranks[i - 1]}</span>`;
      else arrow = `<span class="flat">→</span>`;
    }
    const heat = r <= 3 ? "heat-top" : r <= 8 ? "heat-mid" : r >= 15 ? "heat-low" : "";
    return `<td class="${heat}"><b>#${r}</b> ${arrow}<small>${scores[i] !== null ? scores[i].toFixed(1) : ""}</small></td>`;
  }).join("");
  const delta = ranks[N - 1] - ranks[0];
  const trend = delta > 0 ? `<span class="up">▲${delta}</span>` : delta < 0 ? `<span class="down">▼${-delta}</span>` : `<span class="flat">→</span>`;
  tableRows += `<tr data-name="${name}"><th style="color:${colorOf.get(name)}">${name}</th>${cells}<td>${trend}</td></tr>`;
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AI咨询行动榜 · 历史排名轨迹（原型）</title>
<style>
  body { margin:0; padding:32px 40px; background:#f4eee0; color:#221f1a; font-family:"Songti SC","Noto Serif SC",Georgia,serif; }
  h1 { font-size:30px; margin:0 0 4px; }
  .sub { color:#6b6350; margin:0 0 24px; font-size:14px; }
  .panel { background:#faf6ea; border:1px solid #e0d7bf; border-radius:14px; padding:20px 22px; margin-bottom:26px; }
  svg text { font-family:-apple-system,"PingFang SC",sans-serif; }
  .rk-line { transition: stroke-width .12s, opacity .12s; }
  svg.dim .rk-line { opacity:.12; } svg.dim .rk-dot { opacity:.1; }
  svg.dim .rk-line.on { opacity:1; stroke-width:3.2; } svg.dim .rk-dot.on { opacity:1; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th,td { border-bottom:1px solid #e8e0ca; padding:7px 9px; text-align:center; }
  thead th { color:#6b6350; font-size:12px; border-bottom:2px solid #c9b98f; }
  tbody th { text-align:left; font-size:13.5px; white-space:nowrap; }
  tbody tr:hover { background:#f1ead6; cursor:default; }
  td b { font-size:13.5px; } td small { display:block; color:#9a917c; font-size:10.5px; }
  .up { color:#15803d; font-size:11px; } .down { color:#b42318; font-size:11px; } .flat { color:#9a917c; font-size:11px; }
  .heat-top { background:#e8f3e4; } .heat-mid { background:#faf6ea; } .heat-low { background:#f3efe6; }
  .note { font-size:12.5px; color:#8a8069; line-height:1.7; }
</style>
</head>
<body>
<h1>AI咨询行动榜 · 历史排名轨迹</h1>
<p class="sub">2026-06-19 首期至 2026-09-25 共 ${N} 期 · 各期数据取自当期 git 快照、按现行行动力算法统一重算 · 原型预览版</p>

<div class="panel">
  <svg id="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${grid}${xLabels}${lines}${dots}${endLabels}
    <text x="${L}" y="${T - 12}" font-size="13" fill="#6b6350">排名（第 1 名在顶部）→ 各期快照日期</text>
  </svg>
</div>

<div class="panel">
  <table>
    <thead><tr><th style="text-align:left">公司</th>${periods.map((p) => `<th>${p}</th>`).join("")}<th>首期至今</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>

<p class="note">读法：折线与表格均为“第 N 名”，越靠上越好。表格单元格内小字为当期行动力分，▲▼ 为相对上一期的名次变化，最后一列为首期至今累计变化。悬停表格行可在折线图中高亮对应公司。排名与分数为研究预览口径，不代表权威排名。</p>

<script>
  const svg = document.getElementById("chart");
  document.querySelectorAll("tbody tr").forEach((tr) => {
    tr.addEventListener("mouseenter", () => {
      svg.classList.add("dim");
      svg.querySelectorAll("[data-name]").forEach((el) => el.classList.toggle("on", el.dataset.name === tr.dataset.name));
    });
    tr.addEventListener("mouseleave", () => {
      svg.classList.remove("dim");
      svg.querySelectorAll(".on").forEach((el) => el.classList.remove("on"));
    });
  });
</script>
</body>
</html>
`;

const outPath = path.join(__dirname, "rank-history-preview.html");
fs.writeFileSync(outPath, html);
console.log("生成:", outPath, `(${Math.round(html.length / 1024)} KB)`);

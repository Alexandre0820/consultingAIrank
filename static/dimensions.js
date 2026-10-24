// 维度对比页：每家公司一张九维雷达（并列卡片），附相对行动力指数。
// 口径与主榜一致：event_score × 新鲜度 × 置信度 × 来源 × 位置衰减；维度聚合用事件自带 dimension_tags。
const DATA_URL = "../data/ai-consulting-leaderboard.json";
const CARD_COLORS = ["#E8A33D", "#1E3A5F", "#4E937A"];
const CURVE = 70;
const decay = i => 1 / (1 + 0.45 * i);

let data = null, lang = "zh";
let computed = []; // {company, total, absScore, rel, dims, tagged}
let dimDefs = [];

const I18N = {
  zh: {
    eyebrow: "Dimension Compare",
    title: "维度对比",
    subtitle: "主榜分数即「相对行动力指数」：当期证据最强者为 100，其余按证据权重比例折算。本页每家公司一张九维雷达，并列对比、不再叠加；另附辅助口径「证据强度绝对分」。",
    sel: ["公司 A", "公司 B", "公司 C"],
    relLabel: "相对行动力指数",
    absLabel: "证据强度绝对分（辅助）",
    meta: (ev, tagged) => `事件 ${ev} 条 · 带维度标签 ${tagged} 条`,
    tableTitle: "九维明细",
    methodTitle: "口径说明",
    weight: " ·权重 ",
    methodA: "<b>证据强度绝对分（辅助口径）</b>全部有效事件按「事件分 × 新鲜度 × 置信度 × 来源分级」加权，全局位置衰减后求和，以 100×(1−e<sup>−t/70</sup>) 归一化。它衡量证据强度的绝对水平，渐进线是 100——头部公司证据量远超饱和点，会挤在 99–100，故仅作辅助参考。",
    methodB: "<b>相对行动力指数（主榜口径，2026-10-24 起）</b>当期证据加权总和最高的公司为 100，其余按比例折算（raw ÷ rawmax × 100）。它保留绝对分压缩掉的「量的差距」：榜首 100、证据量约为其一半的公司显示约 50。历史各期已按同一规则重算，跨期可比；排名顺序由原始加权总和决定。",
    note: period => `维度值来自事件自带 dimension_tags（无标签事件不参与雷达）；「并购与资本动作」全库事件极少，该轴普遍偏低是数据事实。数据期：${period}。`,
    tableHead: ["维度", "A", "B", "C"],
  },
  en: {
    eyebrow: "Dimension Compare",
    title: "Dimension Compare",
    subtitle: "The board score is the Relative Action Index: the strongest firm this period is 100, everyone else proportional. One nine-axis radar per firm, side by side, no overlay; an auxiliary absolute evidence score is shown alongside.",
    sel: ["Firm A", "Firm B", "Firm C"],
    relLabel: "Relative Action Index",
    absLabel: "Absolute evidence score (aux.)",
    meta: (ev, tagged) => `${ev} events · ${tagged} dimension-tagged`,
    tableTitle: "Nine dimensions, side by side",
    methodTitle: "Methodology",
    weight: " ·w ",
    methodA: "<b>Absolute evidence score (auxiliary)</b> All valid events weighted by event score × freshness × confidence × source tier, rank-decayed, normalized with 100×(1−e<sup>−t/70</sup>). It measures the absolute level of evidence intensity; the asymptote is 100 — top firms far exceed the saturation point and cluster at 99–100, so it serves only as a secondary reference.",
    methodB: "<b>Relative Action Index (board standard since 2026-10-24)</b> The firm with the highest weighted evidence total this period is 100; everyone else is scaled proportionally (raw ÷ rawmax × 100). It preserves the magnitude gaps the absolute score compresses: the leader is 100, a firm with roughly half the evidence shows about 50. All historical periods are recomputed under the same rule; rank order follows the raw weighted total.",
    note: period => `Dimension values come from per-event dimension_tags (untagged events excluded from the radar); M&A events are scarce library-wide, so that axis reads low for almost everyone — a data fact, not a bug. Data period: ${period}.`,
    tableHead: ["Dimension", "A", "B", "C"],
  },
};

function recencyFactor(dateStr, now) {
  const days = Math.max(0, (now - Date.parse(`${dateStr}T00:00:00Z`)) / 86400000);
  return days <= 30 ? 1 : days <= 90 ? 0.92 : days <= 180 ? 0.82 : days <= 365 ? 0.72 : 0.58;
}
function sourceFactor(level) {
  if (level === "official" || level === "official_press_release") return 1;
  if (level === "vendor_official") return 0.96;
  if (level === "media") return 0.9;
  return 0.86;
}
const confFactor = c => (c === "high" ? 1 : c === "medium" ? 0.93 : 0.82);

function weightedEvents(events, now) {
  return events
    .map(e => ({ w: (e.event_score ?? 0) * recencyFactor(e.date, now) * confFactor(e.confidence) * sourceFactor(e.source_level) }))
    .filter(x => x.w > 0)
    .sort((a, b) => b.w - a.w)
    .map((x, i) => x.w * decay(i));
}

function computeAll() {
  const now = Date.parse(`${data.meta.updated_at}T00:00:00Z`) || Date.now();
  computed = data.companies.map(company => {
    const events = company.events || [];
    const total = weightedEvents(events, now).reduce((s, x) => s + x, 0);
    const dims = {};
    for (const d of dimDefs) {
      const list = events
        .filter(e => Array.isArray(e.dimension_tags) && e.dimension_tags.includes(d.id))
        .map(e => (e.event_score ?? 0) * recencyFactor(e.date, now) * confFactor(e.confidence) * sourceFactor(e.source_level))
        .filter(w => w > 0)
        .sort((a, b) => b - a)
        .map((w, i) => w * decay(i));
      dims[d.id] = Math.round(100 * (1 - Math.exp(-list.reduce((s, x) => s + x, 0) / CURVE)) * 10) / 10;
    }
    return {
      company,
      total,
      absScore: Math.round(100 * (1 - Math.exp(-total / CURVE)) * 10) / 10,
      dims,
      tagged: events.filter(e => Array.isArray(e.dimension_tags) && e.dimension_tags.length).length,
    };
  });
  const max = Math.max(...computed.map(c => c.total));
  computed.forEach(c => {
    // 相对行动力指数（与主榜口径一致）：当期榜首 = 100
    c.rel = Math.round((c.total / max) * 1000) / 10;
    // 辅助口径：证据强度绝对分（饱和曲线，无拉伸）
    c.absScore = Math.round(100 * (1 - Math.exp(-c.total / CURVE)) * 10) / 10;
  });
  computed.sort((a, b) => b.total - a.total);
}

function radarSvg(dims, color) {
  const n = dimDefs.length, W = 380, H = 330, cx = W / 2, cy = H / 2 + 4, R = 108;
  const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  let g = "";
  [25, 50, 75, 100].forEach(v => {
    const r = (R * v) / 100;
    const pts = dimDefs.map((_, i) => pt(i, r).map(x => x.toFixed(1)).join(",")).join(" ");
    g += `<polygon points="${pts}" fill="none" stroke="#E4DED2" stroke-width="1"/><text class="dc-ring" x="${cx + 3}" y="${cy - r + 9}">${v}</text>`;
  });
  dimDefs.forEach((d, i) => {
    const [x, y] = pt(i, R);
    g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#E4DED2" stroke-width="1"/>`;
    const [lx, ly] = pt(i, R + 17);
    const anchor = Math.abs(lx - cx) < 10 ? "middle" : lx > cx ? "start" : "end";
    g += `<text class="dc-axis" x="${lx.toFixed(1)}" y="${(ly + (Math.abs(ly - cy) < 10 ? 4 : 0)).toFixed(1)}" text-anchor="${anchor}">${lang === "en" ? d.id : d.name}</text>`;
  });
  const val = d => Math.max(0, Math.min(100, dims[d.id] ?? 0));
  const pts = dimDefs.map((d, i) => pt(i, (R * val(d)) / 100).map(x => x.toFixed(1)).join(",")).join(" ");
  g += `<polygon points="${pts}" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>`;
  dimDefs.forEach((d, i) => { const [x, y] = pt(i, (R * val(d)) / 100); g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8" fill="${color}"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="dimension radar">${g}</svg>`;
}

const picked = () => ["dcSelA", "dcSelB", "dcSelC"].map(id => document.getElementById(id).value).filter(Boolean);

function render() {
  const t = I18N[lang];
  document.getElementById("dcTitle").textContent = t.title;
  document.getElementById("dcSubtitle").textContent = t.subtitle;
  ["dcSelALabel", "dcSelBLabel", "dcSelCLabel"].forEach((id, i) => {
    const el = document.getElementById(id);
    el.firstChild.textContent = t.sel[i] + " ";
  });
  document.getElementById("dcTableTitle").textContent = t.tableTitle;
  document.getElementById("dcMethodTitle").textContent = t.methodTitle;
  document.getElementById("dcMethodA").innerHTML = t.methodA;
  document.getElementById("dcMethodB").innerHTML = t.methodB;
  document.getElementById("dcNote").textContent = t.note(data.meta.updated_at);

  const names = picked();
  const cards = names.map((name, i) => {
    const c = computed.find(x => x.company.name === name);
    if (!c) return "";
    const color = CARD_COLORS[i];
    return `
      <div class="dc-card">
        <h3 style="color:${color}">${lang === "en" ? c.company.name : `${c.company.cn || ""} ${c.company.name}`}</h3>
        <div class="tier">${c.company.tier || ""}</div>
        <div class="dc-scores">
          <div class="dc-rel" style="color:${color}">${c.rel.toFixed(1)}<small>${t.relLabel}</small></div>
          <div class="dc-abs">${c.absScore.toFixed(1)}<small>${t.absLabel}</small></div>
        </div>
        <p class="dc-meta">${t.meta((c.company.events || []).length, c.tagged)}</p>
        ${radarSvg(c.dims, color)}
      </div>`;
  }).join("");
  document.getElementById("dcCards").innerHTML = cards;

  const rows = dimDefs.map(d => {
    const cells = names.map((name, i) => {
      const c = computed.find(x => x.company.name === name);
      const v = c ? c.dims[d.id].toFixed(1) : "—";
      return `<td class="v" style="color:${CARD_COLORS[i]}">${v}</td>`;
    }).join("");
    return `<tr><td>${lang === "en" ? d.id : d.name}<span style="color:#b8b0a4;font-weight:400">${t.weight}${(d.weight * 100).toFixed(1)}%</span></td>${cells}</tr>`;
  }).join("");
  const relRow = names.map((name, i) => {
    const c = computed.find(x => x.company.name === name);
    return `<td class="v" style="color:${CARD_COLORS[i]}">${c ? c.rel.toFixed(1) : "—"}</td>`;
  }).join("");
  document.getElementById("dcTable").innerHTML = `
    <tr><th>${t.tableHead[0]}</th>${names.map((_, i) => `<th>${t.tableHead[i + 1]}</th>`).join("")}</tr>
    ${rows}
    <tr><td><b>${t.relLabel}</b></td>${relRow}</tr>`;
}

function setupLang() {
  const zh = document.getElementById("dcLangZh"), en = document.getElementById("dcLangEn");
  zh.addEventListener("click", () => { lang = "zh"; zh.classList.add("is-active"); en.classList.remove("is-active"); render(); });
  en.addEventListener("click", () => { lang = "en"; en.classList.add("is-active"); zh.classList.remove("is-active"); render(); });
}

(async function init() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`data load failed: ${res.status}`);
  data = await res.json();
  dimDefs = data.dimensions || [];
  computeAll();
  const opts = computed.map(c => `<option value="${c.company.name}">${c.company.cn || ""} ${c.company.name}</option>`).join("");
  ["dcSelA", "dcSelB", "dcSelC"].forEach(id => { document.getElementById(id).innerHTML = opts; document.getElementById(id).addEventListener("change", render); });
  const defaults = ["Accenture", "BCG", "McKinsey"];
  ["dcSelA", "dcSelB", "dcSelC"].forEach((id, i) => { document.getElementById(id).value = defaults[i]; });
  setupLang();
  render();
})().catch(err => {
  document.getElementById("dcCards").innerHTML = `<div class="dc-card">${err.message}</div>`;
});

// 历史排名页：读取 data/rank-history.json，渲染折线图 + 各期排名明细表 + 洞察总结。
// 数据由 scripts/build-rank-history.js 从 git 历史快照生成。
// 交互：时间窗滑动条（起/止期）、点击折线或表格行选中并高亮、悬停临时高亮。
const DATA_URL = "../data/rank-history.json";

const I18N = {
  zh: {
    historyEyebrow: "Rank History · 2026-06 → Now",
    historyTitle: "历史排名轨迹",
    historySubtitle: "从首期到最新一期的完整排名变化：各期数据取自当期发布快照，按现行行动力算法统一重算，分数跨期可比。",
    chartTitle: "排名折线",
    chartSubtitle: "第 1 名在顶部；点击折线、圆点或右侧公司名可锁定高亮，再次点击取消。",
    windowLabel: "时间窗",
    allPeriods: "全部",
    tableTitle: "各期排名明细",
    tableSubtitle: "单元格内小字为当期行动力分，▲▼ 为相对上一期变化；点击表格行可锁定高亮对应公司。",
    historyNote: "排名与分数为研究预览口径，不代表权威排名；早期页面的展示公式与现行版本略有差异，本页按现行算法统一重算以保证跨期可比。",
    navBoard: "行动力榜单",
    navHistory: "历史排名",
    axisNote: "排名（第 1 名在顶部）→ 各期快照日期",
    sinceFirst: "首期至今",
    companyCol: "公司",
    loading: "历史数据加载中…",
    insightsTitle: "排名变化洞察",
    insightsSubtitle: "由各期名次自动汇总：谁在上升、谁在回落，以及这背后说明什么。",
    riserKicker: "上升阵营",
    riserTitle: (list) => `${list} 持续上行`,
    riserBody: (list) => `行动力口径奖励“最近有动作”。${list} 凭连续多周的官方净新增信号（研究、平台、客户证明）一路上行——在这张榜上，持续产出比一次性爆发更能累积位置。`,
    fallerKicker: "回落阵营",
    fallerTitle: (list) => `${list} 名次回落`,
    fallerBody: (list, examples) => `早期名次高不代表后来失守：创榜初期样本小，一条强事件就能把精品公司顶到前列${examples}；随着 Big Four 每周信号密度上来，而自身进入发布静默期，行动力分随证据老化自然衰减，名次随之回落。这是“近期公开动作强度”口径的正常结果，不等于能力下降。`.replace("（占位）", list),
    crownKicker: "榜首轮替",
    crownTitle: (list) => `榜首 ${list} 次换手：谁在密集发布，谁就登顶`,
    crownBody: (runs) => `榜首序列为 ${runs}。每次换手都对应一轮密集的官方输出——PwC 的 OpenAI 合作期、Accenture 的 Partner Network 期、McKinsey 的 agentic AI 叙事期、BCG 的 9 月研究爆发期。这印证了榜单定位：它是“最近谁在把 AI 做成动作”的行动榜，不是终身成就榜；停止发布就会被反超。`,
    quietInsightKicker: "沉默的代价",
    quietInsightTitle: "沉默期会直接反映到名次上",
    quietInsightBody: "行动力分只统计最近约 180 天的证据，且旧证据按新鲜度衰减。连续几周没有可确认的公开信号，分数就会下滑，即使没有任何负面新闻——榜单上有 5 家以上公司正处在这种状态。",
  },
  en: {
    historyEyebrow: "Rank History · Jun 2026 → Now",
    historyTitle: "Ranking Trajectory",
    historySubtitle: "Full ranking movement from the first release to the latest snapshot: each period uses its own published data, recomputed with the current action algorithm so scores are comparable across periods.",
    chartTitle: "Rank Lines",
    chartSubtitle: "Rank #1 sits at the top. Click a line, dot, or firm label to lock the highlight; click again to release.",
    windowLabel: "Window",
    allPeriods: "All",
    tableTitle: "Period-by-Period Detail",
    tableSubtitle: "Small figures are the period's action score; ▲▼ mark movement versus the previous period. Click a row to lock the highlight.",
    historyNote: "Ranks and scores follow the research-preview methodology and are not an authoritative ranking. Early releases used a slightly different display formula; all periods here are recomputed with the current algorithm for comparability.",
    navBoard: "Action Ranking",
    navHistory: "Rank History",
    axisNote: "Rank (#1 on top) → snapshot dates",
    sinceFirst: "Since first",
    companyCol: "Firm",
    loading: "Loading history…",
    insightsTitle: "What the Movement Tells Us",
    insightsSubtitle: "Auto-summarized from period ranks: who is rising, who is sliding, and what it means.",
    riserKicker: "Risers",
    riserTitle: (list) => `${list} keep climbing`,
    riserBody: (list) => `The action score rewards "having recent moves". ${list} climbed on consecutive weeks of official net-new signals (research, platforms, client proof). On this board, sustained output compounds position far more than a one-off burst.`,
    fallerKicker: "Sliders",
    fallerTitle: (list) => `${list} slid down the board`,
    fallerBody: (list, examples) => `An early high rank was never a guarantee: the first samples were small, and one strong event could lift a boutique firm near the top${examples}. As the Big Four raised weekly signal density and these firms entered publishing lulls, action scores decayed with evidence age and ranks followed. That is the normal result of a "recent public action" methodology, not a verdict on capability.`,
    crownKicker: "Crown Rotation",
    crownTitle: (n) => `The lead changed hands ${n} times: whoever publishes densely, leads`,
    crownBody: (runs) => `The #1 sequence: ${runs}. Each handover matched a burst of official output — PwC's OpenAI stretch, Accenture's Partner Network run, McKinsey's agentic-AI narrative, BCG's September research surge. It confirms the board's nature: an action ranking of who recently turns AI into moves, not a lifetime-achievement list.`,
    quietInsightKicker: "Cost of Silence",
    quietInsightTitle: "Quiet weeks show up in the ranks directly",
    quietInsightBody: "The action score only counts evidence from roughly the last 180 days, and older evidence decays by freshness. A few consecutive weeks without verifiable public signals pull the score down even with zero negative news — several firms on this board are in exactly that state.",
  },
};

let lang = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "zh";
let historyData = null;
let winStart = 0;
let winEnd = 0;
let selected = null;

const PALETTE = ["#b42318", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#0369a1", "#15803d", "#a16207", "#4b5563", "#9333ea", "#0e7490", "#dc2626", "#4d7c0f", "#c2410c", "#334155", "#831843"];

function t(key) { return I18N[lang][key] || I18N.zh[key] || key; }

function shortPeriod(date) {
  const [, month, day] = date.split("-");
  return lang === "en"
    ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1]} ${Number(day)}`
    : `${Number(month)}-${Number(day)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function applyText() {
  document.title = lang === "en" ? "Rank History · AI Consulting Signal Index" : "历史排名 · AI咨询行动榜";
  for (const key of ["historyEyebrow", "historyTitle", "historySubtitle", "chartTitle", "chartSubtitle", "tableTitle", "tableSubtitle", "historyNote"]) {
    const el = document.getElementById(key);
    if (el) el.textContent = t(key);
  }
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
}

function syncLanguageInUrl() {
  const url = new URL(window.location.href);
  if (lang === "en") url.searchParams.set("lang", "en");
  else url.searchParams.delete("lang");
  window.history.replaceState(null, "", url);
}

function colorOf(name) {
  const idx = historyData.companies.findIndex((c) => c.name === name);
  return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length];
}

function svgText(content, attrs) {
  return `<text ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}>${content}</text>`;
}

function renderChart() {
  const periods = historyData.periods.slice(winStart, winEnd + 1);
  const N = periods.length;
  const W = 1180, H = 640, L = 52, R = 172, T = 34, B = 48;
  const x = (i) => (N === 1 ? L : L + (i * (W - L - R)) / (N - 1));
  const y = (rank) => T + ((rank - 1) * (H - T - B)) / 16;

  let grid = "";
  for (let r = 1; r <= 17; r++) {
    grid += `<line x1="${L}" y1="${y(r)}" x2="${W - R + 24}" y2="${y(r)}" stroke="${r === 1 ? "rgba(180,35,24,.28)" : "rgba(23,20,17,.12)"}" stroke-width="${r === 1 ? 1.4 : 1}"/>`;
    grid += svgText(`#${r}`, { x: L - 10, y: y(r) + 4, "text-anchor": "end", "font-size": 12, fill: "#746b5f" });
  }
  let xLabels = "";
  periods.forEach((p, i) => {
    xLabels += svgText(escapeHtml(shortPeriod(p)), { x: x(i), y: H - B + 24, "text-anchor": "middle", "font-size": 12, fill: "#746b5f" });
  });

  let hits = "", lines = "", dots = "", endLabels = "";
  for (const company of historyData.companies) {
    const color = colorOf(company.name);
    const segs = [];
    let cur = null;
    company.ranks.slice(winStart, winEnd + 1).forEach((r, i) => {
      if (r) {
        cur = cur || [];
        cur.push(`${x(i)},${y(r)}`);
      } else if (cur) { segs.push(cur); cur = null; }
    });
    if (cur) segs.push(cur);
    for (const pts of segs) {
      lines += `<polyline class="rk-line" data-name="${escapeHtml(company.name)}" points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" opacity="0.85" stroke-linejoin="round"/>`;
      hits += `<polyline class="rk-hit" data-name="${escapeHtml(company.name)}" points="${pts.join(" ")}" fill="none" stroke="transparent" stroke-width="12"/>`;
    }
    company.ranks.slice(winStart, winEnd + 1).forEach((r, i) => {
      if (!r) return;
      dots += `<circle class="rk-dot" data-name="${escapeHtml(company.name)}" cx="${x(i)}" cy="${y(r)}" r="3.4" fill="${color}" opacity="0.9"><title>${escapeHtml(company.name)} · ${shortPeriod(periods[i])} · #${r}</title></circle>`;
    });
    const lastRank = company.ranks[winEnd];
    if (lastRank) {
      endLabels += `<text class="rk-end" data-name="${escapeHtml(company.name)}" x="${W - R + 30}" y="${y(lastRank) + 4}" font-size="12.5" font-weight="600" fill="${color}">${escapeHtml(company.name)} (#${lastRank})</text>`;
    }
  }

  return `<svg id="rankChart" width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(t("chartTitle"))}">
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" data-name="__bg"/>
    ${grid}${xLabels}${hits}${lines}${dots}${endLabels}
    ${svgText(escapeHtml(t("axisNote")), { x: L, y: T - 12, "font-size": 13, fill: "#746b5f" })}
  </svg>`;
}

function renderSliderLabels() {
  const label = document.getElementById("windowLabel");
  if (!label) return;
  const from = shortPeriod(historyData.periods[winStart]);
  const to = shortPeriod(historyData.periods[winEnd]);
  label.textContent = `${t("windowLabel")}：${from} → ${to}（${winEnd - winStart + 1}/${historyData.periods.length}）`;
}

function renderSlider() {
  const container = document.getElementById("sliderWrap");
  if (!container) return;
  const n = historyData.periods.length;
  container.innerHTML = `
    <label class="rk-slider">${lang === "en" ? "From" : "起始"}
      <input id="sliderStart" type="range" min="0" max="${n - 2}" value="${winStart}" step="1"/>
    </label>
    <label class="rk-slider">${lang === "en" ? "To" : "结束"}
      <input id="sliderEnd" type="range" min="1" max="${n - 1}" value="${winEnd}" step="1"/>
    </label>
  `;
  document.getElementById("sliderStart").addEventListener("input", (e) => {
    winStart = Math.min(Number(e.target.value), winEnd - 1);
    e.target.value = winStart;
    refreshChartArea();
  });
  document.getElementById("sliderEnd").addEventListener("input", (e) => {
    winEnd = Math.max(Number(e.target.value), winStart + 1);
    e.target.value = winEnd;
    refreshChartArea();
  });
}

function renderTable() {
  const periods = historyData.periods;
  const N = periods.length;
  const head = `<tr><th class="lt">${escapeHtml(t("companyCol"))}</th>${periods.map((p) => `<th>${shortPeriod(p)}</th>`).join("")}<th>${escapeHtml(t("sinceFirst"))}</th></tr>`;

  const rows = historyData.companies.map((company) => {
    const color = colorOf(company.name);
    const cells = company.ranks.map((r, i) => {
      if (!r) return "<td>–</td>";
      let arrow = "";
      const prev = i > 0 ? company.ranks[i - 1] : null;
      if (prev) {
        if (r < prev) arrow = `<span class="rk-up">▲${prev - r}</span>`;
        else if (r > prev) arrow = `<span class="rk-down">▼${r - prev}</span>`;
        else arrow = `<span class="rk-flat">→</span>`;
      }
      const heat = r <= 3 ? "heat-top" : r <= 8 ? "heat-mid" : r >= 15 ? "heat-low" : "";
      const score = company.scores[i] !== null ? company.scores[i].toFixed(1) : "";
      return `<td class="${heat}"><b>#${r}</b> ${arrow}<small>${score}</small></td>`;
    }).join("");
    const first = company.ranks.find((r) => r !== null);
    const last = company.ranks[N - 1];
    const delta = last - first;
    const trend = delta > 0 ? `<span class="rk-up">▲${delta}</span>` : delta < 0 ? `<span class="rk-down">▼${-delta}</span>` : `<span class="rk-flat">→</span>`;
    return `<tr data-name="${escapeHtml(company.name)}"><th class="lt" style="color:${color}">${escapeHtml(company.name)}</th>${cells}<td>${trend}</td></tr>`;
  }).join("");

  return `<table class="rank-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function renderInsights() {
  const grid = document.getElementById("insightsGrid");
  if (!grid) return;
  const N = historyData.periods.length;

  const stat = historyData.companies.map((c) => {
    const ranks = c.ranks.filter((r) => r !== null);
    return { name: c.name, first: ranks[0], last: ranks[ranks.length - 1], best: Math.min(...ranks), worst: Math.max(...ranks), delta: ranks[ranks.length - 1] - ranks[0] };
  });
  const risers = stat.filter((s) => s.delta <= -3).sort((a, b) => a.delta - b.delta);
  const fallers = stat.filter((s) => s.delta >= 3).sort((a, b) => b.delta - a.delta);

  const crownRuns = [];
  for (let i = 0; i < N; i++) {
    const holder = historyData.companies.find((c) => c.ranks[i] === 1);
    if (!holder) continue;
    const lastRun = crownRuns[crownRuns.length - 1];
    if (lastRun && lastRun.name === holder.name) lastRun.end = i;
    else crownRuns.push({ name: holder.name, start: i, end: i });
  }
  const crownSeq = crownRuns.map((r) => `${r.name}（${shortPeriod(historyData.periods[r.start])}–${shortPeriod(historyData.periods[r.end])}）`).join(" → ");

  const cards = [];
  if (risers.length) {
    const list = risers.map((s) => `${s.name}（#${s.first}→#${s.last}）`).join(lang === "en" ? ", " : "、");
    cards.push({ kicker: t("riserKicker"), accent: "#15803d", title: t("riserTitle")(list), body: t("riserBody")(list) });
  }
  if (fallers.length) {
    const list = fallers.map((s) => `${s.name}（#${s.first}→#${s.last}）`).join(lang === "en" ? ", " : "、");
    const examples = lang === "en"
      ? ` — FTI opened at #4 and A&M at #3`
      : `——FTI 首期第 4、A&M 首期第 3`;
    cards.push({ kicker: t("fallerKicker"), accent: "#b42318", title: t("fallerTitle")(list), body: t("fallerBody")(list, examples) });
  }
  cards.push({ kicker: t("crownKicker"), accent: "#1d4ed8", title: t("crownTitle")(crownRuns.length - 1), body: t("crownBody")(crownSeq) });
  cards.push({ kicker: t("quietInsightKicker"), accent: "#ff8a00", title: t("quietInsightTitle"), body: t("quietInsightBody") });

  grid.innerHTML = cards.map((item) => `
    <article class="insight-card" style="--accent:${item.accent}">
      <span class="insight-card__kicker">${escapeHtml(item.kicker)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join("");
}

function applyHighlight() {
  const svg = document.getElementById("rankChart");
  if (!svg) return;
  svg.classList.toggle("has-pick", Boolean(selected));
  svg.querySelectorAll("[data-name]").forEach((el) => {
    el.classList.toggle("picked", selected !== null && el.dataset.name === selected);
  });
  document.querySelectorAll("#tableWrap tbody tr").forEach((tr) => {
    tr.classList.toggle("row-picked", selected !== null && tr.dataset.name === selected);
  });
}

function bindInteractions() {
  document.querySelectorAll("#tableWrap tbody tr").forEach((tr) => {
    tr.addEventListener("mouseenter", () => {
      svg.classList.add("dim");
      svg.querySelectorAll("[data-name]").forEach((el) => el.classList.toggle("on", el.dataset.name === tr.dataset.name));
    });
    tr.addEventListener("mouseleave", () => {
      svg.classList.remove("dim");
      svg.querySelectorAll(".on").forEach((el) => el.classList.remove("on"));
      applyHighlight();
    });
    tr.addEventListener("click", () => {
      selected = selected === tr.dataset.name ? null : tr.dataset.name;
      applyHighlight();
    });
  });
}

function renderNav() {
  document.querySelectorAll("[data-nav='board']").forEach((el) => (el.textContent = t("navBoard")));
  document.querySelectorAll("[data-nav='history']").forEach((el) => (el.textContent = t("navHistory")));
}

function refreshChartArea() {
  document.getElementById("chartWrap").innerHTML = renderChart();
  renderSliderLabels();
  applyHighlight();
  bindChartOnly();
}

function bindChartOnly() {
  const svg = document.getElementById("rankChart");
  svg.addEventListener("click", (event) => {
    const target = event.target.closest("[data-name]");
    const name = target && target.dataset.name !== "__bg" ? target.dataset.name : null;
    selected = selected === name ? null : name;
    applyHighlight();
  });
}

function renderAll() {
  applyText();
  renderNav();
  document.getElementById("tableWrap").innerHTML = renderTable();
  renderInsights();
  refreshChartArea();
  bindInteractions();
}

async function init() {
  applyText();
  const wrap = document.getElementById("chartWrap");
  wrap.innerHTML = `<div class="empty">${escapeHtml(t("loading"))}</div>`;
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`rank-history.json 加载失败：${response.status}`);
  historyData = await response.json();
  winStart = 0;
  winEnd = historyData.periods.length - 1;
  renderAll();
  renderSlider();

  document.getElementById("langZh").addEventListener("click", () => {
    lang = "zh";
    syncLanguageInUrl();
    renderAll();
    renderSlider();
  });
  document.getElementById("langEn").addEventListener("click", () => {
    lang = "en";
    syncLanguageInUrl();
    renderAll();
    renderSlider();
  });
}

init().catch((error) => {
  document.getElementById("chartWrap").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});

// 历史排名页：读取 data/rank-history.json，渲染折线图 + 各期排名明细表。
// 数据由 scripts/build-rank-history.js 从 git 历史快照生成。
const DATA_URL = "../data/rank-history.json";

const I18N = {
  zh: {
    historyEyebrow: "Rank History · 2026-06 → Now",
    historyTitle: "历史排名轨迹",
    historySubtitle: "从首期到最新一期的完整排名变化：各期数据取自当期发布快照，按现行行动力算法统一重算，分数跨期可比。",
    chartTitle: "排名折线",
    chartSubtitle: "第 1 名在顶部；悬停圆点查看公司、期次与名次。",
    tableTitle: "各期排名明细",
    tableSubtitle: "单元格内小字为当期行动力分，▲▼ 为相对上一期变化；悬停表格行可在折线图中高亮该公司。",
    historyNote: "排名与分数为研究预览口径，不代表权威排名；早期页面的展示公式与现行版本略有差异，本页按现行算法统一重算以保证跨期可比。",
    navBoard: "行动力榜单",
    navHistory: "历史排名",
    axisNote: "排名（第 1 名在顶部）→ 各期快照日期",
    tooltipRank: "第",
    tooltipOf: "名",
    sinceFirst: "首期至今",
    companyCol: "公司",
    loading: "历史数据加载中…",
  },
  en: {
    historyEyebrow: "Rank History · Jun 2026 → Now",
    historyTitle: "Ranking Trajectory",
    historySubtitle: "Full ranking movement from the first release to the latest snapshot: each period uses its own published data, recomputed with the current action algorithm so scores are comparable across periods.",
    chartTitle: "Rank Lines",
    chartSubtitle: "Rank #1 sits at the top; hover any dot for firm, period, and rank.",
    tableTitle: "Period-by-Period Detail",
    tableSubtitle: "Small figures are the period's action score; ▲▼ mark movement versus the previous period. Hover a table row to highlight that firm in the chart.",
    historyNote: "Ranks and scores follow the research-preview methodology and are not an authoritative ranking. Early releases used a slightly different display formula; all periods here are recomputed with the current algorithm for comparability.",
    navBoard: "Action Ranking",
    navHistory: "Rank History",
    axisNote: "Rank (#1 on top) → snapshot dates",
    tooltipRank: "#",
    tooltipOf: "",
    sinceFirst: "Since first",
    companyCol: "Firm",
    loading: "Loading history…",
  },
};

let lang = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "zh";
let historyData = null;

const PALETTE = ["#b42318", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#0369a1", "#15803d", "#a16207", "#4b5563", "#9333ea", "#0e7490", "#dc2626", "#4d7c0f", "#c2410c", "#334155", "#831843"];

function t(key) {
  return I18N[lang][key] || I18N.zh[key] || key;
}

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

function svgText(content, attrs) {
  return `<text ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}>${content}</text>`;
}

function renderChart() {
  const { periods, companies } = historyData;
  const N = periods.length;
  const W = 1180, H = 640, L = 52, R = 172, T = 34, B = 48;
  const x = (i) => L + (i * (W - L - R)) / (N - 1);
  const y = (rank) => T + ((rank - 1) * (H - T - B)) / 16;

  const colorOf = new Map(companies.map((c, i) => [c.name, PALETTE[i % PALETTE.length]]));

  let grid = "";
  for (let r = 1; r <= 17; r++) {
    grid += `<line x1="${L}" y1="${y(r)}" x2="${W - R + 24}" y2="${y(r)}" stroke="${r === 1 ? "rgba(180,35,24,.28)" : "rgba(23,20,17,.12)"}" stroke-width="${r === 1 ? 1.4 : 1}"/>`;
    grid += svgText(`#${r}`, { x: L - 10, y: y(r) + 4, "text-anchor": "end", "font-size": 12, fill: "#746b5f" });
  }
  let xLabels = "";
  periods.forEach((p, i) => {
    xLabels += svgText(escapeHtml(shortPeriod(p)), { x: x(i), y: H - B + 24, "text-anchor": "middle", "font-size": 12, fill: "#746b5f" });
  });

  let lines = "", dots = "", endLabels = "";
  for (const company of companies) {
    const color = colorOf.get(company.name);
    const pts = company.ranks.map((r, i) => (r ? `${x(i)},${y(r)}` : null)).filter(Boolean).join(" ");
    lines += `<polyline class="rk-line" data-name="${escapeHtml(company.name)}" points="${pts}" fill="none" stroke="${color}" stroke-width="2" opacity="0.85" stroke-linejoin="round"/>`;
    company.ranks.forEach((r, i) => {
      if (!r) return;
      dots += `<circle class="rk-dot" data-name="${escapeHtml(company.name)}" cx="${x(i)}" cy="${y(r)}" r="3.4" fill="${color}" opacity="0.9"><title>${escapeHtml(company.name)} · ${shortPeriod(periods[i])} · ${t("tooltipRank")} ${r} ${t("tooltipOf")}</title></circle>`;
    });
    endLabels += `<text x="${W - R + 30}" y="${y(company.ranks[N - 1]) + 4}" font-size="12.5" font-weight="600" fill="${color}">${escapeHtml(company.name)} (#${company.ranks[N - 1]})</text>`;
  }

  return `<svg id="rankChart" width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(t("chartTitle"))}">
    ${grid}${xLabels}${lines}${dots}${endLabels}
    ${svgText(escapeHtml(t("axisNote")), { x: L, y: T - 12, "font-size": 13, fill: "#746b5f" })}
  </svg>`;
}

function renderTable() {
  const { periods, companies } = historyData;
  const N = periods.length;
  const head = `<tr><th class="lt">${escapeHtml(t("companyCol"))}</th>${periods.map((p) => `<th>${shortPeriod(p)}</th>`).join("")}<th>${escapeHtml(t("sinceFirst"))}</th></tr>`;

  const rows = companies.map((company) => {
    const color = PALETTE[companies.indexOf(company) % PALETTE.length];
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

function bindInteractions() {
  const svg = document.getElementById("rankChart");
  document.querySelectorAll("#tableWrap tbody tr").forEach((tr) => {
    tr.addEventListener("mouseenter", () => {
      svg.classList.add("dim");
      svg.querySelectorAll("[data-name]").forEach((el) => el.classList.toggle("on", el.dataset.name === tr.dataset.name));
    });
    tr.addEventListener("mouseleave", () => {
      svg.classList.remove("dim");
      svg.querySelectorAll(".on").forEach((el) => el.classList.remove("on"));
    });
  });
}

function renderNav() {
  document.querySelectorAll("[data-nav='board']").forEach((el) => (el.textContent = t("navBoard")));
  document.querySelectorAll("[data-nav='history']").forEach((el) => (el.textContent = t("navHistory")));
}

function renderAll() {
  applyText();
  renderNav();
  document.getElementById("chartWrap").innerHTML = renderChart();
  document.getElementById("tableWrap").innerHTML = renderTable();
  bindInteractions();
}

async function init() {
  applyText();
  const wrap = document.getElementById("chartWrap");
  wrap.innerHTML = `<div class="empty">${escapeHtml(t("loading"))}</div>`;
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`rank-history.json 加载失败：${response.status}`);
  historyData = await response.json();
  renderAll();

  document.getElementById("langZh").addEventListener("click", () => {
    lang = "zh";
    syncLanguageInUrl();
    renderAll();
  });
  document.getElementById("langEn").addEventListener("click", () => {
    lang = "en";
    syncLanguageInUrl();
    renderAll();
  });
}

init().catch((error) => {
  document.getElementById("chartWrap").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});

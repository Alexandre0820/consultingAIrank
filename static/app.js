const DATA_URL = "../data/ai-consulting-leaderboard.json";

const els = {
  updatedAt: document.querySelector("#updatedAt"),
  companyCount: document.querySelector("#companyCount"),
  methodIntro: document.querySelector("#methodIntro"),
  scoreboardTitle: document.querySelector("#scoreboardTitle"),
  scoreboardSubtitle: document.querySelector("#scoreboardSubtitle"),
  viewAction: document.querySelector("#viewAction"),
  viewComposite: document.querySelector("#viewComposite"),
  tierFilter: document.querySelector("#tierFilter"),
  eventFilter: document.querySelector("#eventFilter"),
  searchInput: document.querySelector("#searchInput"),
  resetFilters: document.querySelector("#resetFilters"),
  legend: document.querySelector("#legend"),
  dimensionGrid: document.querySelector("#dimensionGrid"),
  scoreboard: document.querySelector("#scoreboard"),
  insightsGrid: document.querySelector("#insightsGrid"),
  newsSummary: document.querySelector("#newsSummary"),
  weeklyWindow: document.querySelector("#weeklyWindow"),
  weeklyStats: document.querySelector("#weeklyStats"),
  weeklyEvents: document.querySelector("#weeklyEvents"),
  scoreDeltaWindow: document.querySelector("#scoreDeltaWindow"),
  scoreDelta: document.querySelector("#scoreDelta"),
};

let data = null;
let eventTypes = [];
let dimensions = [];
let activeBoard = "action";
let compactMode = true;
let expandAllEvidence = false;
const ACTION_SCORE_CURVE = 70;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function weightedScore(company) {
  return dimensions.reduce((sum, dimension) => {
    const value = Number(company.scores[dimension.id] ?? 0);
    return sum + (value / 5) * dimension.weight;
  }, 0) * 100;
}

function typeLabel(typeId) {
  return eventTypes.find((item) => item.id === typeId)?.label ?? typeId;
}

function typeColor(typeId) {
  return eventTypes.find((item) => item.id === typeId)?.color ?? "#1d4ed8";
}

function dimensionName(dimensionId) {
  return dimensions.find((item) => item.id === dimensionId)?.name ?? dimensionId;
}

function eventDimensionTags(event) {
  if (Array.isArray(event.dimension_tags) && event.dimension_tags.length) {
    return event.dimension_tags;
  }

  const map = {
    partnership: ["tech_partnership", "delivery_production"],
    platform: ["proprietary_assets", "delivery_production"],
    service_line: ["strategy_signal", "delivery_production"],
    investment: ["capital_ma", "strategy_signal"],
    organization: ["delivery_production", "governance_risk"],
    governance: ["governance_risk", "client_value_proof"],
    research: ["strategy_signal", "industry_coverage"],
    client_proof: ["client_value_proof", "delivery_production"],
  };

  return map[event.type] ?? ["strategy_signal"];
}

function scoreReason(event) {
  const score = event.event_score ?? 0;
  const tags = eventDimensionTags(event).map(dimensionName).join("、");
  const source = sourceLabel(event.source_level);
  const confidence = confidenceLabel(event.confidence);

  if (event.confidence === "low") return `高潜力但待核验：事件分较高，但当前来源可信度为 ${confidence}，映射 ${tags}；需要官方或一手来源复核。`;

  if (score >= 90) return `强信号：直接改变公司 AI 能力边界，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
  if (score >= 82) return `高信号：具备明确合作、平台或交付含义，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
  if (score >= 74) return `中高信号：能补充公司 AI 能力拼图，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
  return `观察信号：作为公司 AI 动作的辅助证据，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
}

function scoreBand(score) {
  if (score == null) return "待评估";
  if (score >= 90) return "领先";
  if (score >= 82) return "强";
  if (score >= 74) return "活跃";
  return "观察";
}

function shortDate(date) {
  if (!date || date.length <= 4) return date || "未标注";
  return date.replace(/-/g, ".");
}

function eventTimestamp(date) {
  if (!date) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(`${date}T00:00:00Z`) || 0;
  if (/^\d{4}-\d{2}$/.test(date)) return Date.parse(`${date}-01T00:00:00Z`) || 0;
  if (/^\d{4}$/.test(date)) return Date.parse(`${date}-01-01T00:00:00Z`) || 0;
  return Date.parse(date) || 0;
}

function sourceLabel(level) {
  const map = {
    official: "官方",
    official_press_release: "官方新闻稿",
    vendor_official: "厂商官方",
    media: "媒体",
    third_party: "第三方",
    pending_verification: "待核验",
  };
  return map[level] || level || "未知";
}

function confidenceLabel(level) {
  const map = { high: "高", medium: "中", low: "低" };
  return map[level] || level || "未知";
}

function companyMatches(company, query) {
  if (!query) return true;
  const text = [
    company.name,
    company.cn,
    company.tier,
    company.parent,
    company.brand_note,
    company.focus,
    company.notes,
    ...company.events.map((event) => `${event.title} ${event.summary} ${typeLabel(event.type)} ${event.url}`),
  ].join(" ").toLowerCase();
  return text.includes(query.toLowerCase());
}

function getFilteredEvents() {
  const query = els.searchInput.value.trim();
  const tier = els.tierFilter.value;
  const eventType = els.eventFilter.value;

  return data.companies
    .filter((company) => tier === "all" || company.tier === tier)
    .flatMap((company) => company.events.map((event) => ({ company, event })))
    .filter(({ event }) => eventType === "all" || event.type === eventType)
    .filter(({ company, event }) => {
      if (!query) return true;
      return (
        companyMatches(company, query) ||
        event.title.toLowerCase().includes(query.toLowerCase()) ||
        event.summary.toLowerCase().includes(query.toLowerCase())
      );
    })
    .sort((a, b) => {
      const scoreDiff = Number(b.event.event_score ?? 0) - Number(a.event.event_score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const dateDiff = eventTimestamp(b.event.date) - eventTimestamp(a.event.date);
      if (dateDiff !== 0) return dateDiff;
      return a.company.name.localeCompare(b.company.name);
    });
}

function getTiers(companies) {
  return Array.from(new Set(companies.map((company) => company.tier).filter(Boolean))).sort();
}

function populateFilters() {
  for (const tier of getTiers(data.companies)) {
    const option = document.createElement("option");
    option.value = tier;
    option.textContent = tier;
    els.tierFilter.appendChild(option);
  }

  for (const type of eventTypes) {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = type.label;
    els.eventFilter.appendChild(option);
  }
}

function renderLegend() {
  els.legend.innerHTML = eventTypes
    .map((type) => `<span class="legend-chip"><i class="dot" style="color:${type.color}"></i>${escapeHtml(type.label)}</span>`)
    .join("");
}

function renderDimensions() {
  els.dimensionGrid.innerHTML = dimensions
    .map((dimension) => `
      <article class="dimension">
        <strong>${escapeHtml(dimension.name)}</strong>
        <p>${escapeHtml(dimension.description)}</p>
        <em>权重 ${Math.round(dimension.weight * 100)}%</em>
      </article>
    `)
    .join("");
}

function companyTags(company) {
  const latestEvent = [...company.events].sort((a, b) => eventTimestamp(b.date) - eventTimestamp(a.date))[0];
  const strongestDimension = dimensions
    .map((dimension) => ({ ...dimension, value: Number(company.scores[dimension.id] ?? 0) }))
    .sort((a, b) => b.value - a.value)[0];
  const thoughtScore = Number(company.scores.thought_leadership ?? 0);

  return [
    { label: "关注点", value: company.focus },
    latestEvent ? { label: "最近动作", value: `${shortDate(latestEvent.date)} · ${typeLabel(latestEvent.type)}` } : null,
    strongestDimension ? { label: "最强维度", value: `${strongestDimension.name} ${strongestDimension.value}/5` } : null,
    thoughtScore ? { label: "AI 思考力", value: `${thoughtScore}/5` } : null,
    company.brand_note ? { label: "品牌说明", value: company.brand_note } : null,
  ].filter(Boolean);
}

function evidenceMeta(company) {
  const events = Array.isArray(company.events) ? company.events : [];
  const officialCount = events.filter((event) => ["official", "official_press_release", "vendor_official"].includes(event.source_level)).length;
  const pendingCount = events.filter((event) => event.confidence === "low" || event.source_level === "media").length;
  const reportsCount = Array.isArray(company.reports) ? company.reports.length : 0;
  const coverageConfidence = company.coverage?.coverage_confidence || (officialCount >= 3 ? "high" : officialCount >= 2 ? "medium" : "low");
  return {
    officialCount,
    pendingCount,
    reportsCount,
    coverageConfidence,
  };
}

function coverageLabel(level) {
  const map = { high: "覆盖高", medium: "覆盖中", low: "覆盖低" };
  return map[level] || "覆盖未标注";
}

function traditionalCapabilityScore(company) {
  const values = company.traditional_capabilities || {};
  const weights = {
    client_trust: 0.28,
    industry_depth: 0.24,
    delivery_scale: 0.28,
    brand_strength: 0.20,
  };

  return Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + (Number(values[key] ?? 0) / 5) * weight;
  }, 0) * 100;
}

function compositeCapabilityScore(company) {
  const aiBase = weightedScore(company);
  const traditionalBase = traditionalCapabilityScore(company);
  const action = recentActionScore(company).score;
  const longTermBase = aiBase * 0.6 + traditionalBase * 0.4;
  return longTermBase * 0.6 + action * 0.4;
}

function displayActionScore(totalWeight, maxWeight, minWeight) {
  if (!Number.isFinite(totalWeight) || maxWeight <= 0) return 0;
  const maxRaw = 100 * (1 - Math.exp(-maxWeight / ACTION_SCORE_CURVE));
  const rawScore = 100 * (1 - Math.exp(-totalWeight / ACTION_SCORE_CURVE));
  const headFloor = 90;

  if (maxRaw <= headFloor || rawScore <= headFloor) {
    return Math.round(rawScore * 10) / 10;
  }

  const normalized = Math.max(0, Math.min(1, (rawScore - headFloor) / (maxRaw - headFloor)));
  return Math.round((headFloor + normalized * (100 - headFloor)) * 10) / 10;
}

function actionRankedCompanies(companies = data.companies) {
  const rawRows = companies
    .map((company) => ({
      company,
      actionRaw: recentActionScore(company),
      composite: compositeCapabilityScore(company),
      latestTimestamp: latestCompanySignal(company).latestTimestamp,
    }));
  const maxWeight = Math.max(...rawRows.map((row) => row.actionRaw.totalWeight), 0);
  const minWeight = Math.min(...rawRows.map((row) => row.actionRaw.totalWeight), maxWeight);
  return rawRows
    .map((row) => ({
      ...row,
      action: displayActionScore(row.actionRaw.totalWeight, maxWeight, minWeight),
    }))
    .sort((a, b) => b.action - a.action || b.latestTimestamp - a.latestTimestamp);
}

function compositeRankedCompanies(companies = data.companies) {
  return companies
    .map((company) => ({
      company,
      action: recentActionScore(company).score,
      composite: compositeCapabilityScore(company),
      latestTimestamp: latestCompanySignal(company).latestTimestamp,
    }))
    .sort((a, b) => b.composite - a.composite || b.action - a.action || b.latestTimestamp - a.latestTimestamp);
}

function buildInsights() {
  const rows = compositeRankedCompanies();
  const topTwo = rows.slice(0, 2).map(({ company }) => company.name).join(" 和 ");
  const topBigFour = rows.filter(({ company }) => company.tier === "Big Four").slice(0, 4);
  const mbbLeader = rows.filter(({ company }) => company.tier === "MBB")[0];
  const techLeader = rows.filter(({ company }) => company.tier === "Tech/SI")[0];
  const lowConfidenceEvents = data.companies
    .flatMap((company) => company.events.map((event) => ({ company, event })))
    .filter(({ event }) => event.confidence === "low" && Number(event.event_score ?? 0) >= 85)
    .sort((a, b) => Number(b.event.event_score ?? 0) - Number(a.event.event_score ?? 0));
  const thoughtLeaders = rows
    .filter(({ company }) => Number(company.scores.thought_leadership ?? 0) >= 5)
    .slice(0, 4)
    .map(({ company }) => company.name);

  return [
    {
      kicker: "Front Runner",
      accent: "#b42318",
      title: `${topTwo} 领跑`,
      body: `当前综合能力榜上，${topTwo} 处于第一梯队，领先原因主要来自大规模技术合作、内部 Client Zero 验证，以及把 AI 从叙事推向组织级部署。`,
    },
    {
      kicker: "Big Four",
      accent: "#1d4ed8",
      title: "Big Four 整体最强",
      body: topBigFour.length
        ? `从当前样本看，Big Four 形成最完整的集团式推进：${topBigFour.map(({ company }) => company.name).join("、")} 都在前列，说明其平台合作、行业覆盖和治理能力一起在发力。`
        : "当前样本里，Big Four 仍然是最系统推进 AI 的专业服务群体。",
    },
    {
      kicker: "MBB vs Tech/SI",
      accent: "#0f766e",
      title: `${mbbLeader?.company.name || "MBB 龙头"} 与 ${techLeader?.company.name || "Tech/SI 龙头"} 各自强势`,
      body: `${mbbLeader?.company.name || "MBB 头部公司"} 更像战略与平台双轮驱动的代表，${techLeader?.company.name || "Tech/SI 头部公司"} 则体现了更强的交付生产化能力。两类公司正在从不同路径逼近同一个结果：把 AI 做成客户工作流。`,
    },
    {
      kicker: "Watchlist",
      accent: "#ff8a00",
      title: "高分事件里仍有待核验项",
      body: lowConfidenceEvents.length
        ? `当前有 ${lowConfidenceEvents.length} 条高分事件仍是低置信度，主要集中在 ${lowConfidenceEvents.slice(0, 3).map(({ company }) => company.name).join("、")} 等公司的投资或合作新闻。这些信号值得保留，但页面上应继续视为待官方复核。`
        : "当前高分事件大多已有较强来源支撑，待核验项相对有限。",
    },
    {
      kicker: "Thought Leadership",
      accent: "#2457ff",
      title: "公开报告已经纳入评分",
      body: thoughtLeaders.length
        ? `我们已把 AI 公开报告作为“思考力”维度纳入模型。当前在这一维度最强的一组是 ${thoughtLeaders.join("、")}，它们不仅有动作，也持续在塑造企业客户对 AI 的认知框架。`
        : "我们已把 AI 公开报告作为“思考力”维度纳入模型，用来补足只看新闻动作的局限。",
    },
  ];
}

function renderReports(company) {
  if (!Array.isArray(company.reports) || !company.reports.length) return "";
  return `
    <div class="report-list">
      ${company.reports.slice(0, 2).map((report) => `
        <article class="report-item">
          <div class="report-item__meta">
            <span>${escapeHtml(shortDate(report.date))}</span>
            <span>${escapeHtml(report.publisher)}</span>
          </div>
          <strong>${escapeHtml(report.title)}</strong>
          <p>${escapeHtml(report.summary)}</p>
          <a href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">查看报告</a>
        </article>
      `).join("")}
    </div>
  `;
}

function renderEvidenceStrip(company) {
  const meta = evidenceMeta(company);
  return `
    <div class="evidence-strip">
      <span class="evidence-pill">官方证据 ${meta.officialCount}</span>
      <span class="evidence-pill">公开报告 ${meta.reportsCount}</span>
      <span class="evidence-pill">待核验 ${meta.pendingCount}</span>
      <span class="evidence-pill">${coverageLabel(meta.coverageConfidence)}</span>
    </div>
  `;
}

function renderInsights() {
  if (!els.insightsGrid) return;
  const insights = buildInsights();
  els.insightsGrid.innerHTML = insights.map((item) => `
    <article class="insight-card" style="--accent:${item.accent}">
      <span class="insight-card__kicker">${escapeHtml(item.kicker)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join("");
}

function cardAnchorId(company) {
  return `company-${company.id}`;
}

function renderRankNavigator(rows) {
  const topRows = rows.slice(0, 10);
  const scoreLabel = activeBoard === "action" ? "行动力" : "综合分";
  return `
    <section class="rank-navigator-shell" aria-label="排名快速导航">
      <div class="rank-navigator-shell__intro">
        <div>
          <p class="rank-navigator-shell__eyebrow">Quick Jump</p>
          <h3>Top 10 排名导航</h3>
        </div>
        <p>先快速扫榜，再进入单家公司证据。</p>
      </div>
      <div class="rank-navigator">
        ${topRows.map((row, index) => `
          <a class="rank-navigator__item rank-navigator__item--${index < 3 ? "featured" : "compact"}" href="#${escapeHtml(cardAnchorId(row.company))}">
            <span class="rank-navigator__rank">#${index + 1}</span>
            <strong>${escapeHtml(row.company.name)}</strong>
            <em>${escapeHtml(row.company.cn || row.company.tier || "")}</em>
            <b>${activeBoard === "action" ? row.action.toFixed(1) : row.composite.toFixed(1)} <small>${scoreLabel}</small></b>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBoardControls() {
  return `
    <div class="board-controls" aria-label="榜单浏览模式">
      <button id="compactToggle" class="board-controls__button ${compactMode ? "is-active" : ""}" type="button" aria-pressed="${compactMode}">
        ${compactMode ? "紧凑浏览" : "展开浏览"}
      </button>
      <button id="evidenceToggle" class="board-controls__button" type="button" aria-pressed="${expandAllEvidence}">
        ${expandAllEvidence ? "折叠全部证据" : "展开全部证据"}
      </button>
    </div>
  `;
}

function renderCompanyCard(company, rank) {
  const score = weightedScore(company);
  const accent = company.events[0] ? typeColor(company.events[0].type) : "#1d4ed8";
  const topDimensions = dimensions
    .map((dimension) => ({ ...dimension, value: Number(company.scores[dimension.id] ?? 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const events = company.events
    .sort((a, b) => eventTimestamp(b.date) - eventTimestamp(a.date))
    .slice(0, 3)
    .map((event) => `
      <article class="event">
        <time>${escapeHtml(shortDate(event.date))}</time>
        <div>
          <span class="badge" style="--event-color:${typeColor(event.type)}">${escapeHtml(typeLabel(event.type))}</span>
          <h4>${escapeHtml(event.title)}</h4>
          <p>${escapeHtml(event.summary)}</p>
          <a href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">查看来源</a>
        </div>
      </article>
    `)
    .join("");

  const tags = companyTags(company)
    .map((item) => `
      <li class="summary-tag">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </li>
    `)
    .join("");

  return `
    <article class="rank-card" style="--accent:${accent}">
      <div class="rank-card__top">
        <div class="rank">#${rank}</div>
        <div>
          <h3>${escapeHtml(company.name)}</h3>
          <p class="cn">${escapeHtml([company.cn, company.tier, company.parent ? `隶属 ${company.parent}` : ""].filter(Boolean).join(" · "))}</p>
        </div>
        <div class="score">
          <strong>${score.toFixed(1)}</strong>
          <span>Signal Score</span>
        </div>
      </div>

      <ul class="summary-tags">${tags}</ul>

      ${renderEvidenceStrip(company)}
      ${renderReports(company)}

      <div class="bars">
        ${topDimensions.map((dimension) => `
          <div class="bar">
            <span>${escapeHtml(dimension.name)} · ${dimension.value}/5</span>
            <i style="width:${(dimension.value / 5) * 100}%"></i>
          </div>
        `).join("")}
      </div>

      <div class="events">${events}</div>
    </article>
  `;
}

function recentActionScore(company) {
  const now = Date.parse(`${data.meta.updated_at}T00:00:00Z`) || Date.now();
  const weightedRows = scoreActionEvents(company.events, now);
  const total = weightedRows.reduce((sum, row) => sum + row.contribution, 0);
  const normalized = 100 * (1 - Math.exp(-total / ACTION_SCORE_CURVE));
  return {
    score: Math.round(normalized * 10) / 10,
    totalWeight: Math.round(total * 100) / 100,
    events: weightedRows.map((row) => ({
      ...row.event,
      contribution_score: Math.round((100 * (1 - Math.exp(-row.contribution / ACTION_SCORE_CURVE))) * 10) / 10,
    })),
  };
}

function historicalActionScore(company, asOfDate, filterFn = () => true) {
  const now = Date.parse(`${asOfDate}T00:00:00Z`) || Date.now();
  const weightedRows = scoreActionEvents(
    company.events.filter((event) => eventTimestamp(event.date) <= now && filterFn(event)),
    now,
  );
  const total = weightedRows.reduce((sum, row) => sum + row.contribution, 0);
  return Math.round((100 * (1 - Math.exp(-total / ACTION_SCORE_CURVE))) * 10) / 10;
}

function historicalRecentActionDetail(company, asOfDate) {
  const now = Date.parse(`${asOfDate}T00:00:00Z`) || Date.now();
  const weightedRows = scoreActionEvents(
    company.events.filter((event) => eventTimestamp(event.date) <= now),
    now,
  );
  const total = weightedRows.reduce((sum, row) => sum + row.contribution, 0);
  return {
    score: Math.round((100 * (1 - Math.exp(-total / ACTION_SCORE_CURVE))) * 10) / 10,
    events: weightedRows.map((row) => ({
      ...row.event,
      contribution_score: Math.round((100 * (1 - Math.exp(-row.contribution / ACTION_SCORE_CURVE))) * 10) / 10,
    })),
  };
}

function rankDecay(index) {
  return 1 / (1 + 0.45 * index);
}

function actionEventWeight(event, now) {
  const rawScore = Number(event.event_score ?? 0);
  const ageDays = Math.max(0, (now - eventTimestamp(event.date)) / (1000 * 60 * 60 * 24));
  const recencyFactor = ageDays <= 30 ? 1 : ageDays <= 90 ? 0.92 : ageDays <= 180 ? 0.82 : ageDays <= 365 ? 0.72 : 0.58;
  const confidenceFactor = event.confidence === "high" ? 1 : event.confidence === "medium" ? 0.93 : 0.82;
  const sourceFactor = event.source_level === "official" || event.source_level === "official_press_release"
    ? 1
    : event.source_level === "vendor_official"
      ? 0.96
      : event.source_level === "media"
        ? 0.9
        : 0.86;
  return rawScore * recencyFactor * confidenceFactor * sourceFactor;
}

function scoreActionEvents(events, now) {
  return events
    .map((event) => ({
      event,
      weighted: actionEventWeight(event, now),
    }))
    .filter((row) => row.weighted > 0)
    .sort((a, b) => b.weighted - a.weighted)
    .map((row, index) => ({
      ...row,
      decay: rankDecay(index),
      contribution: row.weighted * rankDecay(index),
    }));
}

function previousWeekDate() {
  const current = new Date(`${data.meta.updated_at}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - 7);
  return current.toISOString().slice(0, 10);
}

function comparisonStartDate() {
  return data.meta.previous_updated_at || previousWeekDate();
}

function comparisonRangeLabel() {
  return `${comparisonStartDate()} - ${data.meta.updated_at}`;
}

function isNetNewEvent(event) {
  const eventDate = eventTimestamp(event.date);
  return eventDate >= eventTimestamp(comparisonStartDate()) && eventDate <= eventTimestamp(data.meta.updated_at);
}

function collectWeeklyNetNewEvents() {
  return data.companies
    .flatMap((company) => company.events
      .filter((event) => isNetNewEvent(event))
      .map((event) => ({ company, event })))
    .sort((a, b) => eventTimestamp(b.event.date) - eventTimestamp(a.event.date) || (b.event.event_score ?? 0) - (a.event.event_score ?? 0));
}

function buildPreviousWeekRankMap(rows) {
  const priorDate = comparisonStartDate();
  const previousRows = rows
    .map(({ company }) => ({
      company,
      score: historicalActionScore(company, priorDate),
      latestTimestamp: latestCompanySignal(company).latestTimestamp,
    }))
    .sort((a, b) => b.score - a.score || b.latestTimestamp - a.latestTimestamp);

  return new Map(previousRows.map((row, index) => [row.company.id, index + 1]));
}

function buildEventDrivenRankMap(rows) {
  const baselineRows = rows
    .map(({ company }) => ({
      company,
      score: historicalActionScore(company, data.meta.updated_at, (event) => !isNetNewEvent(event)),
      latestTimestamp: latestCompanySignal(company).latestTimestamp,
    }))
    .sort((a, b) => b.score - a.score || b.latestTimestamp - a.latestTimestamp);

  return new Map(baselineRows.map((row, index) => [row.company.id, index + 1]));
}

function scoreDeltaMeta(delta) {
  if (delta > 0.3) return { arrow: "↑", className: "up", label: `较上期 +${delta.toFixed(1)}` };
  if (delta < -0.3) return { arrow: "↓", className: "down", label: `较上期 ${delta.toFixed(1)}` };
  return { arrow: "→", className: "flat", label: "较上期基本持平" };
}

function buildScoreDeltaRows() {
  const currentRows = actionRankedCompanies();
  const previousRankMap = buildEventDrivenRankMap(currentRows);
  const topIds = new Set(currentRows.slice(0, 15).map(({ company }) => company.id));

  return currentRows
    .map(({ company }, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankMap.get(company.id) || currentRank;
      const rankDelta = previousRank - currentRank;
      const newEvents = company.events
        .filter((event) => isNetNewEvent(event))
        .sort((a, b) => (b.event_score ?? 0) - (a.event_score ?? 0));
      return {
        company,
        currentRank,
        previousRank,
        rankDelta,
        newEvents,
        latestTimestamp: latestCompanySignal(company).latestTimestamp,
      };
    })
    .filter((row) => row.rankDelta > 0 && row.newEvents.length > 0 && topIds.has(row.company.id))
    .sort((a, b) => b.rankDelta - a.rankDelta || a.currentRank - b.currentRank)
    .slice(0, 8);
}

function renderWeeklyEvents() {
  if (!els.weeklyEvents || !els.weeklyStats) return;
  const weeklyEvents = collectWeeklyNetNewEvents();
  const affectedCompanies = new Set(weeklyEvents.map(({ company }) => company.id)).size;
  const officialCount = weeklyEvents.filter(({ event }) => ["official", "official_press_release", "vendor_official"].includes(event.source_level)).length;
  const mediaCount = weeklyEvents.length - officialCount;

  if (els.weeklyWindow) {
    els.weeklyWindow.textContent = `比较窗口：${comparisonRangeLabel()}。统计上一版快照日期至本次更新日期之间、且本次新纳入库的公开 AI 信号。`;
  }

  if (!weeklyEvents.length) {
    els.weeklyStats.innerHTML = `
      <article class="weekly-stat weekly-stat--empty">
        <span>本次刷新说明</span>
        <strong>暂无净新增事件</strong>
        <p>本次窗口内没有新纳入的周内事件；如果排名仍有变化，就说明比较口径需要继续校验。</p>
      </article>
    `;
    els.weeklyEvents.innerHTML = `<div class="empty">本次刷新没有识别到净新增事件。</div>`;
    return;
  }

  els.weeklyStats.innerHTML = `
    <article class="weekly-stat">
      <span>净新增事件</span>
      <strong>${weeklyEvents.length}</strong>
    </article>
    <article class="weekly-stat">
      <span>涉及公司</span>
      <strong>${affectedCompanies}</strong>
    </article>
    <article class="weekly-stat">
      <span>高可信来源</span>
      <strong>${officialCount}</strong>
    </article>
    <article class="weekly-stat">
      <span>媒体来源</span>
      <strong>${mediaCount}</strong>
    </article>
  `;

  els.weeklyEvents.innerHTML = weeklyEvents
    .map(({ company, event }) => `
      <article class="news-card news-card--weekly">
        <time>${escapeHtml(shortDate(event.date))}</time>
        <span class="badge" style="--event-color:${typeColor(event.type)}">${escapeHtml(typeLabel(event.type))}</span>
        <strong>${escapeHtml(company.name)}</strong>
        <p>${escapeHtml(event.title)}</p>
        <div class="dimension-chips">
          <span class="dimension-chip">${escapeHtml(sourceLabel(event.source_level))}</span>
          ${eventDimensionTags(event).slice(0, 2).map((tag) => `<span class="dimension-chip">${escapeHtml(dimensionName(tag))}</span>`).join("")}
        </div>
        <a href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">查看来源</a>
      </article>
    `)
    .join("");
}

function deltaThemeLabel(rows) {
  const openaiCount = rows.filter((r) => r.newEvents.some((e) => /openai|frontier/i.test(e.title))).length;
  const clientCount = rows.filter((r) => r.newEvents.some((e) => e.type === "client_proof")).length;
  const platformCount = rows.filter((r) => r.newEvents.some((e) => e.type === "platform")).length;

  if (openaiCount >= 2) return "OpenAI 生态合作带动多家排名上升";
  if (clientCount >= 2) return "客户案例落地推动行动力上修";
  if (platformCount >= 2) return "自研平台发布拉高技术资产分";
  return null;
}

function deltaPerspective(rows) {
  const paragraphs = [];
  const allNewEvents = rows.flatMap((r) => r.newEvents.map((e) => ({ company: r.company, event: e })));
  const topRisers = rows.slice(0, 3).map((r) => r.company.cn);

  // Paragraph 1: Structural observation
  if (allNewEvents.length >= 3) {
    paragraphs.push(`本周 ${rows.length} 家公司排名上升，${topRisers.join("、")} 位次变化最为显著。新增事件覆盖 ${[...new Set(allNewEvents.map((e) => typeLabel(e.event.type)))].join("、")} 等方向，<b>AI 咨询竞争已从单一合作签约扩展至多维能力比拼</b>。`);
  } else if (allNewEvents.length >= 1) {
    paragraphs.push(`本周 ${rows.length} 家公司排名上升，但新增事件仅 ${allNewEvents.length} 条，排名变化主要源于评分模型中新鲜度因子的自然衰减。<b>头部格局正在固化，动作频率本身正在成为竞争壁垒</b>——持续有新事件的公司与停滞的公司之间的分差在拉大。`);
  } else {
    paragraphs.push(`本周 ${rows.length} 家公司排名上升，无实质性新增事件，排名变化主要源于旧事件权重的自然衰减。这表明当前头部梯队处于动态均衡状态，<b>任何一条新的高信号事件都可能引发排位变动</b>。`);
  }

  // Paragraph 2: Client proof analysis
  const clientEvents = allNewEvents.filter((e) => e.event.type === "client_proof");
  if (clientEvents.length >= 1) {
    const names = [...new Set(clientEvents.map((e) => e.company.cn))].join("、");
    paragraphs.push(`${names} 本周展示了客户交付案例。<b>客户证明是行动力评分中权重最高的信号类型之一</b>——它标志着 AI 能力已从内部试验阶段进入客户生产环境。从行业演进角度看，咨询公司的 AI 竞争正在从"能力声明"阶段向"价值验证"阶段过渡，能拿出可量化客户成果的公司将在下一竞争周期中占据结构性优势。`);
  }

  // Paragraph 3: OpenAI ecosystem
  const openaiEvents = allNewEvents.filter((e) => /openai|frontier/i.test(e.event.title));
  if (openaiEvents.length >= 2) {
    const names = [...new Set(openaiEvents.map((e) => e.company.cn))].join("、");
    paragraphs.push(`OpenAI Partner Network 首发名单的公布正在重塑咨询行业的 AI 生态格局。${names} 等入选公司获得了模型厂商层面的战略背书，<b>生态合作正在成为继自研平台之后的第二条竞争主轴</b>。对于未进入该生态的公司而言，市场定位压力将持续上升。`);
  }

  // Paragraph 4: Forward-looking
  if (rows.length >= 3) {
    paragraphs.push(`从趋势判断，AI 咨询行业正在经历从"声量竞争"到"交付竞争"的范式转换。<b>持续产出客户案例、平台产品和生态合作的公司正在建立可累积的竞争优势</b>，而依赖单次合作公告或研究报告维持声量的公司面临排名侵蚀风险。未来 6-12 个月，这一分化预计将进一步加速。`);
  } else if (rows.length >= 2) {
    paragraphs.push(`当前头部梯队的分差已进入极窄区间，排位对新增事件高度敏感。<b>对于中间梯队而言，这是一个战略窗口期</b>——在下一个评估周期内拿出高信号事件（尤其是客户证明或平台发布），有望实现排名跃升。`);
  }

  return paragraphs.join("\n\n");
}

function renderScoreDelta() {
  if (!els.scoreDelta) return;
  const rows = buildScoreDeltaRows();
  if (els.scoreDeltaWindow) {
    els.scoreDeltaWindow.textContent = `比较窗口：${comparisonRangeLabel()}。展示相对上一版快照排名上升的公司、对应净新增事件与我们的判断。`;
  }
  if (!rows.length) {
    els.scoreDelta.innerHTML = `<div class="empty">本次刷新暂无明显排名上升。</div>`;
    return;
  }

  const themeLabel = deltaThemeLabel(rows);
  const perspective = deltaPerspective(rows);

  const companyCards = rows.map((row) => {
    return `
      <article class="delta-card">
        <div class="delta-card__top">
          <div>
            <strong>${escapeHtml(row.company.name)}</strong>
            <p>${escapeHtml(row.company.cn)} · ${escapeHtml(row.company.tier)}</p>
          </div>
          <div class="delta-badge delta-badge--up">
            <span>↑ ${row.rankDelta}</span>
            <em>第 ${row.currentRank} 名</em>
          </div>
        </div>
      </article>
    `;
  }).join("");

  els.scoreDelta.innerHTML = `
    ${themeLabel ? `<div class="delta-theme"><strong>${escapeHtml(themeLabel)}</strong></div>` : ""}
    <div class="delta-grid">${companyCards}</div>
    <div class="delta-perspective">
      <h3>我们的观察</h3>
      <p>${escapeHtml(perspective).replaceAll("&lt;b&gt;", "<b>").replaceAll("&lt;/b&gt;", "</b>").split("\n\n").join("</p><p>")}</p>
    </div>
  `;
}

function movementMeta(currentRank, previousRank) {
  if (!previousRank) return { arrow: "☆", label: "新进入榜单", className: "flat" };
  const diff = previousRank - currentRank;
  if (diff > 0) return { arrow: "↑", label: `较上期上升 ${diff} 位`, className: "up" };
  if (diff < 0) return { arrow: "↓", label: `较上期下降 ${Math.abs(diff)} 位`, className: "down" };
  return { arrow: "→", label: "较上期持平", className: "flat" };
}

function renderActionCard(row, rank, previousRankMap) {
  const { company } = row;
  const action = recentActionScore(company);
  const score = row.action;
  const movement = movementMeta(rank, previousRankMap.get(company.id));
  const latestEvent = [...company.events].sort((a, b) => eventTimestamp(b.date) - eventTimestamp(a.date))[0];
  const accent = latestEvent ? typeColor(latestEvent.type) : "#1d4ed8";
  const tags = Array.from(new Set(action.events.flatMap((event) => eventDimensionTags(event)))).slice(0, 4);
  const evidence = action.events
    .map((event) => `
      <article class="event">
        <time>${escapeHtml(shortDate(event.date))}</time>
        <div>
          <span class="badge" style="--event-color:${typeColor(event.type)}">${escapeHtml(typeLabel(event.type))}</span>
          <span class="event-contribution">贡献 ${event.contribution_score.toFixed(1)} 分</span>
          <h4>${escapeHtml(event.title)}</h4>
          <p>${escapeHtml(event.summary)}</p>
          <a href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">查看来源</a>
        </div>
      </article>
    `)
    .join("");
  const detailsOpen = expandAllEvidence || !compactMode;

  return `
    <article id="${escapeHtml(cardAnchorId(company))}" class="scored-action ${compactMode ? "scored-action--compact" : ""}" style="--accent:${accent}">
      <div class="scored-action__rank">
        <div class="rank">#${rank}</div>
        <div class="score-large">${score.toFixed(1)}</div>
        <div class="rank-move rank-move--${movement.className}">
          <strong>${movement.arrow}</strong>
          <span>${escapeHtml(movement.label)}</span>
        </div>
      </div>

      <div class="scored-action__body">
        <div class="action-card__meta action-card__meta--top">
          <span class="score-pill">${escapeHtml(company.name)} · ${escapeHtml(company.cn)}</span>
          <span class="score-pill">${escapeHtml(company.tier)}</span>
          ${latestEvent ? `<span class="score-pill">最新动作：${escapeHtml(shortDate(latestEvent.date))} · ${escapeHtml(typeLabel(latestEvent.type))}</span>` : ""}
          <span class="score-pill">行动力评级 ${escapeHtml(scoreBand(score))}</span>
        </div>

        <h3>${escapeHtml(company.name)} 的近期 AI 行动力</h3>
        <p>${escapeHtml(company.focus)}${company.brand_note ? ` · ${escapeHtml(company.brand_note)}` : ""}</p>

        ${renderEvidenceStrip(company)}

        <div class="impact-line">
          <span>影响维度</span>
          <div class="dimension-chips">
            ${tags.map((tag) => `<span class="dimension-chip">${escapeHtml(dimensionName(tag))}</span>`).join("")}
          </div>
        </div>

        <details class="card-details" ${detailsOpen ? "open" : ""}>
          <summary class="card-details__summary">
            <span>查看新闻证据与事件贡献</span>
            <strong>${action.events.length} 条核心事件</strong>
          </summary>
          <div class="events">${evidence}</div>
        </details>
      </div>
    </article>
  `;
}

function latestCompanySignal(company) {
  const latestEvent = [...company.events].sort((a, b) => eventTimestamp(b.date) - eventTimestamp(a.date))[0];
  return {
    company,
    score: weightedScore(company),
    latestEvent,
    latestTimestamp: latestEvent ? eventTimestamp(latestEvent.date) : 0,
  };
}

function renderCompositeCard(company, rank) {
  const score = compositeCapabilityScore(company);
  const action = recentActionScore(company).score;
  const aiBase = weightedScore(company);
  const traditionalBase = traditionalCapabilityScore(company);
  const latestEvent = [...company.events].sort((a, b) => eventTimestamp(b.date) - eventTimestamp(a.date))[0];
  const accent = latestEvent ? typeColor(latestEvent.type) : "#1d4ed8";
  const detailsOpen = expandAllEvidence || !compactMode;

  return `
    <article id="${escapeHtml(cardAnchorId(company))}" class="rank-card ${compactMode ? "rank-card--compact" : ""}" style="--accent:${accent}">
      <div class="rank-card__top">
        <div class="rank">#${rank}</div>
        <div>
          <h3>${escapeHtml(company.name)}</h3>
          <p class="cn">${escapeHtml([company.cn, company.tier, latestEvent ? `${shortDate(latestEvent.date)} · ${typeLabel(latestEvent.type)}` : ""].filter(Boolean).join(" · "))}</p>
        </div>
        <div class="score">
          <strong>${score.toFixed(1)}</strong>
          <span>Composite Score</span>
        </div>
      </div>

      <ul class="summary-tags">
        <li class="summary-tag">
          <span>AI 行动力</span>
          <strong>${action.toFixed(1)}</strong>
        </li>
        <li class="summary-tag">
          <span>AI 长期底座</span>
          <strong>${aiBase.toFixed(1)}</strong>
        </li>
        <li class="summary-tag">
          <span>传统咨询能力</span>
          <strong>${traditionalBase.toFixed(1)}</strong>
        </li>
        <li class="summary-tag">
          <span>AI 思考力</span>
          <strong>${Number(company.scores.thought_leadership ?? 0)}/5</strong>
        </li>
        <li class="summary-tag">
          <span>综合方法</span>
          <strong>40% 行动力 + 36% AI 底座 + 24% 传统能力</strong>
        </li>
      </ul>

      <details class="card-details" ${detailsOpen ? "open" : ""}>
        <summary class="card-details__summary">
          <span>查看证据厚度与公开报告</span>
          <strong>${company.reports?.length || 0} 份报告</strong>
        </summary>
        ${renderEvidenceStrip(company)}
        ${renderReports(company)}
      </details>
    </article>
  `;
}

function renderScoreboard() {
  const query = els.searchInput.value.trim();
  const tier = els.tierFilter.value;
  const eventType = els.eventFilter.value;
  const companies = data.companies
    .filter((company) => tier === "all" || company.tier === tier)
    .filter((company) => {
      if (eventType === "all") return true;
      return company.events.some((event) => event.type === eventType);
    })
    .filter((company) => companyMatches(company, query));
  const rows = activeBoard === "action"
    ? actionRankedCompanies(companies)
    : compositeRankedCompanies(companies);
  const previousRankMap = activeBoard === "action"
    ? buildEventDrivenRankMap(rows)
    : buildPreviousWeekRankMap(rows);

  if (!rows.length) {
    els.scoreboard.innerHTML = `<div class="panel-title"><div><h2>${activeBoard === "action" ? "AI 行动力评分榜" : "综合能力评分榜"}</h2><p>${activeBoard === "action" ? "根据最近新闻动作对公司的 AI 行动力进行评估，新闻本身不单独展示分数。" : "结合 AI 动作与公司长期能力底座的综合评分。"}</p></div></div><div class="view-switch" role="tablist" aria-label="榜单切换"><button class="view-switch__button ${activeBoard === "action" ? "is-active" : ""}" type="button">AI 行动力评分榜</button><button class="view-switch__button ${activeBoard === "composite" ? "is-active" : ""}" type="button">综合能力评分榜</button></div><div class="empty">没有匹配的公司。试试重置筛选，或搜索“OpenAI / Microsoft / agentic / IQ.AI”。</div>`;
    return;
  }

  els.scoreboardTitle.textContent = activeBoard === "action" ? "AI 行动力评分榜" : "综合能力评分榜";
  els.scoreboardSubtitle.textContent = activeBoard === "action"
    ? "根据最近新闻动作对公司的 AI 行动力进行评估，新闻本身不单独展示分数。"
    : "结合 AI 动作与公司长期能力底座的综合评分。";
  els.viewAction.classList.toggle("is-active", activeBoard === "action");
  els.viewComposite.classList.toggle("is-active", activeBoard === "composite");
  els.viewAction.setAttribute("aria-pressed", String(activeBoard === "action"));
  els.viewComposite.setAttribute("aria-pressed", String(activeBoard === "composite"));

  els.scoreboard.innerHTML = `
    <div class="panel-title">
      <div>
        <h2>${escapeHtml(els.scoreboardTitle.textContent)}</h2>
        <p>${escapeHtml(els.scoreboardSubtitle.textContent)}</p>
      </div>
    </div>
    <div class="view-switch" role="tablist" aria-label="榜单切换">
      <button id="viewActionInline" class="view-switch__button ${activeBoard === "action" ? "is-active" : ""}" type="button" aria-pressed="${activeBoard === "action"}">AI 行动力评分榜</button>
      <button id="viewCompositeInline" class="view-switch__button ${activeBoard === "composite" ? "is-active" : ""}" type="button" aria-pressed="${activeBoard === "composite"}">综合能力评分榜</button>
    </div>
    ${renderBoardControls()}
    ${renderRankNavigator(rows)}
  ` + rows
    .map((row, index) => activeBoard === "action"
      ? renderActionCard(row, index + 1, previousRankMap)
      : renderCompositeCard(row.company, index + 1))
    .join("");

  document.querySelector("#viewActionInline")?.addEventListener("click", () => {
    activeBoard = "action";
    renderScoreboard();
  });
  document.querySelector("#viewCompositeInline")?.addEventListener("click", () => {
    activeBoard = "composite";
    renderScoreboard();
  });
  document.querySelector("#compactToggle")?.addEventListener("click", () => {
    compactMode = !compactMode;
    if (!compactMode) expandAllEvidence = true;
    renderScoreboard();
  });
  document.querySelector("#evidenceToggle")?.addEventListener("click", () => {
    expandAllEvidence = !expandAllEvidence;
    renderScoreboard();
  });
}

function renderNewsSummary() {
  const events = getFilteredEvents().slice(0, 8);
  if (!events.length) {
    els.newsSummary.innerHTML = `<div class="empty">暂无匹配新闻总结。</div>`;
    return;
  }

  els.newsSummary.innerHTML = events
    .map(({ company, event }) => {
      const score = event.event_score ?? null;
      return `
        <article class="news-card">
          <time>${escapeHtml(shortDate(event.date))}</time>
          <span class="badge" style="--event-color:${typeColor(event.type)}">${escapeHtml(typeLabel(event.type))}</span>
          <strong>${escapeHtml(company.name)}</strong>
          <p>${escapeHtml(event.title)}</p>
          <div class="dimension-chips">
            ${eventDimensionTags(event).slice(0, 3).map((tag) => `<span class="dimension-chip">${escapeHtml(dimensionName(tag))}</span>`).join("")}
          </div>
          <a href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">来源</a>
        </article>
      `;
    })
    .join("");
}

function renderAll() {
  renderScoreboard();
  renderInsights();
  renderNewsSummary();
  renderWeeklyEvents();
  renderScoreDelta();
}

function resetFilters() {
  els.tierFilter.value = "all";
  els.eventFilter.value = "all";
  els.searchInput.value = "";
  activeBoard = "action";
  renderAll();
}

async function init() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`数据加载失败：${response.status}`);
  data = await response.json();

  eventTypes = data.event_types;
  dimensions = data.dimensions;

  els.updatedAt.textContent = `数据更新：${data.meta.updated_at}（对比 ${comparisonStartDate()}）`;
  els.companyCount.textContent = String(data.companies.length);
  if (els.methodIntro) {
    els.methodIntro.textContent = `我们不对单条新闻做公开排名，而是把新闻、公开报告与长期能力一起映射到公司的两套评分，并公开展示证据厚度、待核验状态与覆盖置信度。当前方法参照 ${data.meta.scoring_model_file || "SCORING_MODEL.md"}。`;
  }

  populateFilters();
  renderLegend();
  renderDimensions();
  renderAll();

  els.tierFilter.addEventListener("change", renderAll);
  els.eventFilter.addEventListener("change", renderAll);
  els.searchInput.addEventListener("input", renderAll);
  els.resetFilters.addEventListener("click", resetFilters);
  els.viewAction?.addEventListener("click", () => {
    activeBoard = "action";
    renderScoreboard();
  });
  els.viewComposite?.addEventListener("click", () => {
    activeBoard = "composite";
    renderScoreboard();
  });
}

init().catch((error) => {
  els.scoreboard.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});

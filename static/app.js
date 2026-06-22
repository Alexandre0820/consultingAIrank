const DATA_URL = "/data/ai-consulting-leaderboard.json";

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
  scoreDelta: document.querySelector("#scoreDelta"),
};

let data = null;
let eventTypes = [];
let dimensions = [];
let activeBoard = "action";

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

function rankedCompanies() {
  return data.companies
    .map((company) => ({
      company,
      action: recentActionScore(company).score,
      composite: compositeCapabilityScore(company),
      topEvent: [...company.events].sort((a, b) => Number(b.event_score ?? 0) - Number(a.event_score ?? 0))[0] || null,
    }))
    .sort((a, b) => b.composite - a.composite || b.action - a.action);
}

function buildInsights() {
  const rows = rankedCompanies();
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
  const rows = company.events.map((event) => {
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
    return {
      event,
      weighted: rawScore * recencyFactor * confidenceFactor * sourceFactor,
    };
  }).sort((a, b) => b.weighted - a.weighted);

  const topRows = rows.slice(0, 3);
  const weightedRows = topRows.map((row, index) => ({
    ...row,
    contribution: row.weighted * (index === 0 ? 1 : index === 1 ? 0.7 : 0.5),
  }));
  const total = weightedRows.reduce((sum, row) => sum + row.contribution, 0);
  const normalized = Math.min(100, total / 2.2);
  return {
    score: Math.round(normalized * 10) / 10,
    events: weightedRows.map((row) => ({
      ...row.event,
      contribution_score: Math.round((row.contribution / 2.2) * 10) / 10,
    })),
  };
}

function historicalActionScore(company, asOfDate) {
  const now = Date.parse(`${asOfDate}T00:00:00Z`) || Date.now();
  const rows = company.events
    .filter((event) => eventTimestamp(event.date) <= now)
    .map((event) => {
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
      return {
        event,
        weighted: rawScore * recencyFactor * confidenceFactor * sourceFactor,
      };
    })
    .sort((a, b) => b.weighted - a.weighted);

  const topRows = rows.slice(0, 3);
  const weightedRows = topRows.map((row, index) => ({
    ...row,
    contribution: row.weighted * (index === 0 ? 1 : index === 1 ? 0.7 : 0.5),
  }));
  const total = weightedRows.reduce((sum, row) => sum + row.contribution, 0);
  return Math.round(Math.min(100, total / 2.2) * 10) / 10;
}

function historicalRecentActionDetail(company, asOfDate) {
  const now = Date.parse(`${asOfDate}T00:00:00Z`) || Date.now();
  const rows = company.events
    .filter((event) => eventTimestamp(event.date) <= now)
    .map((event) => {
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
      return {
        event,
        weighted: rawScore * recencyFactor * confidenceFactor * sourceFactor,
      };
    })
    .sort((a, b) => b.weighted - a.weighted);

  const topRows = rows.slice(0, 3);
  const weightedRows = topRows.map((row, index) => ({
    ...row,
    contribution: row.weighted * (index === 0 ? 1 : index === 1 ? 0.7 : 0.5),
  }));
  const total = weightedRows.reduce((sum, row) => sum + row.contribution, 0);
  return {
    score: Math.round(Math.min(100, total / 2.2) * 10) / 10,
    events: weightedRows.map((row) => ({
      ...row.event,
      contribution_score: Math.round((row.contribution / 2.2) * 10) / 10,
    })),
  };
}

function previousWeekDate() {
  const current = new Date(`${data.meta.updated_at}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - 7);
  return current.toISOString().slice(0, 10);
}

function buildPreviousWeekRankMap(rows) {
  const priorDate = previousWeekDate();
  const previousRows = rows
    .map(({ company }) => ({
      company,
      score: historicalActionScore(company, priorDate),
      latestTimestamp: latestCompanySignal(company).latestTimestamp,
    }))
    .sort((a, b) => b.score - a.score || b.latestTimestamp - a.latestTimestamp);

  return new Map(previousRows.map((row, index) => [row.company.id, index + 1]));
}

function scoreDeltaMeta(delta) {
  if (delta > 0.3) return { arrow: "↑", className: "up", label: `较上周 +${delta.toFixed(1)}` };
  if (delta < -0.3) return { arrow: "↓", className: "down", label: `较上周 ${delta.toFixed(1)}` };
  return { arrow: "→", className: "flat", label: "较上周基本持平" };
}

function buildScoreDeltaRows() {
  const priorDate = previousWeekDate();
  const topCompositeIds = new Set(rankedCompanies().slice(0, 12).map(({ company }) => company.id));
  return data.companies
    .map((company) => {
      const current = recentActionScore(company);
      const previous = historicalRecentActionDetail(company, priorDate);
      const previousTitles = new Set(previous.events.map((event) => event.title));
      const newDrivers = current.events
        .filter((event) => !previousTitles.has(event.title) && eventTimestamp(event.date) > eventTimestamp(priorDate))
        .slice(0, 2);
      return {
        company,
        currentScore: current.score,
        previousScore: previous.score,
        delta: Math.round((current.score - previous.score) * 10) / 10,
        drivers: newDrivers,
        latestTimestamp: latestCompanySignal(company).latestTimestamp,
      };
    })
    .filter((row) => row.delta > 0.5 && row.drivers.length && topCompositeIds.has(row.company.id))
    .sort((a, b) => b.delta - a.delta || b.latestTimestamp - a.latestTimestamp)
    .slice(0, 6);
}

function renderScoreDelta() {
  if (!els.scoreDelta) return;
  const rows = buildScoreDeltaRows();
  if (!rows.length) {
    els.scoreDelta.innerHTML = `<div class="empty">本周暂无足够明显的分数变化。</div>`;
    return;
  }

  els.scoreDelta.innerHTML = rows.map(({ company, currentScore, previousScore, delta, drivers }) => {
    const meta = scoreDeltaMeta(delta);
    return `
      <article class="delta-card">
        <div class="delta-card__top">
          <div>
            <strong>${escapeHtml(company.name)}</strong>
            <p>${escapeHtml(company.cn)} · ${escapeHtml(company.tier)}</p>
          </div>
          <div class="delta-badge delta-badge--${meta.className}">
            <span>${meta.arrow}</span>
            <em>${escapeHtml(meta.label)}</em>
          </div>
        </div>
        <div class="delta-stats">
          <div class="delta-stat">
            <span>本周</span>
            <strong>${currentScore.toFixed(1)}</strong>
          </div>
          <div class="delta-stat">
            <span>上周</span>
            <strong>${previousScore.toFixed(1)}</strong>
          </div>
          <div class="delta-stat">
            <span>变化</span>
            <strong>${delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}</strong>
          </div>
        </div>
        <div class="delta-reasons">
          ${drivers.length
            ? drivers.map((event) => `
              <article class="delta-reason">
                <time>${escapeHtml(shortDate(event.date))}</time>
                <div>
                  <span class="badge" style="--event-color:${typeColor(event.type)}">${escapeHtml(typeLabel(event.type))}</span>
                  <span class="event-contribution">新增贡献 ${event.contribution_score.toFixed(1)} 分</span>
                  <h4>${escapeHtml(event.title)}</h4>
                  <p>${escapeHtml(scoreReason(event))}</p>
                </div>
              </article>
            `).join("")
            : `<div class="delta-note">本周变化更多来自既有高分事件的新鲜度变化或排序权重调整，而不是新增事件。</div>`}
        </div>
      </article>
    `;
  }).join("");
}

function movementMeta(currentRank, previousRank) {
  if (!previousRank) return { arrow: "☆", label: "新进入榜单", className: "flat" };
  const diff = previousRank - currentRank;
  if (diff > 0) return { arrow: "↑", label: `较上周上升 ${diff} 位`, className: "up" };
  if (diff < 0) return { arrow: "↓", label: `较上周下降 ${Math.abs(diff)} 位`, className: "down" };
  return { arrow: "→", label: "较上周持平", className: "flat" };
}

function renderActionCard(company, rank, previousRankMap) {
  const action = recentActionScore(company);
  const score = action.score;
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

  return `
    <article class="scored-action" style="--accent:${accent}">
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

        <div class="events">${evidence}</div>
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

  return `
    <article class="rank-card" style="--accent:${accent}">
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

      ${renderEvidenceStrip(company)}
      ${renderReports(company)}
    </article>
  `;
}

function renderScoreboard() {
  const query = els.searchInput.value.trim();
  const tier = els.tierFilter.value;
  const eventType = els.eventFilter.value;
  const rows = data.companies
    .filter((company) => tier === "all" || company.tier === tier)
    .filter((company) => {
      if (eventType === "all") return true;
      return company.events.some((event) => event.type === eventType);
    })
    .filter((company) => companyMatches(company, query))
    .map((company) => ({ company, action: recentActionScore(company), latestTimestamp: latestCompanySignal(company).latestTimestamp }))
    .sort((a, b) => b.action.score - a.action.score || b.latestTimestamp - a.latestTimestamp);
  const previousRankMap = buildPreviousWeekRankMap(rows);

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
  ` + rows
    .map(({ company }, index) => activeBoard === "action"
      ? renderActionCard(company, index + 1, previousRankMap)
      : renderCompositeCard(company, index + 1))
    .join("");

  document.querySelector("#viewActionInline")?.addEventListener("click", () => {
    activeBoard = "action";
    renderScoreboard();
  });
  document.querySelector("#viewCompositeInline")?.addEventListener("click", () => {
    activeBoard = "composite";
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

  els.updatedAt.textContent = `数据更新：${data.meta.updated_at}`;
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

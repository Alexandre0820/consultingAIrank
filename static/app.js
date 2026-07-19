const DATA_URL = "../data/ai-consulting-leaderboard.json";

const els = {
  updatedAt: document.querySelector("#updatedAt"),
  companyCount: document.querySelector("#companyCount"),
  companyCountLabel: document.querySelector("#companyCountLabel"),
  heroTitle: document.querySelector("#heroTitle"),
  heroSubtitle: document.querySelector("#heroSubtitle"),
  filtersTitle: document.querySelector("#filtersTitle"),
  filtersSubtitle: document.querySelector("#filtersSubtitle"),
  insightsTitle: document.querySelector("#insightsTitle"),
  insightsSubtitle: document.querySelector("#insightsSubtitle"),
  coverageTitle: document.querySelector("#coverageTitle"),
  coverageSubtitle: document.querySelector("#coverageSubtitle"),
  wechatEyebrow: document.querySelector("#wechatEyebrow"),
  wechatTitle: document.querySelector("#wechatTitle"),
  wechatBody: document.querySelector("#wechatBody"),
  coverageCard1Title: document.querySelector("#coverageCard1Title"),
  coverageCard1Body: document.querySelector("#coverageCard1Body"),
  coverageCard2Title: document.querySelector("#coverageCard2Title"),
  coverageCard2Body: document.querySelector("#coverageCard2Body"),
  coverageCard3Title: document.querySelector("#coverageCard3Title"),
  coverageCard3Body: document.querySelector("#coverageCard3Body"),
  newsSummaryTitle: document.querySelector("#newsSummaryTitle"),
  newsSummarySubtitle: document.querySelector("#newsSummarySubtitle"),
  weeklyTitle: document.querySelector("#weeklyTitle"),
  deltaTitle: document.querySelector("#deltaTitle"),
  methodTitle: document.querySelector("#methodTitle"),
  methodCard1Title: document.querySelector("#methodCard1Title"),
  methodCard1Body: document.querySelector("#methodCard1Body"),
  methodCard2Title: document.querySelector("#methodCard2Title"),
  methodCard2Body: document.querySelector("#methodCard2Body"),
  methodCard3Title: document.querySelector("#methodCard3Title"),
  methodCard3Body: document.querySelector("#methodCard3Body"),
  dimensionsTitle: document.querySelector("#dimensionsTitle"),
  dimensionsSubtitle: document.querySelector("#dimensionsSubtitle"),
  tierLabel: document.querySelector("#tierLabel"),
  eventLabel: document.querySelector("#eventLabel"),
  searchLabel: document.querySelector("#searchLabel"),
  methodIntro: document.querySelector("#methodIntro"),
  scoreboardTitle: document.querySelector("#scoreboardTitle"),
  scoreboardSubtitle: document.querySelector("#scoreboardSubtitle"),
  viewAction: document.querySelector("#viewAction"),
  viewComposite: document.querySelector("#viewComposite"),
  langZh: document.querySelector("#langZh"),
  langEn: document.querySelector("#langEn"),
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
let activeLanguage = "zh";
const ACTION_SCORE_CURVE = 70;

function currentUrlLanguage() {
  const lang = new URLSearchParams(window.location.search).get("lang");
  return lang === "en" ? "en" : "zh";
}

function syncLanguageInUrl() {
  const url = new URL(window.location.href);
  if (activeLanguage === "en") {
    url.searchParams.set("lang", "en");
  } else {
    url.searchParams.delete("lang");
  }
  window.history.replaceState({}, "", url.toString());
}

const I18N = {
  zh: {
    heroTitle: "AI咨询行动榜",
    heroSubtitle: "不先看“谁名气最大”，而看谁正在把 AI 变成真实动作：合作、平台、服务线、并购、组织、客户价值与治理。",
    companyCountLabel: "家传统咨询 / 专业服务公司",
    filtersTitle: "筛选",
    filtersSubtitle: "左侧控制筛选；中间在两个榜单之间切换查看。",
    insightsTitle: "核心观察",
    insightsSubtitle: "基于当前数据的关键发现，帮助快速理解 AI 咨询竞争格局。",
    coverageTitle: "Coverage",
    coverageSubtitle: "说明榜单如何尽量接近全面，并把证据偏差公开出来。",
    wechatEyebrow: "Praxis Advisory",
    wechatTitle: "关注我们的微信公众号",
    wechatBody: "扫描二维码，获取 AI 咨询行动榜更新、欧洲企业看中国 AI 的研究观察，以及 Praxis Advisory 的最新内容。",
    coverageCard1Title: "统一检索模板",
    coverageCard1Body: "所有上榜公司使用同一套检索逻辑，覆盖官网、新闻稿、研究页、合作方发布和主流媒体，减少“想到谁就搜谁”的偏差。",
    coverageCard2Title: "来源分层降权",
    coverageCard2Body: "官方、厂商官方、媒体和待核验来源不会被同等看待。来源越弱、核验越少，进入评分时权重越低。",
    coverageCard3Title: "证据厚度公开",
    coverageCard3Body: "榜单卡片会显示官方证据数、待核验证据数和覆盖置信度，帮助判断排名背后的证据是不是足够厚。",
    newsSummaryTitle: "新闻横向总结",
    newsSummarySubtitle: "把最近值得关注的新闻事件横向铺开，突出它影响的维度与来源。",
    weeklyTitle: "本周净新增事件",
    deltaTitle: "本周变化归因",
    methodTitle: "Method",
    methodCard1Title: "新闻证据层",
    methodCard1Body: "每条新闻记录日期、主体、事件类型、来源可信度与影响维度，用于说明公司最近做了什么，而不是直接给新闻本身打榜。",
    methodCard2Title: "AI 行动力评分",
    methodCard2Body: "重点看最近新闻动作，结合新鲜度、来源质量、动作强度与影响维度，评估一家公司近期把 AI 推进到真实工作流与组织动作中的力度。",
    methodCard3Title: "综合能力评分",
    methodCard3Body: "在 AI 行动力基础上，再叠加公司长期 AI 能力底座、公开研究思考力与传统咨询能力，避免只看短期新闻声量而忽略交付、行业与组织基本盘。",
    dimensionsTitle: "评分维度",
    dimensionsSubtitle: "当前 MVP 采用 9 个维度，分数为 0–5 的人工 provisional score。",
    reset: "重置",
    tierLabel: "公司类型",
    eventLabel: "事件类型",
    searchLabel: "搜索",
    searchPlaceholder: "公司、AI 动作、合作方",
    all: "全部",
    actionBoard: "AI 行动力评分榜",
    compositeBoard: "综合能力评分榜",
    actionSubtitle: "根据最近新闻动作对公司的 AI 行动力进行评估，新闻本身不单独展示分数。",
    compositeSubtitle: "结合 AI 动作与公司长期能力底座的综合评分。"
  },
  en: {
    heroTitle: "AI Consulting Action Ranking",
    heroSubtitle: "This index does not start with brand prestige. It tracks which firms are turning AI into concrete moves across partnerships, platforms, service lines, M&A, organization, client value, and governance.",
    companyCountLabel: "traditional consulting / professional services firms",
    filtersTitle: "Filters",
    filtersSubtitle: "Use the left panel to filter. Switch between the two rankings in the main panel.",
    insightsTitle: "Key Observations",
    insightsSubtitle: "A fast read on the most important patterns emerging from the current dataset.",
    coverageTitle: "Coverage",
    coverageSubtitle: "How the ranking tries to stay comprehensive while making evidence bias explicit.",
    wechatEyebrow: "Praxis Advisory",
    wechatTitle: "Follow Our WeChat Official Account",
    wechatBody: "Scan the QR code for leaderboard updates, research on how European companies read the China AI ecosystem, and the latest insights from Praxis Advisory.",
    coverageCard1Title: "Standardized search template",
    coverageCard1Body: "Every firm is reviewed using the same search logic across official sites, press releases, research pages, partner announcements, and mainstream media to reduce selective attention bias.",
    coverageCard2Title: "Source-tier weighting",
    coverageCard2Body: "Official, vendor-official, media, and pending-verification sources are not treated equally. Weaker sources receive lower weight in scoring.",
    coverageCard3Title: "Evidence thickness disclosed",
    coverageCard3Body: "Each ranking card shows official evidence count, pending-verification count, and coverage confidence so readers can judge whether a rank is backed by sufficient evidence.",
    newsSummaryTitle: "Cross-Firm News Summary",
    newsSummarySubtitle: "A horizontal view of recent AI-related signals, with emphasis on source quality and impacted dimensions.",
    weeklyTitle: "Net New Signals This Week",
    deltaTitle: "Weekly Rank Drivers",
    methodTitle: "Method",
    methodCard1Title: "Evidence layer",
    methodCard1Body: "Each event is logged with date, actor, event type, source credibility, and impacted dimensions to explain what a firm actually did.",
    methodCard2Title: "AI action score",
    methodCard2Body: "This score emphasizes recent actions, adjusting for freshness, source quality, signal strength, and impacted dimensions to estimate a firm's near-term execution intensity in AI.",
    methodCard3Title: "Composite capability score",
    methodCard3Body: "This score layers longer-term AI foundations, public thought leadership, and classic consulting strengths on top of recent AI actions.",
    dimensionsTitle: "Scoring Dimensions",
    dimensionsSubtitle: "The current MVP uses 9 dimensions with provisional analyst-assigned scores from 0 to 5.",
    reset: "Reset",
    tierLabel: "Firm Type",
    eventLabel: "Event Type",
    searchLabel: "Search",
    searchPlaceholder: "Firm, AI move, partner",
    all: "All",
    actionBoard: "AI Action Ranking",
    compositeBoard: "Composite Capability Ranking",
    actionSubtitle: "Ranks firms by recent AI actions. News items are treated as evidence rather than scored as standalone entries.",
    compositeSubtitle: "Combines recent AI actions with longer-term AI foundations and classic consulting strengths."
  }
};

const EVENT_TYPE_LABELS_EN = {
  partnership: "Partnership",
  platform: "Platform / Tool",
  service_line: "Service Line",
  investment: "Investment / M&A",
  organization: "Organization / Hiring",
  governance: "Governance / Risk",
  research: "Research / Index",
  client_proof: "Client Proof",
};

const DIMENSION_LABELS_EN = {
  strategy_signal: "Strategic Signal",
  tech_partnership: "Depth of Tech Partnerships",
  proprietary_assets: "Proprietary AI Assets",
  delivery_production: "Delivery & Productionization",
  capital_ma: "Capital / M&A Moves",
  industry_coverage: "Industry Coverage",
  client_value_proof: "Client Value Proof",
  governance_risk: "Governance & Risk",
  thought_leadership: "Thought Leadership",
};

const DIMENSION_DESC_EN = {
  strategy_signal: "Whether AI has entered the firm's core strategic narrative and service portfolio rather than remaining a scattered marketing topic.",
  tech_partnership: "The depth of partnerships with key platforms such as OpenAI, Microsoft, ServiceNow, AWS, Google, or Anthropic.",
  proprietary_assets: "Whether the firm has built reusable internal platforms, tools, knowledge bases, agent frameworks, or industry models.",
  delivery_production: "The ability to move AI from PoC to production through engineering, workflow design, operating model changes, and scaled deployment.",
  capital_ma: "Whether the firm is using investment, acquisition, JV, or other capital moves to strengthen AI capabilities.",
  industry_coverage: "Whether AI activity spans multiple industries such as financial services, manufacturing, healthcare, retail, energy, legal, or private equity.",
  client_value_proof: "Whether the firm shows quantified outcomes such as productivity gains, cost savings, revenue impact, ROI, or client case evidence.",
  governance_risk: "Whether the firm emphasizes trusted AI, governance, compliance, monitoring, security, and model risk management.",
  thought_leadership: "Whether the firm consistently publishes high-density AI reports, surveys, and management insights that shape enterprise understanding of AI."
};

function t(key) {
  return I18N[activeLanguage]?.[key] ?? I18N.zh[key] ?? key;
}

function translateCompanyCopy(text = "") {
  if (activeLanguage !== "en" || !text) return text;

  return text
    .replace("企业级 AI 转型、agentic AI、workflow redesign、QuantumBlack", "Enterprise AI transformation, agentic AI, workflow redesign, and QuantumBlack")
    .replace("AI @ Scale、BCG X、生成式 AI、企业级 AI 转型", "AI @ Scale, BCG X, generative AI, and enterprise AI transformation")
    .replace("AI 部署、PE 组合公司、企业级 AI 落地、OpenAI 合作", "AI deployment, PE portfolio companies, enterprise AI implementation, and OpenAI collaboration")
    .replace("AI 战略、知识 hub、AI agents、欧洲与工业场景", "AI strategy, knowledge hubs, AI agents, and European / industrial use cases")
    .replace("agentic AI、流程再造、运营转型、ServiceNow 合作", "Agentic AI, process redesign, operating-model transformation, and ServiceNow collaboration")
    .replace("Quotient – AI by Oliver Wyman、风险与增长、行业场景", "Quotient – AI by Oliver Wyman, risk and growth, and industry use cases")
    .replace("AI Institute、Agentic Network、Zora AI、企业级 AI 转型", "AI Institute, Agentic Network, Zora AI, and enterprise AI transformation")
    .replace("战略咨询、创新、增长、组织转型", "Strategy consulting, innovation, growth, and organizational transformation")
    .replace("AI 投资、Microsoft/OpenAI 合作、Agent OS、治理与信任", "AI investment, Microsoft/OpenAI partnerships, Agent OS, governance, and trust")
    .replace("战略落地、业务转型、AI 战略", "Strategy execution, business transformation, and AI strategy")
    .replace("EY-Microsoft AI initiative、Client Zero、多代理框架、审计体验", "EY-Microsoft AI initiative, Client Zero, multi-agent frameworks, and audit experience")
    .replace("Trusted AI、Agent 365、Copilot、治理与规模化", "Trusted AI, Agent 365, Copilot, governance, and scaling")
    .replace("OpenAI 合作、企业 reinvention、AgentKit、全球交付", "OpenAI collaboration, enterprise reinvention, AgentKit, and global delivery")
    .replace("OpenAI Frontier Alliance、行业 AI 解决方案、全球交付", "OpenAI Frontier Alliance, industry AI solutions, and global delivery")
    .replace("FTI Technology、IQ.AI、法律/合规/调查场景", "FTI Technology, IQ.AI, and legal / compliance / investigations use cases")
    .replace("applied AI、Global AI Board、operator-led delivery", "Applied AI, Global AI Board, and operator-led delivery")
    .replace("行业洞察、AI 在医疗/消费/工业/金融等场景的应用", "Sector insights and AI applications across healthcare, consumer, industrial, and financial-services use cases")
    .replace("Strategy& 可作为 PwC 旗下战略品牌观察，暂不独立计分。", "Strategy& is tracked as PwC's strategy brand and is not scored independently for now.")
    .replace("Monitor Deloitte 可作为 Deloitte 旗下战略品牌观察，暂不独立计分。", "Monitor Deloitte is tracked as Deloitte's strategy brand and is not scored independently for now.")
    .replace("PwC 旗下战略咨询品牌；MVP 中暂作为 PwC 的观察标签，不单独排名。", "PwC's strategy consulting brand; tracked as a PwC sub-label in the MVP and not ranked independently.")
    .replace("Deloitte 旗下战略品牌；MVP 中暂作为 Deloitte 的观察标签，不单独排名。", "Deloitte's strategy brand; tracked as a Deloitte sub-label in the MVP and not ranked independently.");
}

function translateEventTitle(text = "") {
  if (activeLanguage !== "en" || !text) return text;

  return text
    .replace("成为 OpenAI Partner Network 首发全球合作伙伴", "named a launch global partner in the OpenAI Partner Network")
    .replace("获新一轮媒体引用，强调 AI 岗位与薪资继续走强", "gains renewed media attention as AI-linked roles and pay keep strengthening")
    .replace("发布 2026 AI Jobs Barometer", "publishes the 2026 AI Jobs Barometer")
    .replace("与 Anthropic 扩大合作，Claude 进入 PwC 交付体系", "expands work with Anthropic, bringing Claude into PwC delivery workflows")
    .replace("与 OpenAI 合作重构 CFO Office 的 AI agents", "works with OpenAI to redesign AI agents for the CFO Office")
    .replace("三年投入 10 亿美元扩展 AI 能力", "commits $1 billion over three years to expand AI capabilities")
    .replace("更新 AI & Data Challenge Program 页面", "updates the AI & Data Challenge Program page")
    .replace("发布 Unintended consequences: future AI cyber risk", "publishes Unintended consequences: future AI cyber risk")
    .replace("发布 What AI Growth Leaders Need to Get Right 视频洞察", "publishes the video insight What AI Growth Leaders Need to Get Right")
    .replace("发布 2026 Private Equity AI Radar", "publishes the 2026 Private Equity AI Radar")
    .replace("采用 Microsoft Agent 365 管理 AI agents 生命周期", "adopts Microsoft Agent 365 to manage the AI agent lifecycle");
}

function translateEventSummary(text = "") {
  if (activeLanguage !== "en" || !text) return text;

  return text
    .replace("OpenAI 官方将 PwC 列为 OpenAI Partner Network 首发全球合作伙伴之一。OpenAI 页面直接引用 PwC 观点，强调将 frontier capabilities 与 transformation expertise 结合，帮助客户以 responsible 方式大规模部署 AI。", "OpenAI named PwC one of the launch global partners in the OpenAI Partner Network. The OpenAI page directly quotes PwC and emphasizes combining frontier capabilities with transformation expertise to help clients deploy AI at scale in a responsible way.")
    .replace("PwC 基于超过 10 亿条职位数据发布 2026 AI Jobs Barometer，指出 AI 正在把入门岗位“高级化”，AI 暴露度高的初级岗位更早要求判断力、领导力和战略思维，体现其在 AI 与劳动力结构上的公开研究能力。", "Based on more than one billion job postings, PwC's 2026 AI Jobs Barometer argues that AI is making entry-level roles more advanced. Junior roles with high AI exposure now require judgment, leadership, and strategic thinking earlier, highlighting PwC's public research capability at the intersection of AI and labor-market structure.")
    .replace("Consultancy.uk 依据 PwC 的最新 AI Jobs Barometer 报道，英国 AI 相关招聘与薪资继续跑赢整体就业市场；基于超过 10 亿条招聘广告的分析，PwC 指出企业对 AI 能力的需求正在加速，并从泛化兴趣转向更明确的专业能力要求。", "Consultancy.uk, drawing on PwC's latest AI Jobs Barometer, reports that UK AI hiring and pay continue to outperform the broader labor market. Based on analysis of more than one billion job ads, PwC argues that demand for AI capabilities is accelerating and moving from broad interest toward more explicit skill requirements.")
    .replace("PwC 与 OpenAI 围绕财务规划、预测、报告、采购、付款、财资、税务和会计结账等核心财务流程构建 AI agents；OpenAI 财务组织作为 Customer Zero，Codex 已处理5倍合同，IR-GPT 管理200+投资者互动。", "PwC and OpenAI are building AI agents across core finance workflows including planning, forecasting, reporting, procurement, payments, treasury, tax, and accounting close. OpenAI's own finance team acts as Customer Zero, with Codex already handling five times more contracts and IR-GPT managing more than 200 investor interactions.")
    .replace("行业报道显示 PwC 与 Anthropic 扩大合作，计划培训并认证3万名美国专业人员使用 Claude，并将 Claude Code、Claude Cowork 等能力扩展到全球专业服务体系。该事件待官方复核。", "Industry reporting suggests PwC is expanding its work with Anthropic, with plans to train and certify 30,000 US professionals on Claude and extend capabilities such as Claude Code and Claude Cowork across its global professional-services system. This item still requires official verification.")
    .replace("PwC US 宣布三年 10 亿美元 AI 投资，基于 Microsoft 与 OpenAI 技术扩展生成式 AI 服务。", "PwC US announced a $1 billion AI investment over three years to expand generative AI services built on Microsoft and OpenAI technologies.")
    .replace("EY 的 AI & Data Challenge Program 页面显示 2026-07-07 日期，属于本周可确认的 AI 能力与人才项目公开更新。这类专题页更新不如重大合作强，但能反映公司在 AI 人才、方法和品牌资产上的持续投入。", "EY's AI & Data Challenge Program page shows a visible date of 2026-07-07, making it a verifiable public update in the current week. This kind of program-page refresh is weaker than a major partnership, but it still reflects continued investment in AI talent, methods, and brand assets.")
    .replace("FTI 于 2026-07-08 发布 AI 网络风险主题文章，讨论 agentic AI 与新型攻击面的治理含义。这是一条本周可确认日期的 thought leadership 信号，强化了 FTI 在风险、调查和合规场景中的 AI 观察能力。", "On 2026-07-08, FTI published a thought-leadership piece on AI cyber risk, discussing the governance implications of agentic AI and new attack surfaces. It is a clearly dated signal for the week and reinforces FTI's AI perspective in risk, investigations, and compliance.")
    .replace("OpenAI 官方将 McKinsey / QuantumBlack 列为 OpenAI Partner Network 首发全球合作伙伴之一，强调 McKinsey 的战略与技术能力、QuantumBlack 的交付能力可帮助客户加速 adoption、create real value 并 deliver impact。", "OpenAI named McKinsey / QuantumBlack one of the launch global partners in the OpenAI Partner Network, emphasizing McKinsey's strategic and technical capabilities together with QuantumBlack's delivery strengths to help clients accelerate adoption, create real value, and deliver impact.")
    .replace("OpenAI 官方宣布推出 OpenAI Partner Network，BCG 作为首发全球合作伙伴之一被点名，OpenAI 特别强调其 transformation expertise、BCG X 技术能力与 forward deployed engineering talent，将帮助客户从 pilots 走向 applied AI at scale。", "OpenAI officially launched the OpenAI Partner Network and explicitly named BCG as one of the launch global partners. OpenAI highlighted its transformation expertise, BCG X technical capability, and forward-deployed engineering talent as assets that can help clients move from pilots to applied AI at scale.")
    .replace("OpenAI 官方将 Bain 列为 OpenAI Partner Network 首发全球合作伙伴之一，并强调 Bain 将 OpenAI frontier AI 与战略、技术和 enterprise transformation 能力结合，帮助客户把 AI ambition 变成 enterprise-wide impact。", "OpenAI named Bain one of the launch global partners in the OpenAI Partner Network, emphasizing Bain's ability to combine OpenAI frontier AI with strategy, technology, and enterprise-transformation capabilities to turn AI ambition into enterprise-wide impact.")
    .replace("OpenAI 官方将 Accenture 列为 OpenAI Partner Network 首发全球合作伙伴之一，并强调其 unmatched industry depth、global delivery scale 和把先进技术嵌入企业核心运营的能力。", "OpenAI named Accenture one of the launch global partners in the OpenAI Partner Network, highlighting its unmatched industry depth, global delivery scale, and ability to embed advanced technology into core enterprise operations.")
    .replace("OpenAI 与 Accenture 加速企业 reinvention", "OpenAI and Accenture accelerate enterprise reinvention");
}

function applyStaticTranslations() {
  if (els.heroTitle) els.heroTitle.textContent = t("heroTitle");
  if (els.heroSubtitle) els.heroSubtitle.textContent = t("heroSubtitle");
  if (els.companyCountLabel) els.companyCountLabel.textContent = t("companyCountLabel");
  if (els.filtersTitle) els.filtersTitle.textContent = t("filtersTitle");
  if (els.filtersSubtitle) els.filtersSubtitle.textContent = t("filtersSubtitle");
  if (els.insightsTitle) els.insightsTitle.textContent = t("insightsTitle");
  if (els.insightsSubtitle) els.insightsSubtitle.textContent = t("insightsSubtitle");
  if (els.coverageTitle) els.coverageTitle.textContent = t("coverageTitle");
  if (els.coverageSubtitle) els.coverageSubtitle.textContent = t("coverageSubtitle");
  if (els.wechatEyebrow) els.wechatEyebrow.textContent = t("wechatEyebrow");
  if (els.wechatTitle) els.wechatTitle.textContent = t("wechatTitle");
  if (els.wechatBody) els.wechatBody.textContent = t("wechatBody");
  if (els.coverageCard1Title) els.coverageCard1Title.textContent = t("coverageCard1Title");
  if (els.coverageCard1Body) els.coverageCard1Body.textContent = t("coverageCard1Body");
  if (els.coverageCard2Title) els.coverageCard2Title.textContent = t("coverageCard2Title");
  if (els.coverageCard2Body) els.coverageCard2Body.textContent = t("coverageCard2Body");
  if (els.coverageCard3Title) els.coverageCard3Title.textContent = t("coverageCard3Title");
  if (els.coverageCard3Body) els.coverageCard3Body.textContent = t("coverageCard3Body");
  if (els.newsSummaryTitle) els.newsSummaryTitle.textContent = t("newsSummaryTitle");
  if (els.newsSummarySubtitle) els.newsSummarySubtitle.textContent = t("newsSummarySubtitle");
  if (els.weeklyTitle) els.weeklyTitle.textContent = t("weeklyTitle");
  if (els.deltaTitle) els.deltaTitle.textContent = t("deltaTitle");
  if (els.methodTitle) els.methodTitle.textContent = t("methodTitle");
  if (els.methodCard1Title) els.methodCard1Title.textContent = t("methodCard1Title");
  if (els.methodCard1Body) els.methodCard1Body.textContent = t("methodCard1Body");
  if (els.methodCard2Title) els.methodCard2Title.textContent = t("methodCard2Title");
  if (els.methodCard2Body) els.methodCard2Body.textContent = t("methodCard2Body");
  if (els.methodCard3Title) els.methodCard3Title.textContent = t("methodCard3Title");
  if (els.methodCard3Body) els.methodCard3Body.textContent = t("methodCard3Body");
  if (els.dimensionsTitle) els.dimensionsTitle.textContent = t("dimensionsTitle");
  if (els.dimensionsSubtitle) els.dimensionsSubtitle.textContent = t("dimensionsSubtitle");
  if (els.resetFilters) els.resetFilters.textContent = t("reset");
  if (els.tierLabel) els.tierLabel.textContent = t("tierLabel");
  if (els.eventLabel) els.eventLabel.textContent = t("eventLabel");
  if (els.searchLabel) els.searchLabel.textContent = t("searchLabel");
  if (els.searchInput) els.searchInput.placeholder = t("searchPlaceholder");
  if (els.viewAction) els.viewAction.textContent = t("actionBoard");
  if (els.viewComposite) els.viewComposite.textContent = t("compositeBoard");
  if (els.scoreboardTitle) els.scoreboardTitle.textContent = activeBoard === "action" ? t("actionBoard") : t("compositeBoard");
  if (els.scoreboardSubtitle) els.scoreboardSubtitle.textContent = activeBoard === "action" ? t("actionSubtitle") : t("compositeSubtitle");
  if (els.langZh) {
    els.langZh.classList.toggle("is-active", activeLanguage === "zh");
    els.langZh.setAttribute("aria-pressed", String(activeLanguage === "zh"));
  }
  if (els.langEn) {
    els.langEn.classList.toggle("is-active", activeLanguage === "en");
    els.langEn.setAttribute("aria-pressed", String(activeLanguage === "en"));
  }
}

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
  const fallback = eventTypes.find((item) => item.id === typeId)?.label ?? typeId;
  return activeLanguage === "en" ? (EVENT_TYPE_LABELS_EN[typeId] || fallback) : fallback;
}

function typeColor(typeId) {
  return eventTypes.find((item) => item.id === typeId)?.color ?? "#1d4ed8";
}

function dimensionName(dimensionId) {
  const fallback = dimensions.find((item) => item.id === dimensionId)?.name ?? dimensionId;
  return activeLanguage === "en" ? (DIMENSION_LABELS_EN[dimensionId] || fallback) : fallback;
}

function dimensionDescription(dimension) {
  return activeLanguage === "en" ? (DIMENSION_DESC_EN[dimension.id] || dimension.description) : dimension.description;
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
  const joiner = activeLanguage === "en" ? ", " : "、";
  const tags = eventDimensionTags(event).map(dimensionName).join(joiner);
  const source = sourceLabel(event.source_level);
  const confidence = confidenceLabel(event.confidence);

  if (activeLanguage === "en") {
    if (event.confidence === "low") return `High-potential but pending verification: a relatively strong event score, but current source confidence is ${confidence}; mapped to ${tags}. An official or first-hand source is still needed.`;
    if (score >= 90) return `Strong signal: directly changes the firm's AI capability boundary, mapped to ${tags}; source ${source}, confidence ${confidence}.`;
    if (score >= 82) return `High signal: clear partnership, platform, or delivery relevance, mapped to ${tags}; source ${source}, confidence ${confidence}.`;
    if (score >= 74) return `Upper-mid signal: meaningfully adds to the firm's AI capability picture, mapped to ${tags}; source ${source}, confidence ${confidence}.`;
    return `Watch signal: auxiliary evidence of the firm's AI actions, mapped to ${tags}; source ${source}, confidence ${confidence}.`;
  }

  if (event.confidence === "low") return `高潜力但待核验：事件分较高，但当前来源可信度为 ${confidence}，映射 ${tags}；需要官方或一手来源复核。`;
  if (score >= 90) return `强信号：直接改变公司 AI 能力边界，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
  if (score >= 82) return `高信号：具备明确合作、平台或交付含义，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
  if (score >= 74) return `中高信号：能补充公司 AI 能力拼图，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
  return `观察信号：作为公司 AI 动作的辅助证据，映射 ${tags}；来源 ${source}，可信度 ${confidence}。`;
}

function scoreBand(score) {
  if (activeLanguage === "en") {
    if (score == null) return "Pending";
    if (score >= 90) return "Leading";
    if (score >= 82) return "Strong";
    if (score >= 74) return "Active";
    return "Watch";
  }
  if (score == null) return "待评估";
  if (score >= 90) return "领先";
  if (score >= 82) return "强";
  if (score >= 74) return "活跃";
  return "观察";
}

function shortDate(date) {
  if (!date || date.length <= 4) return date || (activeLanguage === "en" ? "Undated" : "未标注");
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
    official: activeLanguage === "en" ? "Official" : "官方",
    official_press_release: activeLanguage === "en" ? "Official PR" : "官方新闻稿",
    vendor_official: activeLanguage === "en" ? "Vendor official" : "厂商官方",
    media: activeLanguage === "en" ? "Media" : "媒体",
    third_party: activeLanguage === "en" ? "Third party" : "第三方",
    pending_verification: activeLanguage === "en" ? "Pending verification" : "待核验",
  };
  return map[level] || level || (activeLanguage === "en" ? "Unknown" : "未知");
}

function confidenceLabel(level) {
  const map = activeLanguage === "en"
    ? { high: "High", medium: "Medium", low: "Low" }
    : { high: "高", medium: "中", low: "低" };
  return map[level] || level || (activeLanguage === "en" ? "Unknown" : "未知");
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

function refreshFilterOptionLabels() {
  const tierFirst = els.tierFilter?.querySelector('option[value="all"]');
  const eventFirst = els.eventFilter?.querySelector('option[value="all"]');
  if (tierFirst) tierFirst.textContent = t("all");
  if (eventFirst) eventFirst.textContent = t("all");
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
        <p>${escapeHtml(dimensionDescription(dimension))}</p>
        <em>${activeLanguage === "en" ? "Weight" : "权重"} ${Math.round(dimension.weight * 100)}%</em>
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
    { label: activeLanguage === "en" ? "Focus" : "关注点", value: translateCompanyCopy(company.focus) },
    latestEvent ? { label: activeLanguage === "en" ? "Latest Move" : "最近动作", value: `${shortDate(latestEvent.date)} · ${typeLabel(latestEvent.type)}` } : null,
    strongestDimension ? { label: activeLanguage === "en" ? "Strongest Dimension" : "最强维度", value: `${strongestDimension.name} ${strongestDimension.value}/5` } : null,
    thoughtScore ? { label: activeLanguage === "en" ? "AI Thought Leadership" : "AI 思考力", value: `${thoughtScore}/5` } : null,
    company.brand_note ? { label: activeLanguage === "en" ? "Brand Note" : "品牌说明", value: translateCompanyCopy(company.brand_note) } : null,
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
  const map = activeLanguage === "en"
    ? { high: "High coverage", medium: "Medium coverage", low: "Low coverage" }
    : { high: "覆盖高", medium: "覆盖中", low: "覆盖低" };
  return map[level] || (activeLanguage === "en" ? "Coverage not labeled" : "覆盖未标注");
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
  const topTwo = rows.slice(0, 2).map(({ company }) => company.name).join(activeLanguage === "en" ? " and " : " 和 ");
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
      title: activeLanguage === "en" ? `${topTwo} lead the field` : `${topTwo} 领跑`,
      body: activeLanguage === "en"
        ? `On the current composite ranking, ${topTwo} sit in the first tier. Their lead comes mainly from scaled technology partnerships, internal Client Zero validation, and a stronger ability to move AI from narrative into organization-level deployment.`
        : `当前综合能力榜上，${topTwo} 处于第一梯队，领先原因主要来自大规模技术合作、内部 Client Zero 验证，以及把 AI 从叙事推向组织级部署。`,
    },
    {
      kicker: "Big Four",
      accent: "#1d4ed8",
      title: activeLanguage === "en" ? "Big Four as the strongest group" : "Big Four 整体最强",
      body: topBigFour.length
        ? (activeLanguage === "en"
          ? `In the current sample, the Big Four show the most complete group-level push: ${topBigFour.map(({ company }) => company.name).join(", ")} all appear near the top, suggesting simultaneous strength in platform partnerships, industry coverage, and governance capabilities.`
          : `从当前样本看，Big Four 形成最完整的集团式推进：${topBigFour.map(({ company }) => company.name).join("、")} 都在前列，说明其平台合作、行业覆盖和治理能力一起在发力。`)
        : (activeLanguage === "en"
          ? "In the current sample, the Big Four remain the most systematically organized professional-services bloc in AI."
          : "当前样本里，Big Four 仍然是最系统推进 AI 的专业服务群体。"),
    },
    {
      kicker: "MBB vs Tech/SI",
      accent: "#0f766e",
      title: activeLanguage === "en"
        ? `${mbbLeader?.company.name || "MBB leader"} and ${techLeader?.company.name || "Tech/SI leader"} win differently`
        : `${mbbLeader?.company.name || "MBB 龙头"} 与 ${techLeader?.company.name || "Tech/SI 龙头"} 各自强势`,
      body: activeLanguage === "en"
        ? `${mbbLeader?.company.name || "The leading MBB firm"} looks more like a strategy-and-platform archetype, while ${techLeader?.company.name || "the leading Tech/SI firm"} shows stronger production and delivery muscle. They are approaching the same destination through different paths: turning AI into client workflows.`
        : `${mbbLeader?.company.name || "MBB 头部公司"} 更像战略与平台双轮驱动的代表，${techLeader?.company.name || "Tech/SI 头部公司"} 则体现了更强的交付生产化能力。两类公司正在从不同路径逼近同一个结果：把 AI 做成客户工作流。`,
    },
    {
      kicker: "Watchlist",
      accent: "#ff8a00",
      title: activeLanguage === "en" ? "Some high-score events still need verification" : "高分事件里仍有待核验项",
      body: lowConfidenceEvents.length
        ? (activeLanguage === "en"
          ? `There are currently ${lowConfidenceEvents.length} high-scoring events still tagged with low confidence, mainly around investment or partnership stories involving firms such as ${lowConfidenceEvents.slice(0, 3).map(({ company }) => company.name).join(", ")}. These signals are worth keeping, but should still be treated as pending official confirmation.`
          : `当前有 ${lowConfidenceEvents.length} 条高分事件仍是低置信度，主要集中在 ${lowConfidenceEvents.slice(0, 3).map(({ company }) => company.name).join("、")} 等公司的投资或合作新闻。这些信号值得保留，但页面上应继续视为待官方复核。`)
        : (activeLanguage === "en"
          ? "Most high-scoring events are now supported by relatively strong sources, with fewer unresolved items left in the watchlist."
          : "当前高分事件大多已有较强来源支撑，待核验项相对有限。"),
    },
    {
      kicker: "Thought Leadership",
      accent: "#2457ff",
      title: activeLanguage === "en" ? "Public reports are now included in scoring" : "公开报告已经纳入评分",
      body: thoughtLeaders.length
        ? (activeLanguage === "en"
          ? `We now include public AI reports as a thought-leadership dimension. The strongest group on this axis is currently ${thoughtLeaders.join(", ")}, suggesting that these firms are not only acting, but also shaping how enterprise buyers interpret AI.`
          : `我们已把 AI 公开报告作为“思考力”维度纳入模型。当前在这一维度最强的一组是 ${thoughtLeaders.join("、")}，它们不仅有动作，也持续在塑造企业客户对 AI 的认知框架。`)
        : (activeLanguage === "en"
          ? "Public AI reports are now part of the model, helping offset the limitations of looking only at recent news actions."
          : "我们已把 AI 公开报告作为“思考力”维度纳入模型，用来补足只看新闻动作的局限。"),
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
          <a href="${escapeHtml(report.url)}" target="_blank" rel="noreferrer">${activeLanguage === "en" ? "View report" : "查看报告"}</a>
        </article>
      `).join("")}
    </div>
  `;
}

function renderEvidenceStrip(company) {
  const meta = evidenceMeta(company);
  return `
    <div class="evidence-strip">
      <span class="evidence-pill">${activeLanguage === "en" ? "Official evidence" : "官方证据"} ${meta.officialCount}</span>
      <span class="evidence-pill">${activeLanguage === "en" ? "Public reports" : "公开报告"} ${meta.reportsCount}</span>
      <span class="evidence-pill">${activeLanguage === "en" ? "Pending verification" : "待核验"} ${meta.pendingCount}</span>
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
  const scoreLabel = activeBoard === "action"
    ? (activeLanguage === "en" ? "Action" : "行动力")
    : (activeLanguage === "en" ? "Composite" : "综合分");
  return `
    <section class="rank-navigator-shell" aria-label="${activeLanguage === "en" ? "Quick rank navigation" : "排名快速导航"}">
      <div class="rank-navigator-shell__intro">
        <div>
          <p class="rank-navigator-shell__eyebrow">Quick Jump</p>
          <h3>${activeLanguage === "en" ? "Top 10 Rank Navigator" : "Top 10 排名导航"}</h3>
        </div>
        <p>${activeLanguage === "en" ? "Scan the board first, then jump into company-level evidence." : "先快速扫榜，再进入单家公司证据。"}</p>
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
    <div class="board-controls" aria-label="${activeLanguage === "en" ? "Board browsing mode" : "榜单浏览模式"}">
      <button id="compactToggle" class="board-controls__button ${compactMode ? "is-active" : ""}" type="button" aria-pressed="${compactMode}">
        ${compactMode ? (activeLanguage === "en" ? "Compact view" : "紧凑浏览") : (activeLanguage === "en" ? "Expanded view" : "展开浏览")}
      </button>
      <button id="evidenceToggle" class="board-controls__button" type="button" aria-pressed="${expandAllEvidence}">
        ${expandAllEvidence ? (activeLanguage === "en" ? "Collapse all evidence" : "折叠全部证据") : (activeLanguage === "en" ? "Expand all evidence" : "展开全部证据")}
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
  const titleText = activeLanguage === "en"
    ? `${company.name} Recent AI Actions`
    : `${company.name}的近期 AI 行动力`;
  const focusText = activeLanguage === "en"
    ? `${translateCompanyCopy(company.focus)}${company.brand_note ? ` · ${translateCompanyCopy(company.brand_note)}` : ""}`
    : `${company.focus}${company.brand_note ? ` · ${company.brand_note}` : ""}`;
  const evidence = action.events
    .map((event) => `
      <article class="event">
        <time>${escapeHtml(shortDate(event.date))}</time>
        <div>
          <span class="badge" style="--event-color:${typeColor(event.type)}">${escapeHtml(typeLabel(event.type))}</span>
          <span class="event-contribution">${activeLanguage === "en" ? "Contribution" : "贡献"} ${event.contribution_score.toFixed(1)} ${activeLanguage === "en" ? "pts" : "分"}</span>
          <h4>${escapeHtml(translateEventTitle(event.title))}</h4>
          <p>${escapeHtml(translateEventSummary(event.summary))}</p>
          <a href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">${activeLanguage === "en" ? "View source" : "查看来源"}</a>
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
          ${latestEvent ? `<span class="score-pill">${activeLanguage === "en" ? "Latest move" : "最新动作"}: ${escapeHtml(shortDate(latestEvent.date))} · ${escapeHtml(typeLabel(latestEvent.type))}</span>` : ""}
          <span class="score-pill">${activeLanguage === "en" ? "Action rating" : "行动力评级"} ${escapeHtml(scoreBand(score))}</span>
        </div>

        <h3>${escapeHtml(titleText)}</h3>
        <p>${escapeHtml(focusText)}</p>

        ${renderEvidenceStrip(company)}

        <div class="impact-line">
          <span>${activeLanguage === "en" ? "Impacted dimensions" : "影响维度"}</span>
          <div class="dimension-chips">
            ${tags.map((tag) => `<span class="dimension-chip">${escapeHtml(dimensionName(tag))}</span>`).join("")}
          </div>
        </div>

        <details class="card-details" ${detailsOpen ? "open" : ""}>
          <summary class="card-details__summary">
            <span>${activeLanguage === "en" ? "View event evidence and contribution" : "查看新闻证据与事件贡献"}</span>
            <strong>${action.events.length} ${activeLanguage === "en" ? "core events" : "条核心事件"}</strong>
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
    els.scoreboard.innerHTML = `<div class="panel-title"><div><h2>${activeBoard === "action" ? t("actionBoard") : t("compositeBoard")}</h2><p>${activeBoard === "action" ? t("actionSubtitle") : t("compositeSubtitle")}</p></div></div><div class="view-switch" role="tablist" aria-label="榜单切换"><button class="view-switch__button ${activeBoard === "action" ? "is-active" : ""}" type="button">${t("actionBoard")}</button><button class="view-switch__button ${activeBoard === "composite" ? "is-active" : ""}" type="button">${t("compositeBoard")}</button></div><div class="empty">${activeLanguage === "zh" ? "没有匹配的公司。试试重置筛选，或搜索“OpenAI / Microsoft / agentic / IQ.AI”。" : "No matching firms. Try resetting filters or searching OpenAI, Microsoft, agentic, or IQ.AI."}</div>`;
    return;
  }

  els.scoreboardTitle.textContent = activeBoard === "action" ? t("actionBoard") : t("compositeBoard");
  els.scoreboardSubtitle.textContent = activeBoard === "action"
    ? t("actionSubtitle")
    : t("compositeSubtitle");
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
      <button id="viewActionInline" class="view-switch__button ${activeBoard === "action" ? "is-active" : ""}" type="button" aria-pressed="${activeBoard === "action"}">${t("actionBoard")}</button>
      <button id="viewCompositeInline" class="view-switch__button ${activeBoard === "composite" ? "is-active" : ""}" type="button" aria-pressed="${activeBoard === "composite"}">${t("compositeBoard")}</button>
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

  activeLanguage = currentUrlLanguage();
  eventTypes = data.event_types;
  dimensions = data.dimensions;
  applyStaticTranslations();

  els.updatedAt.textContent = `数据更新：${data.meta.updated_at}（对比 ${comparisonStartDate()}）`;
  els.companyCount.textContent = String(data.companies.length);
  if (els.methodIntro) {
    els.methodIntro.textContent = `我们不对单条新闻做公开排名，而是把新闻、公开报告与长期能力一起映射到公司的两套评分，并公开展示证据厚度、待核验状态与覆盖置信度。当前方法参照 ${data.meta.scoring_model_file || "SCORING_MODEL.md"}。`;
  }

  populateFilters();
  refreshFilterOptionLabels();
  renderLegend();
  renderDimensions();
  renderAll();

  els.tierFilter.addEventListener("change", renderAll);
  els.eventFilter.addEventListener("change", renderAll);
  els.searchInput.addEventListener("input", renderAll);
  els.resetFilters.addEventListener("click", resetFilters);
  els.viewAction?.addEventListener("click", () => {
    activeBoard = "action";
    applyStaticTranslations();
    renderScoreboard();
  });
  els.viewComposite?.addEventListener("click", () => {
    activeBoard = "composite";
    applyStaticTranslations();
    renderScoreboard();
  });
  els.langZh?.addEventListener("click", () => {
    activeLanguage = "zh";
    syncLanguageInUrl();
    applyStaticTranslations();
    refreshFilterOptionLabels();
    renderDimensions();
    renderScoreboard();
  });
  els.langEn?.addEventListener("click", () => {
    activeLanguage = "en";
    syncLanguageInUrl();
    applyStaticTranslations();
    refreshFilterOptionLabels();
    renderDimensions();
    renderScoreboard();
  });
}

init().catch((error) => {
  els.scoreboard.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});

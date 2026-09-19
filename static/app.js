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
  wechatEyebrow: document.querySelector("#wechatEyebrow"),
  wechatTitle: document.querySelector("#wechatTitle"),
  wechatBody: document.querySelector("#wechatBody"),
  weeklyTitle: document.querySelector("#weeklyTitle"),
  deltaTitle: document.querySelector("#deltaTitle"),
  methodTitle: document.querySelector("#methodTitle"),
  methodCard1Title: document.querySelector("#methodCard1Title"),
  methodCard1Body: document.querySelector("#methodCard1Body"),
  methodCard2Title: document.querySelector("#methodCard2Title"),
  methodCard2Body: document.querySelector("#methodCard2Body"),
  tierLabel: document.querySelector("#tierLabel"),
  eventLabel: document.querySelector("#eventLabel"),
  searchLabel: document.querySelector("#searchLabel"),
  methodIntro: document.querySelector("#methodIntro"),
  scoreboardTitle: document.querySelector("#scoreboardTitle"),
  scoreboardSubtitle: document.querySelector("#scoreboardSubtitle"),
  langZh: document.querySelector("#langZh"),
  langEn: document.querySelector("#langEn"),
  tierFilter: document.querySelector("#tierFilter"),
  eventFilter: document.querySelector("#eventFilter"),
  searchInput: document.querySelector("#searchInput"),
  resetFilters: document.querySelector("#resetFilters"),
  legend: document.querySelector("#legend"),
  scoreboard: document.querySelector("#scoreboard"),
  insightsGrid: document.querySelector("#insightsGrid"),
  weeklyWindow: document.querySelector("#weeklyWindow"),
  weeklyStats: document.querySelector("#weeklyStats"),
  weeklyEvents: document.querySelector("#weeklyEvents"),
  scoreDeltaWindow: document.querySelector("#scoreDeltaWindow"),
  scoreDelta: document.querySelector("#scoreDelta"),
};

let data = null;
let eventTypes = [];
let dimensions = [];
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
    filtersSubtitle: "左侧控制筛选；榜单按公司最近 AI 动作排序。",
    insightsTitle: "核心观察",
    insightsSubtitle: "从本周净新增的公开信号里，提炼对 AI 咨询行业的核心观察。",
    wechatEyebrow: "Praxis Advisory",
    wechatTitle: "关注我们的微信公众号",
    wechatBody: "扫描二维码，获取 AI 咨询行动榜更新、欧洲企业看中国 AI 的研究观察，以及 Praxis Advisory 的最新内容。",
    weeklyTitle: "本周净新增事件",
    deltaTitle: "本周变化归因",
    methodTitle: "Method",
    methodCard1Title: "新闻证据层",
    methodCard1Body: "每条新闻记录日期、主体、事件类型、来源可信度与影响维度，用于说明公司最近做了什么，而不是直接给新闻本身打榜。",
    methodCard2Title: "AI 行动力评分",
    methodCard2Body: "重点看最近新闻动作，结合新鲜度、来源质量、动作强度与影响维度，评估一家公司近期把 AI 推进到真实工作流与组织动作中的力度。",
    reset: "重置",
    tierLabel: "公司类型",
    eventLabel: "事件类型",
    searchLabel: "搜索",
    searchPlaceholder: "公司、AI 动作、合作方",
    all: "全部",
    actionBoard: "AI 行动力评分榜",
    actionSubtitle: "根据最近新闻动作对公司的 AI 行动力进行评估，新闻本身不单独展示分数。"
  },
  en: {
    heroTitle: "AI Consulting Action Ranking",
    heroSubtitle: "This index does not start with brand prestige. It tracks which firms are turning AI into concrete moves across partnerships, platforms, service lines, M&A, organization, client value, and governance.",
    companyCountLabel: "traditional consulting / professional services firms",
    filtersTitle: "Filters",
    filtersSubtitle: "Use the left panel to filter. The board ranks firms by their most recent AI actions.",
    insightsTitle: "Key Observations",
    insightsSubtitle: "Core observations on the AI consulting industry, drawn from this week's net-new public signals.",
    wechatEyebrow: "Praxis Advisory",
    wechatTitle: "Follow Our WeChat Official Account",
    wechatBody: "Scan the QR code for leaderboard updates, research on how European companies read the China AI ecosystem, and the latest insights from Praxis Advisory.",
    weeklyTitle: "Net New Signals This Week",
    deltaTitle: "Weekly Rank Drivers",
    methodTitle: "Method",
    methodCard1Title: "Evidence layer",
    methodCard1Body: "Each event is logged with date, actor, event type, source credibility, and impacted dimensions to explain what a firm actually did.",
    methodCard2Title: "AI action score",
    methodCard2Body: "This score emphasizes recent actions, adjusting for freshness, source quality, signal strength, and impacted dimensions to estimate a firm's near-term execution intensity in AI.",
    reset: "Reset",
    tierLabel: "Firm Type",
    eventLabel: "Event Type",
    searchLabel: "Search",
    searchPlaceholder: "Firm, AI move, partner",
    all: "All",
    actionBoard: "AI Action Ranking",
    actionSubtitle: "Ranks firms by recent AI actions. News items are treated as evidence rather than scored as standalone entries."
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
    .replace("从 adoption 到 impact：AI 转型的三个层次", "From adoption to impact: Three horizons of AI transformation")
    .replace("重构客户体验：agentic era 下的 CX", "Rewiring customer experience for the agentic era")
    .replace("Rewired takes：规模化 AI 采纳的实战经验", "Rewired takes: Practical people lessons for scaling AI adoption")
    .replace("你不能站在场边领导 AI", "You can't lead AI from the sidelines")
    .replace("BCG 发布 Mid-2026 M&A Insights：AI drives a recovery, but questions remain", "BCG publishes Mid-2026 M&A Insights: AI drives a recovery, but questions remain")
    .replace("BCG 发布 CEO AI value survey：局部见效，但规模化仍然困难", "BCG publishes CEO AI value survey: benefits are visible, but scaling remains hard")
    .replace("BCG 发布 Is AI Computing Power Becoming a Commodity?", "BCG publishes Is AI Computing Power Becoming a Commodity?")
    .replace("KPMG 与 OpenAI 建立战略联盟，推进 AI-native enterprise workflows", "KPMG forms a strategic alliance with OpenAI to advance AI-native enterprise workflows")
    .replace("PwC 发布 The intelligent enterprise in action: AI and the next era of customer experience", "PwC publishes The intelligent enterprise in action: AI and the next era of customer experience")
    .replace("Capgemini 发布 Agentic AI in Sales and Operations Planning", "Capgemini publishes Agentic AI in Sales and Operations Planning")
    .replace("FTI 发布 The New Shelf Space: How AI Agents Are Rewiring Brand Discovery", "FTI publishes The New Shelf Space: How AI Agents Are Rewiring Brand Discovery")
    .replace("Roland Berger AI hub 在 7 月继续保持连续更新", "Roland Berger's AI hub continues to update throughout July")
    .replace("Oliver Wyman Forum 发布 The industrial AI divide", "Oliver Wyman Forum publishes The industrial AI divide")
    .replace("PwC 与 OpenAI 推出 agentic customer engagement and service 方案", "PwC and OpenAI launch agentic customer engagement and service solutions")
    .replace("Accenture 帮助欧盟 DG INTPA 将 AI Assistant 扩展到全球运营", "Accenture helps the European Commission's DG INTPA scale its AI Assistant across global operations")
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
    .replace("采用 Microsoft Agent 365 管理 AI agents 生命周期", "adopts Microsoft Agent 365 to manage the AI agent lifecycle")
    .replace("L.E.K. 发布《What B2B SaaS Leaders Can Learn From How AI Labs Price》", "L.E.K. publishes What B2B SaaS Leaders Can Learn From How AI Labs Price");
}

function translateEventSummary(text = "") {
  if (activeLanguage !== "en" || !text) return text;

  return text
    .replace("McKinsey 基于全球调研指出，组织要从个人采纳走向企业级价值捕获，关键在于重构工作流、重新设计岗位，并围绕 AI 可能创造最大价值的环节推进转型。这是很典型的 AI 思考力信号。", "McKinsey argues, based on global research, that organizations move from individual adoption to enterprise value capture by redesigning workflows, reshaping roles, and focusing transformation efforts on the parts of the business where AI can create the most value. This is a classic AI thought-leadership signal.")
    .replace("McKinsey 指出，随着 AI agents 参与实时决策，领先企业正在把客户体验从预设旅程重构为动态的跨渠道编排。这类内容把 AI 直接连接到经营与增长模式。", "McKinsey argues that as AI agents take on moment-to-moment decisions, leading companies are redesigning customer experience from predefined journeys to dynamic, cross-channel orchestration. This kind of content directly connects AI to operating and growth models.")
    .replace("McKinsey Senior Partner Brooke Weddle 讨论企业如何从试点走向规模化，强调 workflow redesign、operating model、领导力和文化。它更像是对企业 AI 转型的行动指南，而不只是观点摘要。", "McKinsey Senior Partner Brooke Weddle discusses how companies move from pilots to scale, emphasizing workflow redesign, operating model, leadership, and culture. It reads more like a practical guide to enterprise AI transformation than a summary of opinions.")
    .replace("McKinsey 指出 AI 已经从实验阶段进入运营现实，领导者需要亲自使用 AI 才能重塑工作方式、建立信任并推动规模化价值。它强化了麦肯锡在领导力和组织变革上的公开思考。", "McKinsey argues that AI has moved from experimentation into operational reality, and leaders need to use it directly if they want to reshape work, build trust, and scale value. It reinforces McKinsey's public thinking on leadership and organizational change.")
    .replace("BCG 于 2026-07-15 发布最新并购洞察，明确指出 AI 正在重塑竞争格局并驱动并购回暖。虽然主题落在 M&A，但核心论点是企业正因 AI 带来的能力重构与估值分化而加速交易决策，属于本周可确认的官方 thought leadership 信号。", "On 2026-07-15, BCG published new M&A insights arguing that AI is reshaping competitive dynamics and helping drive a rebound in deal activity. While framed through M&A, the core thesis is that AI-led capability shifts and valuation divergence are accelerating transaction decisions, making this a clearly dated official thought-leadership signal for the week.")
    .replace("BCG 于 2026-07-22 发布官方研究，指出近九成 CEO 已在部分业务中看到 AI 带来的成本或收入改善，但大多数企业仍在规模化落地上挣扎。这是一条很典型的管理层 AI 执行差距研究信号，适合纳入思考力与战略判断维度。", "On 2026-07-22, BCG published official research showing that nearly nine in ten CEOs are seeing some AI-related cost or revenue benefits in targeted areas, yet most companies still struggle to scale. This is a classic management-level signal on the execution gap in AI.")
    .replace("BCG 于 2026-07-23 发布 AI 计算资源专题文章，讨论算力市场正变得更透明、更可交易，并可能释放新的企业价值空间。它属于时间明确、主题直接指向 AI 基础设施与商业化路径的官方 thought leadership 信号。", "On 2026-07-23, BCG published a piece on AI compute markets, arguing that compute is becoming more transparent, liquid, and commercially meaningful. It is a clearly dated official thought-leadership signal focused on AI infrastructure and monetization.")
    .replace("KPMG 于 2026-07-21 官方宣布与 OpenAI 建立战略联盟，并被列为 OpenAI Partner Network 的 Elite Partner。公告强调将 AI 直接嵌入企业流程、SaaS 工具和公共部门解决方案，同时采用 forward deployed engineer 模式推动生产级落地，这是一条应当纳入正式榜单的强合作与交付信号。", "On 2026-07-21, KPMG officially announced a strategic alliance with OpenAI and was named an Elite Partner in the OpenAI Partner Network. The release emphasizes embedding AI directly into enterprise workflows, SaaS tools, and public-sector solutions, supported by a forward-deployed-engineer model for production deployment.")
    .replace("PwC 于 2026-07-22 发布 webcast，系统阐述如何把 AI 嵌入决策机制、客户体验与 enterprise-wide performance。内容强调 proprietary data、agents 与 humans 的协同编排，以及把零散试点转化为全企业绩效的能力，属于高质量的官方 thought leadership 信号。", "On 2026-07-22, PwC published a webcast on how to embed AI into decision-making, customer experience, and enterprise-wide performance. It emphasizes proprietary data, orchestration between agents and humans, and the ability to turn isolated pilots into enterprise performance, making it a high-quality official thought-leadership signal.")
    .replace("Capgemini 于 2026-07-23 发布 S&OP agentic AI 观点文章，讨论消费品牌如何借助 AI-powered adaptive planning 改善服务、降低成本并提升 forecast accuracy，同时预览其 S&OP Intelligence Co-Pilot。它不只是泛 AI 叙事，而是较明确的行业场景与解决方案信号。", "On 2026-07-23, Capgemini published a point of view on agentic AI in S&OP, explaining how consumer brands can use AI-powered adaptive planning to improve service, reduce cost, and improve forecast accuracy, while previewing its S&OP Intelligence Co-Pilot. This is more than a generic AI narrative; it is a fairly clear industry-use-case and solution signal.")
    .replace("FTI 于 2026-07-22 发布消费者与品牌研究，指出 AI-driven commerce 已成为结构性趋势，并提出 LLM shelf share、agentic replenishment 与信任治理等新议题。它横跨 consumer、go-to-market 与 private equity 价值创造，是一条很值得纳入的官方 thought leadership 信号。", "On 2026-07-22, FTI published a consumer and brand study arguing that AI-driven commerce is becoming a structural shift, and introducing themes such as LLM shelf share, agentic replenishment, and trust governance. It sits at the intersection of consumer, go-to-market, and private-equity value creation, making it a strong official thought-leadership signal.")
    .replace("基于 Roland Berger Artificial Intelligence hub 的最新公开更新时间线，可以确认其 AI / robotics / data 相关内容在 2026 年 7 月仍保持连续发布，最近几篇日期包括 7 月 23 日、7 月 16 日、7 月 14 日、7 月 9 日和 7 月 6 日。我们将其作为中等强度的 thought leadership 连续性信号纳入。", "Based on the public update cadence visible in Roland Berger's Artificial Intelligence hub, its AI, robotics, and data-related content was still being published continuously in July 2026, with recent dates including July 23, July 16, July 14, July 9, and July 6. We include this as a medium-strength continuity signal for thought leadership.")
    .replace("Oliver Wyman Forum 于 2026-07-14 发布交通、物流与国防行业 AI 竞争分化报告，强调 AI 已从 productivity tools 走向 operating-model-level advantage，并提出数据、治理、人才与董事会参与等企业级要求。这是一条时间明确、主题聚焦 AI 的官方 thought leadership 信号。", "On 2026-07-14, Oliver Wyman Forum published a report on AI-driven competitive divergence across transportation, logistics, and defense. It argues that AI has moved beyond productivity tools toward operating-model-level advantage, and highlights enterprise requirements around data, governance, talent, and board engagement. This is a clearly dated official AI thought-leadership signal.")
    .replace("PwC US 于 2026-07-15 官方宣布推出与 OpenAI 共建的 agentic contact and service solutions，把营销、销售、commerce 与 service 放进同一个 AI-enabled operating model，并设立专门的 Center of Excellence 加速客户部署。这是本周最强的官方合作与交付信号之一。", "On 2026-07-15, PwC US officially announced new agentic contact and service solutions built with OpenAI. The offer brings marketing, sales, commerce, and service into a single AI-enabled operating model, backed by a dedicated Center of Excellence to accelerate client deployment. It is one of the strongest official partnership and delivery signals of the week.")
    .replace("Accenture 于 2026-07-15 官方披露其为 European Commission DG INTPA 设计、构建并规模化 AI Assistant，服务已覆盖总部及全球 delegations，并形成 2,000+ regular users 与 400,000+ queries 的使用规模。这是本周非常强的 production-grade client proof。", "On 2026-07-15, Accenture officially disclosed that it designed, built, and scaled an AI Assistant for the European Commission's DG INTPA. The deployment now covers headquarters and global delegations, with more than 2,000 regular users and over 400,000 queries. This is a very strong production-grade client proof for the week.")
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
    .replace("OpenAI 与 Accenture 加速企业 reinvention", "OpenAI and Accenture accelerate enterprise reinvention")
    .replace("L.E.K. 于 2026-07-24 发布技术文章，讨论 AI labs 的定价逻辑与 B2B SaaS 可借鉴的商业模式启示，属于时间明确、主题明确的公开 thought leadership 信号。", "On 2026-07-24, L.E.K. published a technology article discussing AI labs' pricing logic and the commercial-model lessons B2B SaaS leaders can draw from it. It is a clearly dated and clearly themed public thought-leadership signal.")
    .replace("L.E.K. 官方 AI 洞察页持续发布医疗 IT、心理健康、广告、体育、生物制药等行业的 AI 应用文章。", "L.E.K.'s official AI insights page continues to publish articles on AI applications in healthcare IT, mental health, advertising, sports, biopharma, and other sectors.");
}

function localizedEventTitle(event) {
  if (activeLanguage === "en" && event.title_en) return event.title_en;
  return translateEventTitle(event.title);
}

function localizedEventSummary(event) {
  if (activeLanguage === "en" && event.summary_en) return event.summary_en;
  return translateEventSummary(event.summary);
}

function applyStaticTranslations() {
  if (els.heroTitle) els.heroTitle.textContent = t("heroTitle");
  if (els.heroSubtitle) els.heroSubtitle.textContent = t("heroSubtitle");
  if (els.companyCountLabel) els.companyCountLabel.textContent = t("companyCountLabel");
  if (els.filtersTitle) els.filtersTitle.textContent = t("filtersTitle");
  if (els.filtersSubtitle) els.filtersSubtitle.textContent = t("filtersSubtitle");
  if (els.insightsTitle) els.insightsTitle.textContent = t("insightsTitle");
  if (els.insightsSubtitle) els.insightsSubtitle.textContent = t("insightsSubtitle");
  if (els.wechatEyebrow) els.wechatEyebrow.textContent = t("wechatEyebrow");
  if (els.wechatTitle) els.wechatTitle.textContent = t("wechatTitle");
  if (els.wechatBody) els.wechatBody.textContent = t("wechatBody");
  if (els.weeklyTitle) els.weeklyTitle.textContent = t("weeklyTitle");
  if (els.deltaTitle) els.deltaTitle.textContent = t("deltaTitle");
  if (els.methodTitle) els.methodTitle.textContent = t("methodTitle");
  if (els.methodCard1Title) els.methodCard1Title.textContent = t("methodCard1Title");
  if (els.methodCard1Body) els.methodCard1Body.textContent = t("methodCard1Body");
  if (els.methodCard2Title) els.methodCard2Title.textContent = t("methodCard2Title");
  if (els.methodCard2Body) els.methodCard2Body.textContent = t("methodCard2Body");
  if (els.resetFilters) els.resetFilters.textContent = t("reset");
  if (els.tierLabel) els.tierLabel.textContent = t("tierLabel");
  if (els.eventLabel) els.eventLabel.textContent = t("eventLabel");
  if (els.searchLabel) els.searchLabel.textContent = t("searchLabel");
  if (els.searchInput) els.searchInput.placeholder = t("searchPlaceholder");
  if (els.scoreboardTitle) els.scoreboardTitle.textContent = t("actionBoard");
  if (els.scoreboardSubtitle) els.scoreboardSubtitle.textContent = t("actionSubtitle");
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

function buildInsights() {
  const weekly = collectWeeklyNetNewEvents();
  const en = activeLanguage === "en";

  if (!weekly.length) {
    return [
      {
        kicker: "Week in Review",
        accent: "#64748b",
        title: en ? "No new public AI signals this window" : "本窗口暂无净新增公开信号",
        body: en
          ? `No net-new public AI signals were added between ${comparisonStartDate()} and ${data.meta.updated_at}. Rankings still drift as older evidence ages, so a flat board usually means a quiet market rather than a broken pipeline.`
          : `${comparisonStartDate()} 至 ${data.meta.updated_at} 没有新纳入的公开 AI 信号。排名仍会随旧证据老化小幅变化，榜单持平通常说明市场安静，而不是采集失灵。`,
      },
    ];
  }

  const rows = actionRankedCompanies();
  const rankMap = buildEventDrivenRankMap(rows);
  const movers = rows
    .map((row, index) => {
      const currentRank = index + 1;
      const previousRank = rankMap.get(row.company.id) || currentRank;
      return { ...row, currentRank, previousRank, rankDelta: previousRank - currentRank };
    })
    .filter((item) => item.rankDelta !== 0)
    .sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta));
  const risers = movers.filter((item) => item.rankDelta > 0);
  const fallers = movers.filter((item) => item.rankDelta < 0);

  const typeCounts = weekly.reduce((acc, { event }) => {
    const label = typeLabel(event.type);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const [dominantType, dominantCount] = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topEventPair = [...weekly].sort((a, b) => (b.event.event_score ?? 0) - (a.event.event_score ?? 0))[0];
  const involvedFirms = [...new Set(weekly.map(({ company }) => company.name))];
  const quietFirms = data.companies
    .filter((company) => !weekly.some(({ company: weeklyCompany }) => weeklyCompany.id === company.id))
    .map((company) => company.name);

  const cards = [
    {
      kicker: "Week in Review",
      accent: "#2457ff",
      title: en
        ? `${weekly.length} new signals this window, led by ${dominantType}`
        : `本周 ${weekly.length} 条净新增信号，${dominantType}占主导`,
      body: en
        ? `Between ${comparisonStartDate()} and ${data.meta.updated_at}, ${involvedFirms.slice(0, 4).join(", ")} added ${weekly.length} verifiable public signals, ${dominantCount} of them ${dominantType} moves. That is where this week's narrative concentrates.`
        : `${comparisonStartDate()} 至 ${data.meta.updated_at}，${involvedFirms.slice(0, 4).join("、")} 等公司共新增 ${weekly.length} 条可溯源公开信号，其中 ${dominantCount} 条是${dominantType}类动作，构成本周叙事的重心。`,
    },
    {
      kicker: "Biggest Signal",
      accent: "#b42318",
      title: en
        ? `${topEventPair.company.name}: ${localizedEventTitle(topEventPair.event)}`
        : `${topEventPair.company.name}：${topEventPair.event.title}`,
      body: en
        ? `The strongest single signal of the window (event score ${topEventPair.event.event_score ?? "n/a"}). ${localizedEventSummary(topEventPair.event)}`
        : `本窗口单条最强信号（事件分 ${topEventPair.event.event_score ?? "n/a"}）。${topEventPair.event.summary}`,
    },
  ];

  if (risers.length) {
    const top = risers[0];
    cards.push({
      kicker: "Movers",
      accent: "#16a34a",
      title: en
        ? `${top.company.name} climbs ${top.rankDelta} ${top.rankDelta > 1 ? "spots" : "spot"} to #${top.currentRank}`
        : `${top.company.name} 上升 ${top.rankDelta} 位至第 ${top.currentRank} 名`,
      body: en
        ? `${risers.map((item) => `${item.company.name} (+${item.rankDelta})`).join(", ")} moved up on fresh evidence${fallers.length ? `, while ${fallers.map((item) => `${item.company.name} (-${Math.abs(item.rankDelta)})`).join(", ")} slipped as rivals added signals` : ""}. On this board, standing still means losing ground.`
        : `${risers.map((item) => `${item.company.name}（+${item.rankDelta}）`).join("、")} 凭新增证据上行${fallers.length ? `，${fallers.map((item) => `${item.company.name}（-${Math.abs(item.rankDelta)}）`).join("、")} 则因对手补证而回落` : ""}。在这张榜上，原地踏步就等于退步。`,
    });
  }

  if (quietFirms.length) {
    cards.push({
      kicker: "Quiet Firms",
      accent: "#ff8a00",
      title: en
        ? `${quietFirms.length} firms published no verifiable AI signal this window`
        : `${quietFirms.length} 家公司本周无新增公开信号`,
      body: en
        ? `${quietFirms.slice(0, 6).join(", ")}${quietFirms.length > 6 ? ", and others" : ""} added nothing verifiable in this window. Scores decay as evidence ages, so repeated quiet weeks cost rank even without negative news.`
        : `${quietFirms.slice(0, 6).join("、")}${quietFirms.length > 6 ? " 等" : ""}在本窗口没有可确认的公开动作。分数会随证据老化衰减，连续沉默会直接反映到排名上。`,
    });
  }

  return cards;
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
  const scoreLabel = activeLanguage === "en" ? "Action" : "行动力";
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
            <b>${row.action.toFixed(1)} <small>${scoreLabel}</small></b>
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
          <h4>${escapeHtml(localizedEventTitle(event))}</h4>
          <p>${escapeHtml(localizedEventSummary(event))}</p>
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
    latestEvent,
    latestTimestamp: latestEvent ? eventTimestamp(latestEvent.date) : 0,
  };
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
  const rows = actionRankedCompanies(companies);
  const previousRankMap = buildEventDrivenRankMap(rows);

  if (!rows.length) {
    els.scoreboard.innerHTML = `<div class="panel-title"><div><h2>${t("actionBoard")}</h2><p>${t("actionSubtitle")}</p></div></div><div class="empty">${activeLanguage === "zh" ? "没有匹配的公司。试试重置筛选，或搜索“OpenAI / Microsoft / agentic / IQ.AI”。" : "No matching firms. Try resetting filters or searching OpenAI, Microsoft, agentic, or IQ.AI."}</div>`;
    return;
  }

  els.scoreboardTitle.textContent = t("actionBoard");
  els.scoreboardSubtitle.textContent = t("actionSubtitle");

  els.scoreboard.innerHTML = `
    <div class="panel-title">
      <div>
        <h2>${escapeHtml(els.scoreboardTitle.textContent)}</h2>
        <p>${escapeHtml(els.scoreboardSubtitle.textContent)}</p>
      </div>
    </div>
    ${renderBoardControls()}
    ${renderRankNavigator(rows)}
  ` + rows
    .map((row, index) => renderActionCard(row, index + 1, previousRankMap))
    .join("");

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

function renderAll() {
  renderScoreboard();
  renderInsights();
  renderWeeklyEvents();
  renderScoreDelta();
}

function resetFilters() {
  els.tierFilter.value = "all";
  els.eventFilter.value = "all";
  els.searchInput.value = "";
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
    els.methodIntro.textContent = `我们不对单条新闻做公开排名，而是把新闻与公开报告作为证据，映射到公司的 AI 行动力评分，并公开展示证据厚度、待核验状态与覆盖置信度。当前方法参照 ${data.meta.scoring_model_file || "SCORING_MODEL.md"}。`;
  }

  populateFilters();
  refreshFilterOptionLabels();
  renderLegend();
  renderAll();

  els.tierFilter.addEventListener("change", renderAll);
  els.eventFilter.addEventListener("change", renderAll);
  els.searchInput.addEventListener("input", renderAll);
  els.resetFilters.addEventListener("click", resetFilters);
  els.langZh?.addEventListener("click", () => {
    activeLanguage = "zh";
    syncLanguageInUrl();
    applyStaticTranslations();
    refreshFilterOptionLabels();
    renderScoreboard();
  });
  els.langEn?.addEventListener("click", () => {
    activeLanguage = "en";
    syncLanguageInUrl();
    applyStaticTranslations();
    refreshFilterOptionLabels();
    renderScoreboard();
  });
}

init().catch((error) => {
  els.scoreboard.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});

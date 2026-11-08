# 周更搜索 SOP（Standard Operating Procedure）

> 本文档固化 AI咨询行动榜 周更信息采集的完整逻辑：渠道矩阵、查询设计、去重规则、核实标准、打分校准、写入纪律与防错清单。
> 所有规则都来自实战教训（每条标注出处案例）。配套文件：`data/sources.json`（渠道与查询矩阵的机器可读版）、`SCORING_MODEL.md`（打分方法）、`DATA_SCHEMA.md`（数据结构）。
> 版本：v1.0 · 2026-11-08 · 维护人：榜单运营（AI 辅助）

---

## 0. 三层质量目标

| 目标 | 含义 | 主要保障手段 |
|---|---|---|
| **全面性** | 不漏掉重要信号，不论它发布在哪个渠道 | 五层信源矩阵 + 查询矩阵（按公司梯队 × 专项维度）+ miss log 防再犯 |
| **准确度** | 入榜的每条事件日期准确、来源可核验、分数可解释 | 查重规则 + 日期交叉验证 + 来源分级 + 锚点打分 + 同类校准 |
| **效率** | 单位产出的时间与 token 成本持续下降 | 渠道分级调度（RSS 便宜先跑）、边际产出审计、可复现查询固化 |

---

## 1. 执行顺序（周更 runbook，全流程约 1.5–2.5 小时）

```
Step 0  基线确认（5 分钟）
Step 1  RSS 查询矩阵执行（10 分钟，6–7 条并发 curl）
Step 2  WebSearch 定向核实与补充（4–6 条，20–30 分钟）
Step 3  查重（5 分钟）
Step 4  核实与日期交叉验证（10–20 分钟）
Step 5  打分（同类校准法，10 分钟）
Step 6  写入与构建（10 分钟，格式纪律见 §5）
Step 7  页面验证（10 分钟，清单见 §6）
Step 8  提交与推送（10 分钟，顺序见 §7）
```

### Step 0 基线确认
- `node -e` 读当前快照的 `meta.updated_at` 与事件总数——**净新增窗口 = (上一快照日, 本期快照日]**；
- 列出仅年份日期的存根事件（`/^\d{4}$/`），存根**不得视为已覆盖**（Deloitte State of AI 教训：存根让查重误判"已覆盖"，漏检五个月）。

### Step 1 RSS 查询矩阵（第一轮，最便宜且最快）
查询矩阵固化在 `data/sources.json → rss_query_matrix`，每条是一个可复现的 Google News RSS URL：

```
https://news.google.com/rss/search?q={QUERY}&hl=en-US&gl=US&ceid=US:en
```

| ID | 查询 | 窗口 | 设计理由 |
|---|---|---|---|
| Q1 | `Bain "AI" when:14d`（MBB/四大逐家替换） | 14d | 大公司逐家扫 |
| Q2 | `"Oliver Wyman" AI when:14d` | 14d | 专业服务单独扫 |
| Q3 | `"Kearney" OR "Roland Berger" AI when:14d` | 14d | 同上，合并以省请求 |
| Q4 | `"FTI Consulting" OR "Alvarez & Marsal" AI when:14d` | 14d | 同上 |
| Q5 | `"L.E.K." OR "Strategy&" OR "Monitor Deloitte" AI when:14d` | 14d | 同上 |
| Q6 | `consulting (acquires OR acquisition) AI when:30d` | 30d | 并购专项（窗口放宽防漏） |
| Q7 | `(appoints OR hires OR joins) AI chief OR partner when:14d` + 公司名 | 14d | 人才专项 |

**查询词设计技巧（全部实战得来）：**
- 公司名必须加引号：`"L.E.K."` 不加引号会命中 Britannica 的动物条目（实际发生）；`Strategy&` 要转义为 `Strategy%26`；
- RSS 一次请求返回 10–70 条且自带日期，**单条成本远低于 WebSearch**——先用 RSS 探测，再用 WebSearch 查证与补漏；
- `when:14d` 覆盖常规周更 + 上期漏检；并购用 30d；
- 2026-11-08 首轮实战：6 条查询约 2 分钟，捕获 16 条事件（其中覆盖薄公司 14 条）。

### Step 2 WebSearch 定向核实与补充
RSS 负责"发现"，WebSearch 负责：
- **查证传闻**（日期、数字、是否真实发生）——如 Accenture "10-28 财报"传闻靠财年日历排除；
- **补综合背景**（一份报告的版本沿革、同源判断）；
- **渠道外触达**（Reuters/FT 的深度报道、厂商生态公告）。
每期 4–6 条为宜，问法带具体日期范围（`October 27-31 2026`）提高命中率。

### Step 3 查重
- 用**标题 + summary + title_en 拼接后小写关键词匹配**查重（Python/Node 一次性脚本）；
- 关键词要含：报告名、人名、合作方名、数字特征；
- 三条特殊规则：
  1. **存根不豁免**：仅年份日期的旧条目命中后，要做"补全"而非"跳过"；
  2. **二次传播不入榜**：行业媒体对公司既有发布的转引直接跳过（EY-Parthenon 10-28 转引案例），回溯官方原始发布；
  3. **合作方渠道命中 ≠ 公司已覆盖**：TalentNeuron 公告在合作方渠道首发，新闻室扫不到。

### Step 4 核实与日期交叉验证
- **来源分级**（入榜要求）：官方 newsroom/press release = `official`；合作方官方公告 = `vendor_official`；媒体报道 = `media`（需 confidence 高且至少两家独立报道）；
- **日期验证**：发布日期必须落在声称的窗口内；与公司日历交叉验证（Accenture 财报传闻因"Q1 应 12 月发布"被正确拦截）；
- **同源判断**：一份调查的多个发布节点合并为一条事件（EY-Parthenon 10-01/10-07 案）；
- 无法核实日期 → `watch_only` 入候选池，**宁缺毋滥**。

### Step 5 打分（同类校准法）
打分前**先查库内同类事件的分数带**，再套锚点：

| 事件类型 | 锚点带 | 校准基准例 |
|---|---|---|
| 财报/指引上调（AI 驱动） | 82–84 | Capgemini 7 月 84、10 月 82 |
| 旗舰年度研究/指数 | 76–82 | McKinsey State of AI 86、BCG Applied AI Index 82、Maturity Matrix 80 |
| 数据型合作联盟 | 72–78 | EY×CrowdStrike 78、Kearney×Qloo 72、BCG×TalentNeuron 74 |
| 平台部署/规模化 | 76–78 | KPMG 30 国审计 AI 76、Deloitte 合规工具 78 |
| 人事（按职级） | 60–78 | 全球首任 C-AIO 78、区域 AI 平台负责人 66 |
| 常规专题研究 | 68–74 | 各家 insights 常规篇 |
| 品牌活动/论坛 | 60–62 | Deloitte AI Forum 62、EY AI Week 60 |
| 第三方榜单/评级 | **不计分** | IDC MarketScape 等 |

**防刷水双保险**（用户明确要求）：① 全局位置衰减 1/(1+0.45n)——第 10 条只剩 19% 贡献；② 维度内低强度事件（<50 分）只取前 3 条（待实现）。原则：**发得多只证明活跃，证明不了强**。

### Step 6 写入与构建（格式纪律）
- 轮次文件：`data/events/YYYY-MM-DD.json`，**必须是 `{"meta": {...}, "events": [...]}`**——裸数组会被 `build-data.js` **静默跳过**（2026-11-07 期曾因此漏掉 4 条，教训见 §6）；
- 字段完整性：`company_id/date/type/title/title_en/summary/summary_en/url/source_level/confidence/discovery_channel/verification_status/event_score/dimension_tags` 一个都不能少（builder 会对缺 company_id 报错，其他字段缺了不报错——自己核对）；
- `discovery_channel` 必须留痕（渠道产出率审计的依据）；
- 回填规则：事件日期属于哪个窗口就进哪个轮次文件；**meta 已前移时**，用"同快照日期后提交覆盖"机制：先把 meta 拨回旧期 → build → commit → 重建历史 → 再把 meta 拨到本期 → build → commit；
- 构建顺序：`build-data.js` → `rank.js`（检查榜单）→ **先 commit 数据** → `build-rank-history.js`（读的是 git 已提交快照！）→ commit 历史。

### Step 7 页面验证清单（缺一不可）
1. 本地服务起在项目根（`python3 -m http.server 8901`），访问 `/static/index.html`；
2. **本期每一条新事件，逐条在页面上确认出现**（"Capgemini 上页面 false"的教训——分数变了但事件没进，说明构建层有静默丢弃）；
3. 前三名分数与 `rank.js` 输出逐位一致；
4. 历史页期数 +1、最新期日期正确（页面把日期渲染成 `11/7` 格式，字符串检查要用页面格式）；
5. 维度页抽查一家公司的雷达变化是否符合预期；
6. 无 JS 错误。

### Step 8 提交与推送
- 两个 commit：数据（round 文件 + intake + config + built JSON）→ 历史（rank-history.json）；
- push 失败重试模式：`git -c http.version=HTTP/1.1 push origin main`，间隔 20–60 秒重试 2–3 次（HTTP2 framing / Empty reply 是已知的瞬时网络问题）；
- 推送成功 = Netlify 自动部署；表单类功能依赖部署时注册。

---

## 2. 渠道分级与调度（详见 data/sources.json）

| 层 | 渠道 | 频次 | 实战价值 |
|---|---|---|---|
| T1 官方一手 | newsroom（17 家）、insights 直取、IR 日历、案例页/careers 基线 | 每周 | 主干；insights 直取修复了全部白皮书漏检 |
| T2 合作方生态 | OpenAI/Anthropic/Microsoft/Google/ServiceNow/CrowdStrike 等公告页 | 每周 | TalentNeuron 漏检的修复渠道 |
| T3 贸易媒体与聚合 | **Google News RSS**、Consultancy.uk/.us/.me、PR Newswire/Business Wire、Reuters/FT | 每周 | 人才任命与 M&A 首发地（OW Badman、PwC Priest 线索来源）；RSS 首轮即捕获 6 条 |
| T4 结构化第三方 | 分析师机构、事件日历、政府合同记录 | 月度/事件驱动 | 校准用，不计分 |
| T5 中文本土 | 36氪/晚点/财新、本土公众号 | 样本扩展时激活 | 本土机构样本加入后为主渠道 |

**调度原则**：RSS 先跑（便宜、快、自带日期）→ WebSearch 查证 → 官方页直取核实 → 浏览器兜底（Akamai/Cloudflare 拦截时，BCG/Bain 新闻室实战验证过）。

---

## 3. 负向信号（2026-11-08 决策）

争议/诉讼/质量事故类负向信号**不入池、不计分、不披露**——榜单衡量正向行动力，负面评估留给市场。RSS 遇到此类内容直接忽略（FT 报道 Accenture 论文幻觉一案已按此关闭）。

---

## 4. 效率审计

- **边际产出**：连续 4 周零产出的渠道降级为月度（sources.json review_cadence）；
- **成本结构**：确定性计算零 token（build/rank/history 全脚本化）；token 花在检索、筛选、摘要、核实；
- **下一步自动化**（未做）：RSS 拉取已验证可脚本化（curl 循环 + 正则解析），可设为每周定时任务跑发现、人工只做核实与打分；careers 页岗位数基线比对同样可脚本化。

---

## 5. 漏检记录（miss log，持续追加）

| 日期 | 漏检事件 | 根因 | 修复渠道 |
|---|---|---|---|
| 09-30 | BCG Applied AI Index | 仅扫新闻室 | insights 直取 |
| 10-06 | Deloitte State of AI 美国区发布 | 存根被查重误判已覆盖 | insights 直取 + 存根补全规则 |
| 10-19 | BCG × TalentNeuron 合作 | 公告首发于合作方渠道 | 合作方渠道 + PR wires |
| 10-20 | BCG AI Maturity Matrix | 仅扫新闻室 | insights 直取 |
| 10-01/07 | EY-Parthenon CEO Outlook | 仅扫新闻室 | insights 直取 |
| 10-23/27 | L.E.K. 临床试验 AI、消费者 GEO 调查 | 仅扫新闻室 | RSS 矩阵 |
| 11-01/05 | Deloitte 合规工具、McKinsey 风险职能、BCG 保险蓝图等 6 条 | 仅扫新闻室 | Google News RSS |

每条新漏检：先补数（按窗口归属回填），再追根因（渠道缺口 or 流程缺口），最后更新本文件与 sources.json。

---

## 6. 防错清单（每一条都真实发生过）

1. **裸数组格式**：events 轮次文件写 `{events:[...]}`，写完必跑 build 核对总数（11-07 期曾静默丢 4 条）；
2. **历史重建顺序**：build-rank-history 读 git 已提交快照——先 commit 数据再重建历史；
3. **页面逐条验证**：分数对 ≠ 事件在（构建层可能静默丢弃）；
4. **存根豁免**：仅年份日期的条目命中查重 → 走补全不走跳过；
5. **日历交叉验证**：财报类传闻先对公司财年日历（Accenture Q1 是 12 月报，不是 10 月）；
6. **公司名歧义**：RSS 查询公司名加引号（L.E.K. 会命中动物条目；Strategy& 要转义）；
7. **多账号/多站点**：本地预览（127.0.0.1）与线上（Netlify）行为不同，表单类验证必须在线上做；
8. **限流按账号**：未来登录体系按账号/浏览器限流，不按 IP（Cloudflare 后面 IP 不准）。

---

## 7. 覆盖缺口与下一步（截至 v1.0）

- 17 家中事件数 <10 的：Monitor Deloitte、Strategy&（品牌观察条目为主，属集团子品牌，低优先）、Roland Berger、Kearney、A&M——Kearney/RB/FTI/OW 本轮已大幅补齐，A&M 两周无产出持续观察；
- 存根事件补日期：Quotient 上线日、AI @ Scale 发布日等（顺手工作，周更时遇到就查）；
- careers 页岗位数基线：已设计未执行（月度任务）；
- 本土机构样本：Tier 5 渠道待激活（与覆盖扩展至 50 家的计划绑定）。

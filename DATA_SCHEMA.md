# 数据结构说明

## 顶层字段

- `meta`：产品名、版本、上一版快照时间、更新时间、状态说明。
- `dimensions`：9 个评分维度及其权重。
- `event_types`：AI 动作类型标签。
- `companies`：公司清单。

## 日采集暂存层

建议在 `data/daily-intake/` 下按日期存放每日研究结果，例如：

- `data/daily-intake/2026-06-29.json`
- `data/daily-intake/2026-07-13.json`
- `data/daily-intake/_template.json`

该层的目的不是立刻改榜，而是把当天研究到的候选事件先沉淀下来，供下一次周更时统一筛选、去重、合并。

建议把这里视为唯一的“外部新闻候选池”入口。今后你手工补充新闻，也直接往这个目录里按日期新建或追加即可，而不是直接改正式榜单 JSON。

### 推荐工作流

1. 采集：每天或每周把新发现的新闻先写入 `data/daily-intake/YYYY-MM-DD.json`
2. 初筛：对每条候选事件补齐公司映射、事件类型、维度标签、来源等级、置信度与合并建议
3. 周更：只把 `merge_recommendation = review_for_merge` 且满足时间/去重条件的事件并入正式榜单
4. 留痕：保留未入榜项目，作为 `hold` / `skip` / `watch` 历史池，方便下次复核

### 正式榜单合并口径

候选池中的新闻并不会自动加分。进入 `data/ai-consulting-leaderboard.json` 前，至少应满足：

- 发布时间晚于正式榜单上次快照
- 与正式榜单现有事件不重复
- 公司归属可以明确映射
- 至少有可解释的事件类型与维度影响
- 来源与置信度达到可入榜标准，或明确标注为待复核

### `daily-intake` 顶层字段

- `meta.research_date`：本次采集日期。
- `meta.timezone`：采集使用的时区。
- `meta.leaderboard_snapshot_date`：当前正式榜单最近一次 `meta.updated_at`，用于判断候选事件是否晚于正式快照。
- `meta.status`：建议使用 `staging`。
- `meta.collection_method`：说明本次采集使用的工具或回退方式。
- `meta.notes`：对当天采集覆盖范围、缺口或口径做简短说明。
- `items`：当天候选事件列表。

### `daily-intake` 事件字段

- `id`：候选事件唯一 ID。
- `published_at`：来源发布日期。
- `discovered_at`：纳入日采集池的日期。
- `scope`：`company` / `multi_company` / `sector`。
- `company_ids`：关联到榜单中的公司 ID 列表；纯行业观察可为空数组。
- `company_names`：关联公司名列表，便于人工阅读。
- `candidate_event_type`：候选事件类型，建议沿用正式榜单的事件类型枚举。
- `title`：候选事件标题。
- `summary`：事件摘要。
- `why_it_matters`：为什么值得后续周更时复核或纳入。
- `url`：来源链接。
- `source_level`：来源可信度。
- `confidence`：当前事件置信度。
- `discovery_channel`：发现渠道，例如 `tavily_search` / `web_search_fallback`。
- `verification_status`：例如 `pending` / `partially_verified` / `verified`。
- `dimension_tags`：建议影响到的维度标签。
- `merge_recommendation`：建议值可用 `review_for_merge` / `hold` / `skip`。
- `merge_rationale`：说明为什么建议并入或暂不并入正式榜单。
- `leaderboard_action`：建议值可用 `new_candidate` / `duplicate_of_leaderboard` / `watch_only`，便于区分“候选新增”“重复检索”“仅观察”。
- `matched_leaderboard_event_id`：如果判断为重复项，可记录正式榜单中对应事件 ID。

## 公司字段

- `id`：公司内部 ID。
- `name`：英文名。
- `cn`：中文名。
- `tier`：公司类型。
- `parent`：母公司或品牌归属；没有则为 `null`。
- `brand_note`：品牌说明，例如 Strategy& 归属 PwC。
- `focus`：AI 动作关注点。
- `confidence`：整体置信度：`high` / `medium` / `low`。
- `scores`：9 个维度的 0–5 provisional score。
- `notes`：人工观察摘要。
- `reports`：公开 AI 报告 / 洞察列表，用于体现公司在 AI 议题上的持续研究与公开表达。
- `coverage`：当前公司样本的覆盖质量信息，用于说明证据是否足够厚、是否存在公开披露偏差。
- `events`：AI 动作事件列表。

## 事件字段

- `date`：事件日期，格式建议 `YYYY-MM-DD`；不完整可用年份。
- `type`：事件类型，对应 `event_types.id`。
- `title`：事件标题。
- `summary`：事件摘要。
- `url`：来源链接。
- `source_level`：来源可信度，例如 `official` / `official_press_release` / `vendor_official` / `media`。
- `confidence`：事件置信度：`high` / `medium` / `low`。
- `discovery_channel`：发现渠道，例如 `company_official` / `partner_official` / `media_search` / `research_page`。
- `verification_status`：核验状态，例如 `verified` / `partially_verified` / `pending`。
- `discovery_channel` 与 `verification_status` 在周更时尤其重要，用来区分“新发现的净增量”与“旧事件的重复传播”。

## Meta 字段补充

- `meta.previous_updated_at`：上一版样本库的更新时间，用作本周净新增事件和排名变化的比较基准。
- `meta.updated_at`：当前样本库的更新时间。
- `meta.method_note`：当前这次周更的纳入口径说明。

## 报告字段

- `title`：报告或研究标题。
- `date`：发布日期，格式建议 `YYYY-MM-DD`；不完整可用年份。
- `publisher`：发布主体，通常为公司官方研究院、insights 团队或专题栏目。
- `url`：报告或报告专题链接。
- `source_level`：来源可信度，公开报告默认应优先使用 `official`。
- `summary`：一句话说明这份报告体现了什么 AI 思考框架、行业判断或方法论。

## 覆盖字段

- `coverage_confidence`：当前公司样本的覆盖置信度，建议为 `high` / `medium` / `low`。
- `evidence_density`：证据厚度，可按 `high` / `medium` / `low` 标注。
- `notes`：说明当前证据是否主要来自官网、合作方、研究页，或是否仍存在公开披露偏差。

## 当前评分维度

| ID | 名称 | 权重 |
|---|---:|---:|
| strategy_signal | 战略信号 | 0.14 |
| tech_partnership | 科技合作深度 | 0.13 |
| proprietary_assets | 自有 AI 平台与技术资产 | 0.14 |
| delivery_production | AI 交付与生产化能力 | 0.15 |
| capital_ma | 并购与资本动作 | 0.08 |
| industry_coverage | 行业场景覆盖 | 0.10 |
| client_value_proof | 客户价值证明 | 0.12 |
| governance_risk | AI 治理与风险能力 | 0.14 |
| thought_leadership | AI 思考力 / 公开研究信号 | 0.10 |

## 当前事件类型

| ID | 标签 |
|---|---|
| partnership | 科技合作 |
| platform | 平台/工具 |
| service_line | AI 服务线 |
| investment | 投资/并购 |
| organization | 组织/岗位 |
| governance | 治理/风控 |
| research | 研究/指数 |
| client_proof | 客户证明 |

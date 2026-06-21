# 数据结构说明

## 顶层字段

- `meta`：产品名、版本、更新时间、状态说明。
- `dimensions`：8 个评分维度及其权重。
- `event_types`：AI 动作类型标签。
- `companies`：公司清单。

## 公司字段

- `id`：公司内部 ID。
- `name`：英文名。
- `cn`：中文名。
- `tier`：公司类型。
- `parent`：母公司或品牌归属；没有则为 `null`。
- `brand_note`：品牌说明，例如 Strategy& 归属 PwC。
- `focus`：AI 动作关注点。
- `confidence`：整体置信度：`high` / `medium` / `low`。
- `scores`：8 个维度的 0–5 provisional score。
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

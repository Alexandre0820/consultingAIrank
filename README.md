# AI咨询行动榜

`AI咨询行动榜 / AI Consulting Signal Index` 是一个独立 MVP，用于预览“传统咨询 / 专业服务公司的 AI 动作追踪”产品。

它和 `my-ai-consulting-kb/mvp/` 里的 **AI 咨询知识分身** 是两个不同项目：

- **AI 咨询知识分身**：面向知识库、问答、研究助理和知识沉淀。
- **AI咨询行动榜**：面向公司清单、AI 事件时间线、评分维度、来源链接和排行榜预览。

本目录只保留运行 AI咨询行动榜 所需的文件。

## 目录结构

```text
AI咨询行动榜/
  app.py
  data/
    ai-consulting-leaderboard.json
    companies.json
    config.json
    events/
      archive.json
      YYYY-MM-DD.json
    daily-intake/
      _template.json
      YYYY-MM-DD.json
  scripts/
    build-data.js
    rank.js
  static/
    index.html
    styles.css
    app.js
  README.md
  DEPLOY.md
  DATA_SCHEMA.md
  PROJECT_SEPARATION.md
  start-local.sh
  requirements.txt
```

## 当前 MVP 覆盖

页面自 2026-09-19 起为简化版架构，只保留一个公开榜单：

- **AI 行动力评分榜**（唯一主榜）：17 家传统咨询 / 专业服务公司，按最近新闻动作评分排序，含名次变化、证据展开与 Top 10 导航。
- **核心观察**：完全由本周净新增事件自动提炼（本周综述、最强单条信号、排名升降、沉默公司），随周更自动更新，无需手工维护总结文案。
- **本周净新增事件 / 本周变化归因**：展示比较窗口内新入库的公开 AI 信号与排名上升公司。
- **Method**：新闻证据层 + AI 行动力评分两卡说明。

每条事件包含日期、类型、标题、摘要、来源 URL、来源可信度和置信度。事件类型共 8 类（科技合作、平台/工具、AI 服务线、投资/并购、组织/岗位、治理/风控、研究/指数、客户证明）。

已于 2026-09-19 下线的板块：综合能力评分榜（旧版依赖 2026-08-02 之前的人工九维分，长期不随周更变化）、新闻横向总结、评分维度展示、Coverage 栏目。相关数据与模型文档仍保留在数据层和 SCORING_MODEL.md 中，供将来重启综合评分时使用。

## 数据文件怎么分工

- `data/ai-consulting-leaderboard.json`：前端读取的构建产物，不建议手工维护
- `data/config.json`：榜单 meta、评分维度和事件类型
- `data/companies.json`：公司基础资料、长期能力、报告和人工维度分
- `data/events/archive.json`：历史累计事件，过去的事件沉淀在这里，平时不需要反复查看
- `data/events/YYYY-MM-DD.json`：某次周更正式并入的新增事件
- `data/daily-intake/YYYY-MM-DD.json`：外部新闻候选池，先收集、后筛选、周更时再并入正式榜单
- `research/`：研究备忘或人工资料，不直接参与页面渲染和评分计算

你以后如果要手工补新闻，直接放这里：

`/Users/shengyun/lobsterai/project/AI咨询行动榜/data/daily-intake/YYYY-MM-DD.json`

推荐从这个模板复制一份开始填：

`/Users/shengyun/lobsterai/project/AI咨询行动榜/data/daily-intake/_template.json`

## 周更维护流程

1. 把当天或本周候选新闻写入 `data/daily-intake/YYYY-MM-DD.json`。
2. 复核后，把正式纳入的事件追加到 `data/events/YYYY-MM-DD.json`。
3. 如果公司长期底座变化，例如 thought leadership 维度、报告列表、公司 notes，更新 `data/companies.json`。
4. 运行构建脚本生成前端读取的数据：

```bash
node scripts/build-data.js
node scripts/rank.js
```

`scripts/rank.js` 会用与前端一致的行动榜口径输出最新排名，方便推送前检查。

## 本地启动

```bash
cd /Users/shengyun/lobsterai/project/AI咨询行动榜
python3 app.py
```

启动后访问：

```text
http://127.0.0.1:8765/
http://127.0.0.1:8765/api/leaderboard
http://127.0.0.1:8765/data/ai-consulting-leaderboard.json
http://127.0.0.1:8765/api/health
```

如果终端提示端口被占用，改用 8766：

```bash
PORT=8766 python3 app.py
```

然后访问：

```text
http://127.0.0.1:8766/
```

也可以直接执行：

```bash
bash start-local.sh
```

## 重要说明

当前页面是 **研究预览版 / 非最终排名**。

分数是人工 provisional score，用于验证产品结构和评分框架，不代表权威排名。公开前需要补充：

- 自动采集和去重规则。
- 来源可信度权重。
- 事件置信度说明。
- 品牌拆分规则，例如 Strategy&、Monitor Deloitte 是否独立计分。
- 更细的评分规则说明。
- 中英文双语标签。
- 综合能力评分如需重启展示，须先完成 `data/companies.json` 中九维分与四因子分的整体重估（当前人工分停留在 2026-08-02 之前，且头部公司几乎全为满分）。

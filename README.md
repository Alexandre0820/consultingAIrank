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
    daily-intake/
      _template.json
      YYYY-MM-DD.json
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

- 17 家传统咨询 / 专业服务公司底表。
- 9 个评分维度：
  - 战略信号
  - 科技合作深度
  - 自有 AI 平台与技术资产
  - AI 交付与生产化能力
  - 并购与资本动作
  - 行业场景覆盖
  - 客户价值证明
  - AI 治理与风险能力
  - AI 思考力 / 公开研究信号
- 事件类型：
  - 科技合作
  - 平台/工具
  - AI 服务线
  - 投资/并购
  - 组织/岗位
  - 治理/风控
  - 研究/指数
  - 客户证明
- 每条事件包含日期、类型、标题、摘要、来源 URL、来源可信度和置信度。

## 数据文件怎么分工

- `data/ai-consulting-leaderboard.json`：正式榜单唯一数据源，前端和 HTTP 服务都只读这一份
- `data/daily-intake/YYYY-MM-DD.json`：外部新闻候选池，先收集、后筛选、周更时再并入正式榜单
- `research/`：研究备忘或人工资料，不直接参与页面渲染和评分计算

你以后如果要手工补新闻，直接放这里：

`/Users/shengyun/lobsterai/project/AI咨询行动榜/data/daily-intake/YYYY-MM-DD.json`

推荐从这个模板复制一份开始填：

`/Users/shengyun/lobsterai/project/AI咨询行动榜/data/daily-intake/_template.json`

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
- “排行榜”和“行动榜”双视图。

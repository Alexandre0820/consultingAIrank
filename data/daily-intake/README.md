# daily-intake 候选新闻池

这个目录是 AI咨询行动榜 的外部新闻候选池。

## 你以后往哪里加新闻

请直接新建或追加：

- `data/daily-intake/YYYY-MM-DD.json`

例如：

- `data/daily-intake/2026-07-13.json`
- `data/daily-intake/2026-07-20.json`

推荐直接复制：

- `data/daily-intake/_template.json`

## 这一层和正式榜单的区别

- `data/daily-intake/`：候选池，先收集、先标注，不直接改分
- `data/ai-consulting-leaderboard.json`：正式榜单，只放已经确认并入的事件

## 一条新闻进入正式榜单前，至少要过这几关

1. 能明确映射到榜单中的公司
2. 有合适的事件类型
3. 有基础的维度标签
4. 来源等级和置信度可解释
5. 不是正式榜单里已经存在的重复事件
6. 如果用于周更净新增，发布时间应晚于当前正式快照

## 建议字段状态

- `merge_recommendation = review_for_merge`：下次周更优先复核
- `merge_recommendation = hold`：先观察，暂不入榜
- `merge_recommendation = skip`：重复项或不建议入榜

- `leaderboard_action = new_candidate`：新候选
- `leaderboard_action = duplicate_of_leaderboard`：和正式榜单重复
- `leaderboard_action = watch_only`：仅观察，不作为本周净新增

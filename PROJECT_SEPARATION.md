# 项目分离说明

`AI咨询行动榜` 已经从原来的 `my-ai-consulting-kb/mvp/` 中拆出为独立目录：

```text
/Users/shengyun/lobsterai/project/AI咨询行动榜/
```

分离原则：

1. 本目录只放 AI咨询行动榜 运行所需文件。
2. 不依赖知识分身 MVP 的页面、脚本或数据。
3. 页面中不再出现“知识分身”导航。
4. 数据文件为 `data/ai-consulting-leaderboard.json`。
5. 本地入口为 `python3 app.py`。
6. 对外 API 为 `/api/leaderboard` 和 `/data/ai-consulting-leaderboard.json`。

原 `my-ai-consulting-kb/mvp/` 仍可作为知识分身项目保留；后续如要清理，需要单独确认。

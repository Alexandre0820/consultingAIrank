# AI咨询行动榜 部署说明

## 1. 项目边界

`AI咨询行动榜` 是独立项目，不依赖 `my-ai-consulting-kb/mvp/` 中的知识分身页面。

原 MVP 目录仍可保留，用于知识分身；本目录用于 AI咨询行动榜 standalone MVP。

## 2. 本地运行

```bash
cd /Users/shengyun/lobsterai/project/AI咨询行动榜
python3 app.py
```

默认端口：`8765`。

如果终端提示端口被占用，说明 `8765` 很可能还在跑知识分身 MVP 或其他服务。改用：

```bash
PORT=8766 python3 app.py
```

然后访问：

```text
http://127.0.0.1:8766/
http://127.0.0.1:8766/api/health
```

健康检查应返回：

```json
{
  "ok": true,
  "project": "AI咨询行动榜",
  "companies": 17,
  "dimensions": 8,
  "event_types": 8
}
```

## 3. 环境变量

可选：

```bash
HOST=127.0.0.1 PORT=8765 python3 app.py
```

## 4. 部署到 Netlify

这个项目现在可以直接作为静态站点部署到 Netlify，不需要在 Netlify 上运行 Python。

### 推荐方式：GitHub + Netlify 持续部署

1. 把当前项目推到一个 GitHub repository。
2. 在 Netlify 里选择 `Add new project` -> `Import an existing project`。
3. 连接 GitHub，并选择这个 repository。
4. 构建设置使用：

```text
Base directory: (留空)
Build command: (留空)
Publish directory: .
```

5. 点击部署。

项目根目录已经包含 `netlify.toml`，会把 `/` 路由到 `/static/index.html`。

### 更快方式：手动拖拽部署

如果你暂时不想先放 GitHub，也可以直接在 Netlify 后台使用手动部署：

1. 进入 Netlify dashboard。
2. 选择 `Add new project` -> `Deploy manually`。
3. 把整个 `AI咨询行动榜` 目录拖进去上传。

Netlify 会直接把根目录作为静态站点发布。

### 这个项目为什么能静态部署

- 页面文件在 `static/index.html`
- 前端脚本通过 `/data/ai-consulting-leaderboard.json` 读取数据
- `netlify.toml` 把首页访问重定向到静态页面

因此线上不依赖 `app.py`；`app.py` 只用于本地预览。

## 5. 公开前检查清单

公开或发给客户前，建议确认：

- 页面明确标注“研究预览版 / 非最终排名”。
- 分数说明为 provisional score。
- 来源链接可访问。
- 每条 AI 动作都有来源和置信度。
- Strategy& / Monitor Deloitte 的品牌拆分规则已经说明。
- 数据集中没有客户敏感信息。
- 没有把内部判断伪装成第三方权威排名。

## 6. 后续产品迭代

建议优先做：

1. 增加“行动榜”视图：按最近动作排序，而不是只看总分。
2. 增加公司详情页：公司画像、AI 资产、合作网络、事件时间线、客户证明、治理框架。
3. 增加来源可信度标签：官方 / 媒体 / 厂商 / 第三方。
4. 增加自动采集脚本：从公司官网、新闻稿、合作方公告、媒体文章采集事件。
5. 增加评分规则：把 0–5 分转成可解释的评分卡。
6. 增加双语输出：中文给内部研究，英文给 LinkedIn / 国际客户。

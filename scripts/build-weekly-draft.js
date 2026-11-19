// 周更出版闭环生成器：一条命令，从当期榜单数据生成三个交付物——
//   1. wechat-digest.md  公众号周报草稿（纯文字 MD，供人工复核后按 wechat-consulting-article 流程发布）
//   2. xhs-copy.md       小红书发布文案包（封面标题候选、每卡五项素材、发布 note、合规提醒）
//   3. xhs-cards.html    5 张 1080×1440 小红书卡片（沿用项目 v2 版式语言，内容全部从数据自动填充）
// 排名、净新增、升降、沉默等口径与 static/app.js 完全一致，不读取人工手写的 meta.method_note。
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "ai-consulting-leaderboard.json");
const HISTORY_PATH = path.join(ROOT, "data", "rank-history.json");
const ACTION_SCORE_CURVE = 70;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function eventTimestamp(date) {
  if (!date) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(`${date}T00:00:00Z`) || 0;
  if (/^\d{4}-\d{2}$/.test(date)) return Date.parse(`${date}-01T00:00:00Z`) || 0;
  if (/^\d{4}$/.test(date)) return Date.parse(`${date}-01-01T00:00:00Z`) || 0;
  return Date.parse(date) || 0;
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

function rankDecay(index) {
  return 1 / (1 + 0.45 * index);
}

function scoreActionEvents(events, now) {
  return events
    .map((event) => ({ event, weighted: actionEventWeight(event, now) }))
    .filter((row) => row.weighted > 0)
    .sort((a, b) => b.weighted - a.weighted)
    .map((row, index) => ({ ...row, contribution: row.weighted * rankDecay(index) }));
}

function recentActionScore(company, now) {
  const total = scoreActionEvents(company.events || [], now).reduce((sum, row) => sum + row.contribution, 0);
  return { totalWeight: Math.round(total * 100) / 100 };
}

function historicalActionScore(company, now, filterFn = () => true) {
  const rows = scoreActionEvents((company.events || []).filter((event) => eventTimestamp(event.date) <= now && filterFn(event)), now);
  return rows.reduce((sum, row) => sum + row.contribution, 0);
}

function latestTimestamp(company) {
  return Math.max(...(company.events || []).map((event) => eventTimestamp(event.date)), 0);
}

function shortDate(date) {
  return date ? String(date).replace(/-/g, ".") : "未标注";
}

function shorten(text = "", max = 26) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const floor = Math.floor(max * 0.5);
  const punct = Math.max(cut.lastIndexOf("："), cut.lastIndexOf(":"), cut.lastIndexOf("，"), cut.lastIndexOf(","), cut.lastIndexOf("。"), cut.lastIndexOf("；"), cut.lastIndexOf(";"));
  let out;
  if (punct >= floor) {
    out = cut.slice(0, punct);
  } else {
    const space = cut.lastIndexOf(" ");
    out = space >= floor ? cut.slice(0, space) : cut.slice(0, max);
  }
  return out.replace(/[，、：:;；\-–—·]$/, "") + "…";
}

function cutSentences(text = "", max = 110) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const floor = Math.floor(max * 0.5);
  const end = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("；"), cut.lastIndexOf("!"), cut.lastIndexOf("！"));
  return (end >= floor ? cut.slice(0, end + 1) : shorten(clean, max));
}

function hostOf(url = "") {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function isNetNewEvent(event) {
  const date = eventTimestamp(event.date);
  return date > eventTimestamp(DATA.meta.previous_updated_at) && date <= eventTimestamp(DATA.meta.updated_at);
}

function sourceIsOfficial(event) {
  return ["official", "official_press_release", "vendor_official"].includes(event.source_level);
}

const DATA = readJson(DATA_PATH);
const NOW = Date.parse(`${DATA.meta.updated_at}T00:00:00Z`) || Date.now();

// —— 排名（与主榜一致）——
const maxWeight = Math.max(...DATA.companies.map((company) => recentActionScore(company, NOW).totalWeight), 0);
const currentRows = DATA.companies
  .map((company) => ({
    company,
    score: Math.round((recentActionScore(company, NOW).totalWeight / maxWeight) * 1000) / 10,
    latestTs: latestTimestamp(company),
  }))
  .sort((a, b) => b.score - a.score || b.latestTs - a.latestTs);

const previousRankMap = new Map(
  currentRows
    .map(({ company }) => ({
      company,
      score: historicalActionScore(company, NOW, (event) => !isNetNewEvent(event)),
      latestTs: latestTimestamp(company),
    }))
    .sort((a, b) => b.score - a.score || b.latestTs - a.latestTs)
    .map((row, index) => [row.company.id, index + 1]),
);

const movers = currentRows
  .map(({ company }, index) => {
    const currentRank = index + 1;
    const previousRank = previousRankMap.get(company.id) || currentRank;
    return {
      company,
      currentRank,
      previousRank,
      rankDelta: previousRank - currentRank,
      newEvents: (company.events || []).filter(isNetNewEvent).sort((a, b) => (b.event_score ?? 0) - (a.event_score ?? 0)),
      score: currentRows[index].score,
    };
  })
  .filter((row) => row.rankDelta !== 0)
  .sort((a, b) => Math.abs(b.rankDelta) - Math.abs(a.rankDelta));

const risers = movers.filter((row) => row.rankDelta > 0);
const fallers = movers.filter((row) => row.rankDelta < 0);

const weekly = DATA.companies
  .flatMap((company) => (company.events || []).filter(isNetNewEvent).map((event) => ({ company, event })))
  .sort((a, b) => eventTimestamp(b.event.date) - eventTimestamp(a.event.date) || (b.event.event_score ?? 0) - (a.event.event_score ?? 0));

const quietFirms = DATA.companies.filter((company) => !weekly.some(({ company: c }) => c.id === company.id));
const officialCount = weekly.filter(({ event }) => sourceIsOfficial(event)).length;
const topEvent = [...weekly].sort((a, b) => (b.event.event_score ?? 0) - (a.event.event_score ?? 0))[0];

const HISTORY = fs.existsSync(HISTORY_PATH) ? readJson(HISTORY_PATH) : { periods: [] };
const lastPeriodId = HISTORY.periods.length ? String(HISTORY.periods[HISTORY.periods.length - 1]) : "";
const issueNo = lastPeriodId === DATA.meta.updated_at ? HISTORY.periods.length : HISTORY.periods.length + 1;
const windowLabel = `${DATA.meta.previous_updated_at} → ${DATA.meta.updated_at}`;

const OUT_DIR = path.join(ROOT, "research", "drafts", DATA.meta.updated_at);
fs.mkdirSync(OUT_DIR, { recursive: true });

const cnName = (company) => company.cn || company.name;

// 只在标题开头剥掉公司名（en/cn），避免句中出现空洞性词；非开头保留原标题。
function stripName(title = "", company) {
  let out = String(title).trim();
  for (const label of [company?.name, company?.cn]) {
    if (!label) continue;
    const re = new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i");
    if (re.test(out)) {
      out = out.replace(re, "");
      break;
    }
  }
  return out.replace(/^[\s:：\-–—·,，、]+/, "").trim() || String(title).trim();
}

// —————————————————————————————— 1. 公众号周报草稿 ——————————————————————————————
function buildWechatDigest() {
  const lines = [];
  const riserText = risers.length
    ? risers.slice(0, 3).map((row) => `${cnName(row.company)}（+${row.rankDelta}）`).join("、")
    : "无排名上升公司";
  lines.push(`<!-- 生成：${new Date().toISOString().slice(0, 10)} · 数据快照 ${DATA.meta.updated_at} · 窗口 ${windowLabel} · 口径与主榜一致，判词与标题请人工复核 -->`);
  lines.push("");
  lines.push(`# AI咨询行动榜 · 第 ${issueNo} 期周报（${windowLabel}）`);
  lines.push("");
  lines.push("## 标题候选（结论句，人工择一或改写）");
  lines.push("");
  if (risers.length) {
    const top = risers[0];
    lines.push(`1. ${cnName(top.company)}上升 ${top.rankDelta} 位：本周咨询公司的 AI 动作换挡了`);
  }
  lines.push(`2. 本周最强信号 ${topEvent ? topEvent.event.event_score : "n/a"} 分：${topEvent ? shorten(stripName(topEvent.event.title, topEvent.company), 24) : "暂无"}，值得拆解`);
  lines.push(`3. ${quietFirms.length} 家沉默、${weekly.length} 条新信号：咨询 AI 的分化在这一周更清晰了`);
  lines.push("");
  lines.push("## 导语（判词草案，人工复核）");
  lines.push("");
  const drivers = risers.filter((row) => row.newEvents[0]).slice(0, 2)
    .map((row) => `${cnName(row.company)}靠「${shorten(stripName(row.newEvents[0].title, row.company), 16)}」`);
  const driverText = drivers.length
    ? `上升的驱动清晰：${drivers.join("、")}上行`
    : "本周排名整体平稳，变化发生在证据结构而非名次";
  const quietText = quietFirms.length ? `，而 ${quietFirms.length} 家公司在这扇窗里没有新增任何可核验动作` : "";
  lines.push(`本窗（${windowLabel}）净新增 ${weekly.length} 条公开 AI 信号、官方来源占 ${officialCount} 条。${driverText}${quietText}。在这张榜上，原地踏步就等于退步——分数会随证据老化自动衰减。`);
  lines.push("");
  lines.push("## 一、本周综述");
  lines.push("");
  lines.push(`- 净新增信号：**${weekly.length} 条**（窗口 ${windowLabel}）`);
  lines.push(`- 覆盖公司：**${new Set(weekly.map(({ company }) => company.id)).size} / ${DATA.companies.length} 家**`);
  lines.push(`- 官方一手来源：**${officialCount} 条**（${Math.round((officialCount / Math.max(weekly.length, 1)) * 100)}%），其余为媒体转述或待核验`);
  lines.push(`- 单条最强：**${topEvent ? topEvent.event.event_score : "n/a"} 分**（${topEvent ? `${cnName(topEvent.company)}` : "暂无"}）`);
  lines.push(`- 排名变化：上升 ${risers.length} 家、下降 ${fallers.length} 家、${quietFirms.length} 家沉默`);
  lines.push("");
  lines.push("## 二、排名升降");
  lines.push("");
  lines.push("| 公司 | 变化 | 本期名次 | 驱动事件（分） |");
  lines.push("|---|---|---|---|");
  for (const row of movers.slice(0, 8)) {
    const arrow = row.rankDelta > 0 ? `↑${row.rankDelta}` : `↓${Math.abs(row.rankDelta)}`;
    const driverCell = row.newEvents[0]
      ? `${shorten(stripName(row.newEvents[0].title, row.company), 22)}（${row.newEvents[0].event_score ?? "n/a"}）`
      : "无新增，被对手补证反超";
    lines.push(`| ${cnName(row.company)} | ${arrow} | #${row.currentRank} | ${driverCell} |`);
  }
  lines.push("");
  lines.push("## 三、最强单条信号");
  lines.push("");
  if (topEvent) {
    lines.push(`**${topEvent.event.title}**（${cnName(topEvent.company)} · ${shortDate(topEvent.event.date)} · ${topEvent.event.event_score} 分）`);
    lines.push("");
    lines.push(topEvent.event.summary || "");
    lines.push("");
    lines.push(`来源：${topEvent.event.url}（${hostOf(topEvent.event.url)}，${topEvent.event.source_level}）`);
    lines.push("");
    lines.push("> 我们的判断（人工填写）：");
    lines.push("");
  }
  lines.push("## 四、沉默公司");
  lines.push("");
  lines.push(quietFirms.length
    ? `${quietFirms.map((company) => cnName(company)).join("、")}——本窗未新增可核验的公开 AI 信号。分数随证据老化而衰减，连续沉默会在榜上自然下滑，无需负面新闻。`
    : "本期无沉默公司，17 家全部有新动作。");
  lines.push("");
  lines.push("## 五、新入库信号一览（按公司）");
  lines.push("");
  const byCompany = new Map();
  for (const { company, event } of weekly) {
    if (!byCompany.has(company.id)) byCompany.set(company.id, { company, events: [] });
    byCompany.get(company.id).events.push(event);
  }
  for (const { company, events } of byCompany.values()) {
    lines.push(`**${cnName(company)}**（${events.length} 条）：`);
    for (const event of events) {
      lines.push(`- ${shortDate(event.date)} ${event.title}（${event.event_score ?? "n/a"} 分，${event.source_level}）`);
    }
    lines.push("");
  }
  lines.push("## 结尾 CTA（按发布流程选用）");
  lines.push("");
  lines.push("- 工具钩子：用榜单同款九维模型给你的公司打分 → AI 行动力自评工具（/assessment.html）");
  lines.push("- 深链钩子：每家公司一页的完整 AI 动作档案 → 公司追踪页（/companies/）");
  lines.push("- 订阅钩子：榜单变化，每周一封（引导后台留言或邮件订阅）");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("口径说明：分数为相对行动力指数（当期榜首=100），衡量近期公开 AI 动作的强弱，非权威排名；全部信号附原始来源，可在对应公司追踪页逐一核验。");
  return lines.join("\n");
}

// —————————————————————————————— 2. 小红书文案包 ——————————————————————————————
function buildXhsCopy() {
  const lines = [];
  lines.push(`<!-- 生成：${new Date().toISOString().slice(0, 10)} · 数据快照 ${DATA.meta.updated_at} · 配套卡片：xhs-cards.html（渲染命令见文末） -->`);
  lines.push("");
  lines.push(`# 小红书发布文案包 · 第 ${issueNo} 期（${DATA.meta.updated_at}）`);
  lines.push("");
  lines.push("## 封面标题候选（≤20 字、结论句、不提问）");
  lines.push("");
  const riser = risers[0];
  lines.push(`1. ${riser ? `${cnName(riser.company)}上升 ${riser.rankDelta} 位，咨询AI开始拼硬动作` : `本周 ${weekly.length} 条新信号，咨询AI分化加剧`}`);
  lines.push(`2. ${topEvent ? `${shorten(`${cnName(topEvent.company)}${topEvent.event.event_score}分大动作`, 14)}：这一周咨询圈变了` : `本周 ${weekly.length} 条信号：咨询AI分化加剧`}`);
  lines.push("");
  lines.push("## 每卡五项素材（钩子 / 事实 / 数字 / 判断 / 来源）");
  lines.push("");
  lines.push(`**卡1 封面**：钩子＝17 家咨询公司的 AI 动作榜更新了；事实＝窗口 ${windowLabel} 净新增 ${weekly.length} 条；数字＝${weekly.length} 条 / ${new Set(weekly.map(({ company }) => company.id)).size} 家 / 官方 ${officialCount} 条；判断＝分化加剧，原地踏步就等于退步；来源＝AI咨询行动榜（公开方法+全来源）。`);
  lines.push("");
  lines.push(`**卡2 升降榜**：钩子＝这周谁升谁降；事实＝${movers.slice(0, 4).map((row) => `${cnName(row.company)}${row.rankDelta > 0 ? "升" : "降"}${Math.abs(row.rankDelta)}位`).join("、")}；数字＝上升 ${risers.length} 家、下降 ${fallers.length} 家；判断＝升降都由可核验证据驱动，不靠嗓门；来源＝主榜+公司追踪页。`);
  lines.push("");
  lines.push(`**卡3 最强信号**：钩子＝本周最重的一锤；事实＝${topEvent ? `${cnName(topEvent.company)}：${stripName(topEvent.event.title, topEvent.company)}` : "暂无"}；数字＝事件分 ${topEvent ? topEvent.event.event_score : "n/a"}；判断＝（人工补一句可辩护判词）；来源＝${topEvent ? hostOf(topEvent.event.url) : "—"}。`);
  lines.push("");
  lines.push(`**卡4 沉默与头五**：钩子＝比谁猛更有信息量的，是谁没动作；事实＝${quietFirms.slice(0, 5).map((company) => cnName(company)).join("、")}${quietFirms.length > 5 ? " 等" : ""}本窗零新增；数字＝${quietFirms.length} 家沉默；判断＝分数随证据老化衰减，连续沉默自然下滑；来源＝AI咨询行动榜。`);
  lines.push("");
  lines.push(`**卡5 自评工具**：钩子＝给你的公司打个 AI 行动力分；事实＝九维模型与榜单同权重；数字＝0–100 分 + 17 家参考线；判断＝先看清差距在哪一维，再谈补证据；来源＝自评工具（评论区问我要）。`);
  lines.push("");
  lines.push("## 发布 note 模板（人工润色后使用）");
  lines.push("");
  lines.push(`每周追踪 ${DATA.companies.length} 家咨询公司的公开 AI 动作：合作、平台、并购、交付、治理。本窗（${windowLabel}）新增 ${weekly.length} 条信号。${riser && riser.newEvents[0] ? `本周 ${cnName(riser.company)} 凭「${shorten(stripName(riser.newEvents[0].title, riser.company), 16)}」上升 ${riser.rankDelta} 位。` : ""}每条都附原始来源，欢迎来杠数据。你的公司会打几分？评论区聊聊 👇`);
  lines.push("");
  lines.push(`话题标签：#咨询公司 #AI转型 #管理咨询 #${risers.slice(0, 2).map((row) => cnName(row.company)).join(" #")} #麦肯锡 #波士顿咨询`);
  lines.push("");
  lines.push("## 合规红线（发布前自查）");
  lines.push("");
  lines.push("- 卡片与文案不出现公众号二维码、不提「公众号」——引流只说「主页联系我们」或评论区互动；");
  lines.push("- 封面标题不用疑问句；");
  lines.push("- 判断句必须可辩护：事实与解读分开写，不把推测写成事实。");
  lines.push("");
  lines.push("## 卡片渲染命令");
  lines.push("");
  lines.push("```bash");
  lines.push("python3 ~/.agents/skills/xhs-card-kit/scripts/render_cards.py \\");
  lines.push(`    --html research/drafts/${DATA.meta.updated_at}/xhs-cards.html \\`);
  lines.push(`    --out png --names 封面,升降榜,最强信号,沉默与头五,自评工具`);
  lines.push("```");
  return lines.join("\n");
}

// —————————————————————————————— 3. 小红书卡片（v2 版式语言，数据自动填充）——————————————————————————————
function buildXhsCards() {
  const e = escapeHtml;
  const top5 = currentRows.slice(0, 5);
  const moverRows = movers.map((row) => {
    const arrow = row.rankDelta > 0 ? "↑" : "↓";
    return { row, arrow, text: `${cnName(row.company)} ${arrow}${Math.abs(row.rankDelta)} 位`, driver: shorten(row.newEvents[0]?.title || "", 22), score: row.newEvents[0]?.event_score ?? "n/a" };
  });
  const quietChips = quietFirms.map((company) => `<span class="chip">${e(cnName(company))}</span>`).join("");
  const otherSignals = [...weekly]
    .sort((a, b) => (b.event.event_score ?? 0) - (a.event.event_score ?? 0))
    .slice(1, 4)
    .map(({ company, event }) => ({ company, event, title: shorten(event.title, 30) }));

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>小红书图文卡片 · 第 ${issueNo} 期（自动生成）</title>
<style>
  :root{
    --ink:#1c1917; --muted:#6d6558; --paper:#fdf6ea;
    --red:#e02318; --purple:#7c3aed; --green:#0d9463;
    --grad-hot:linear-gradient(100deg,#ff2d20 10%,#ff7a00 90%);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#2b2620;font-family:"PingFang SC","Noto Sans SC",sans-serif;color:var(--ink);}
  .card{width:1080px;height:1440px;position:relative;overflow:hidden;margin:0 auto 40px;
    background:
      radial-gradient(720px 520px at -8% -6%, rgba(255,45,32,.20), transparent 62%),
      radial-gradient(680px 500px at 108% 12%, rgba(124,58,237,.14), transparent 60%),
      linear-gradient(160deg,#fff9ef 0%,#fdeedd 58%,#fbe8cf 100%);}
  .card::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.45;
    background-image:radial-gradient(rgba(28,25,23,.10) 1.6px, transparent 1.6px);background-size:34px 34px;}
  .pad{position:absolute;inset:0;padding:64px 72px 108px;display:flex;flex-direction:column;justify-content:space-between;gap:22px;}
  .wei{font-family:"Weibei SC","PingFang SC",sans-serif;}
  .sticker{position:absolute;top:50px;right:56px;transform:rotate(6deg);background:var(--grad-hot);color:#fff;
    border-radius:22px;padding:14px 26px;font-size:26px;font-weight:900;letter-spacing:.06em;z-index:2;}
  .glass{background:rgba(255,255,255,.72);border:1.5px solid rgba(28,25,23,.08);border-radius:28px;
    box-shadow:0 18px 44px rgba(28,25,23,.10);padding:26px 32px;}
  .kicker{font-size:24px;font-weight:800;letter-spacing:.30em;color:var(--purple);}
  .foot{position:absolute;left:72px;right:72px;bottom:42px;display:flex;justify-content:space-between;align-items:center;
    font-size:21px;color:var(--muted);font-weight:600;}
  .chip{display:inline-block;border:2px solid rgba(28,25,23,.14);border-radius:999px;padding:9px 20px;
    font-size:25px;font-weight:700;color:var(--muted);background:rgba(255,255,255,.5);margin:0 10px 10px 0;}
  .judge{border-left:8px solid var(--red);padding:6px 0 6px 22px;font-size:30px;font-weight:800;line-height:1.5;}
  .big{font-variant-numeric:tabular-nums;}
  table{border-collapse:collapse;width:100%;}
  td{padding:13px 8px;border-bottom:1.5px solid rgba(28,25,23,.10);font-size:26px;vertical-align:top;line-height:1.4;}
  td.name{font-weight:900;white-space:nowrap;}
  td.delta{font-weight:900;white-space:nowrap;color:var(--red);}
  td.delta.down{color:var(--green);}
  td.drv{color:var(--muted);font-size:23px;}
  .up{color:var(--red);} .down{color:var(--green);}
  .bar{height:12px;border-radius:999px;background:linear-gradient(90deg,rgba(255,45,32,.75),rgba(255,122,0,.85));margin-top:8px;}
  .bar-track{background:rgba(28,25,23,.08);border-radius:999px;padding:0;width:100%;}
</style>
</head>
<body>

<section class="card" id="c1">
  <div class="sticker wei">第 ${issueNo} 期 · 每周更新</div>
  <div class="pad">
    <div class="kicker">AI CONSULTING SIGNAL INDEX</div>
    <div class="wei" style="font-size:84px;line-height:1.18;font-weight:900;">17 家咨询公司<br/>本周 ${weekly.length} 条新信号</div>
    <div style="font-size:29px;color:var(--muted);font-weight:700;">窗口 ${e(shortDate(DATA.meta.previous_updated_at))} → ${e(shortDate(DATA.meta.updated_at))}</div>
    <div class="glass" style="display:flex;gap:34px;">
      <div><div class="big" style="font-size:62px;font-weight:900;color:var(--red);">${weekly.length}</div><div style="font-size:23px;color:var(--muted);font-weight:700;">净新增信号</div></div>
      <div><div class="big" style="font-size:62px;font-weight:900;">${new Set(weekly.map(({ company }) => company.id)).size}</div><div style="font-size:23px;color:var(--muted);font-weight:700;">家公司有动作</div></div>
      <div><div class="big" style="font-size:62px;font-weight:900;">${officialCount}</div><div style="font-size:23px;color:var(--muted);font-weight:700;">条官方一手</div></div>
    </div>
    <div class="glass" style="display:flex;align-items:center;gap:20px;">
      <span style="background:var(--grad-hot);color:#fff;border-radius:14px;padding:8px 18px;font-size:24px;font-weight:900;white-space:nowrap;">本周头条 ${topEvent ? e(String(topEvent.event.event_score)) + " 分" : ""}</span>
      <span style="font-size:26px;font-weight:700;line-height:1.45;">${topEvent ? e(shorten(topEvent.event.title, 30)) : "—"}</span>
    </div>
    <div>${movers.slice(0, 4).map((row) => `<span class="chip" style="color:${row.rankDelta > 0 ? "var(--red)" : "var(--green)"};font-weight:900;">${e(cnName(row.company))} ${row.rankDelta > 0 ? "↑" : "↓"}${Math.abs(row.rankDelta)}</span>`).join("")}</div>
    <div class="judge">分化加剧：${movers.length} 家名次变动，${quietFirms.length} 家整周沉默。</div>
  </div>
  <div class="foot"><span>AI咨询行动榜 · 公开方法与全来源</span><span>数据截至 ${e(DATA.meta.updated_at)}</span></div>
</section>

<section class="card" id="c2">
  <div class="sticker wei">升降榜</div>
  <div class="pad">
    <div class="kicker">WHO MOVED · 名次变化</div>
    <div class="wei" style="font-size:68px;line-height:1.15;font-weight:900;">这周谁升谁降</div>
    <div class="glass">
      <table>
        ${moverRows.length ? moverRows.map(({ row, arrow, driver, score }) => `
        <tr>
          <td class="name">${e(cnName(row.company))}</td>
          <td class="delta ${arrow === "↑" ? "up" : "down"}">${arrow} ${Math.abs(row.rankDelta)} 位<br/><small style="color:var(--muted);font-weight:600;font-size:20px;">现 #${row.currentRank}</small></td>
          <td class="drv">${e(driver)}<br/><small style="font-size:20px;">${row.newEvents.length ? `驱动事件 ${e(String(score))} 分` : "本周无新增 · 被对手补证反超"}</small></td>
        </tr>`).join("") : `<tr><td class="name">本周无名次变动</td><td class="drv">窗口内格局平稳，变化发生在证据结构。</td></tr>`}
      </table>
    </div>
    <div class="glass" style="display:flex;gap:26px;font-size:24px;font-weight:700;color:var(--muted);">
      <span>↑ 上升 <b style="color:var(--red);">${risers.length}</b> 家</span>
      <span>↓ 下降 <b style="color:var(--green);">${fallers.length}</b> 家</span>
      <span>○ 沉默 <b style="color:var(--ink);">${quietFirms.length}</b> 家</span>
      <span>官方一手 <b style="color:var(--ink);">${officialCount}/${weekly.length}</b> 条</span>
    </div>
    <div class="judge">升降全部由可核验证据驱动——不靠嗓门，靠动作。</div>
  </div>
  <div class="foot"><span>AI咨询行动榜 · 第 ${issueNo} 期</span><span>${e(DATA.meta.updated_at)}</span></div>
</section>

<section class="card" id="c3">
  <div class="sticker wei">最强信号</div>
  <div class="pad">
    <div class="kicker">TOP SIGNAL OF THE WEEK</div>
    <div style="display:flex;align-items:baseline;gap:18px;">
      <div class="big" style="font-size:130px;font-weight:900;color:var(--red);line-height:1;">${topEvent ? topEvent.event.event_score : "—"}</div>
      <div style="font-size:29px;color:var(--muted);font-weight:700;">/ 100 · 单条事件分</div>
    </div>
    <div class="wei" style="font-size:42px;font-weight:900;line-height:1.45;">${topEvent ? e(shorten(topEvent.event.title, 46)) : "本周暂无高分信号"}</div>
    <div class="glass" style="font-size:26px;line-height:1.6;">
      ${topEvent ? e(cutSentences(topEvent.event.summary || "", 100)) : ""}
      <div style="margin-top:16px;font-size:22px;color:var(--muted);font-weight:700;">${topEvent ? e(`${cnName(topEvent.company)} · ${shortDate(topEvent.event.date)} · 来源 ${hostOf(topEvent.event.url) || "官网"}`) : ""}</div>
    </div>
    <div class="glass">
      <div style="font-size:23px;font-weight:900;color:var(--muted);margin-bottom:12px;">其余高分信号：</div>
      ${otherSignals.map(({ company, event, title }) => `
      <div style="display:flex;gap:14px;align-items:baseline;padding:8px 0;border-top:1px solid rgba(28,25,23,.08);">
        <b class="big" style="color:var(--red);font-size:26px;white-space:nowrap;">${e(String(event.event_score))}</b>
        <span style="font-size:24px;font-weight:700;line-height:1.4;">${e(title)}</span>
        <span style="font-size:20px;color:var(--muted);white-space:nowrap;">${e(cnName(company))}</span>
      </div>`).join("")}
    </div>
    <div class="judge">并购、平台、旗舰研究——动作越重，分越硬。</div>
  </div>
  <div class="foot"><span>AI咨询行动榜 · 第 ${issueNo} 期</span><span>来源见公司追踪页</span></div>
</section>

<section class="card" id="c4">
  <div class="sticker wei">沉默观察</div>
  <div class="pad">
    <div class="kicker">SILENCE IS SIGNAL · 头五 + 沉默</div>
    <div class="wei" style="font-size:62px;line-height:1.2;font-weight:900;">比谁猛更有信息量的<br/>是谁没动作</div>
    <div class="glass">
      <table>
        ${top5.map(({ company, score }, index) => `
        <tr>
          <td class="name" style="color:var(--red);width:70px;">#${index + 1}</td>
          <td>
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <span class="name">${e(cnName(company))}</span>
              <span class="big" style="font-weight:900;font-size:27px;">${score.toFixed(1)}</span>
            </div>
            <div class="bar" style="width:${Math.round(score)}%;"></div>
          </td>
        </tr>`).join("")}
      </table>
    </div>
    <div class="glass" style="font-size:25px;">
      <div style="font-weight:900;margin-bottom:14px;">本窗零新增（${quietFirms.length} 家）：</div>
      ${quietChips}
    </div>
    <div class="judge">分数随证据老化自动衰减：连续沉默，不需要负面新闻也会下滑。</div>
    <div style="font-size:21px;color:var(--muted);font-weight:600;">口径：沉默 = 窗口内没有新增公开可核验动作，不等于没做事。</div>
  </div>
  <div class="foot"><span>AI咨询行动榜 · 第 ${issueNo} 期</span><span>${e(DATA.meta.updated_at)}</span></div>
</section>

<section class="card" id="c5">
  <div class="sticker wei">互动</div>
  <div class="pad">
    <div class="kicker">SELF-ASSESSMENT</div>
    <div class="wei" style="font-size:76px;line-height:1.22;font-weight:900;">给你的公司<br/>打个 AI 行动力分</div>
    <div class="glass" style="font-size:26px;line-height:1.7;">
      <b>九维模型，与榜单同权重：</b><br/>
      战略信号 · 科技合作 · 自有资产 · 交付生产化 · 并购资本 · 行业覆盖 · 客户证明 · 治理风控 · 思考力
      <div style="margin-top:14px;font-size:23px;color:var(--muted);font-weight:700;">每维 0–5 分 → 加权 0–100 总分 + 17 家公司参考线</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;font-size:26px;font-weight:800;">
      <div>① 逐维打分，每个维度都有 1/3/5 分锚点</div>
      <div>② 看总分落在哪一带 + 和 17 家比差在哪</div>
      <div>③ 拿走最弱两维的补证据清单</div>
    </div>
    <div class="glass" style="display:flex;align-items:center;gap:22px;">
      <div class="big" style="font-size:58px;font-weight:900;color:var(--red);white-space:nowrap;">42.5<span style="font-size:24px;color:var(--muted);"> /100</span></div>
      <div style="font-size:23px;line-height:1.5;color:var(--muted);font-weight:700;">示例：某中型咨询公司，观察带。<br/>最弱两维自动出补证据清单。</div>
    </div>
    <div class="judge">先看清差距在哪一维，再谈补证据。想试的，评论区说「打分」。</div>
  </div>
  <div class="foot"><span>AI咨询行动榜 · 九维自评</span><span>主页可联系我们</span></div>
</section>

</body>
</html>
`;
}

function main() {
  fs.writeFileSync(path.join(OUT_DIR, "wechat-digest.md"), buildWechatDigest(), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "xhs-copy.md"), buildXhsCopy(), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "xhs-cards.html"), buildXhsCards(), "utf8");

  console.log(`第 ${issueNo} 期草稿包已生成 → research/drafts/${DATA.meta.updated_at}/`);
  console.log(`  wechat-digest.md  公众号周报草稿`);
  console.log(`  xhs-copy.md       小红书文案包`);
  console.log(`  xhs-cards.html    5 张卡片（渲染命令在 xhs-copy.md 文末）`);
  console.log("");
  console.log(`窗口 ${windowLabel}：净新增 ${weekly.length} 条，官方 ${officialCount} 条，覆盖 ${new Set(weekly.map(({ company }) => company.id)).size} 家`);
  console.log(`升降：${risers.map((row) => `${cnName(row.company)}(+${row.rankDelta})`).join(" ") || "无"} / ${fallers.map((row) => `${cnName(row.company)}(${row.rankDelta})`).join(" ") || "无"} / 沉默 ${quietFirms.length} 家`);
  console.log(`最强信号：${topEvent ? `${cnName(topEvent.company)}「${shorten(topEvent.event.title, 24)}」${topEvent.event.event_score} 分` : "无"}`);
}

main();

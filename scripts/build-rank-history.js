#!/usr/bin/env node
// 从 git 历史重建每一期快照的行动力排名，生成前端读取的 data/rank-history.json。
// 需要 git 历史（本地运行后再提交产物；Netlify 无构建步骤，直接读提交进仓库的 JSON）。
// 用法：node scripts/build-rank-history.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_PATH = path.join(ROOT, "data", "rank-history.json");
const CURVE = 70;

function ts(date) {
  if (!date) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(date + "T00:00:00Z") || 0;
  if (/^\d{4}-\d{2}$/.test(date)) return Date.parse(date + "-01T00:00:00Z") || 0;
  if (/^\d{4}$/.test(date)) return Date.parse(date + "-01-01T00:00:00Z") || 0;
  return Date.parse(date) || 0;
}

function eventWeight(e, now) {
  const raw = Number(e.event_score || 0);
  const age = Math.max(0, (now - ts(e.date)) / 86400000);
  const rec = age <= 30 ? 1 : age <= 90 ? 0.92 : age <= 180 ? 0.82 : age <= 365 ? 0.72 : 0.58;
  const conf = e.confidence === "high" ? 1 : e.confidence === "medium" ? 0.93 : 0.82;
  const src = e.source_level === "official" || e.source_level === "official_press_release" ? 1
    : e.source_level === "vendor_official" ? 0.96 : e.source_level === "media" ? 0.9 : 0.86;
  return raw * rec * conf * src;
}

const decay = (i) => 1 / (1 + 0.45 * i);

function snapshotFrom(commit) {
  const out = execSync(`git show ${commit}:data/ai-consulting-leaderboard.json`, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const d = JSON.parse(out);
  const now = Date.parse(d.meta.updated_at + "T00:00:00Z");
  const rows = (d.companies || []).map((co) => {
    const evs = (co.events || [])
      .filter((e) => ts(e.date) <= now)
      .map((e) => eventWeight(e, now))
      .filter((w) => w > 0)
      .sort((a, b) => b - a);
    const total = evs.reduce((s, w, i) => s + w * decay(i), 0);
    return { id: co.id, name: co.name, cn: co.cn || "", total };
  });
  const max = Math.max(...rows.map((r) => r.total), 0);
  const maxRaw = 100 * (1 - Math.exp(-max / CURVE));
  const headFloor = 90;
  rows.forEach((r) => {
    r.score = 100 * (1 - Math.exp(-r.total / CURVE));
    if (maxRaw > headFloor && r.score > headFloor) {
      const n = Math.max(0, Math.min(1, (r.score - headFloor) / (maxRaw - headFloor)));
      r.score = headFloor + n * (100 - headFloor);
    }
  });
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return { updatedAt: d.meta.updated_at, rows };
}

function main() {
  // 动态发现所有改过榜单数据文件的提交；同一快照日期保留最后一次提交（后者修正前者）。
  // 非周更的功能性提交（只改页面模块、数据未实质刷新）显式排除。
  const EXCLUDED_COMMITS = new Set([
    "513c460", // 2026-06-22 新增变化归因模块，非一次真实周更
  ]);
  const log = execSync(
    'git log --format="%h %ad" --date=short -- data/ai-consulting-leaderboard.json',
    { encoding: "utf8" },
  ).trim().split("\n").map((line) => {
    const [hash, date] = line.split(" ");
    return { hash, date };
  }).reverse().filter(({ hash }) => !EXCLUDED_COMMITS.has(hash));

  const bySnapshot = new Map();
  for (const { hash } of log) {
    try {
      const snap = snapshotFrom(hash);
      bySnapshot.set(snap.updatedAt, snap);
    } catch (err) {
      console.warn(`skip ${hash}: ${err.message.split("\n")[0]}`);
    }
  }

  const snapshots = [...bySnapshot.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (!snapshots.length) throw new Error("no snapshots found in git history");

  const periods = snapshots.map(([date]) => date);
  const rankMap = new Map();
  snapshots.forEach(([, snap], pi) => {
    snap.rows.forEach((r, i) => {
      if (!rankMap.has(r.name)) {
        rankMap.set(r.name, { cn: r.cn, ranks: Array(periods.length).fill(null), scores: Array(periods.length).fill(null) });
      }
      const entry = rankMap.get(r.name);
      entry.ranks[pi] = i + 1;
      entry.scores[pi] = Math.round(r.score * 10) / 10;
    });
  });

  const companies = [...rankMap.entries()]
    .sort((a, b) => a[1].ranks[periods.length - 1] - b[1].ranks[periods.length - 1])
    .map(([name, entry]) => ({ name, cn: entry.cn, ranks: entry.ranks, scores: entry.scores }));

  const payload = {
    meta: {
      generated_from: "git history of data/ai-consulting-leaderboard.json",
      method: "每期用当期快照数据、按现行行动力算法重算；分数跨期可比",
      period_count: periods.length,
      first_period: periods[0],
      last_period: periods[periods.length - 1],
    },
    periods,
    companies,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Built ${OUT_PATH}`);
  console.log(`Periods: ${periods.length} (${periods[0]} -> ${periods[periods.length - 1]}) | Companies: ${companies.length}`);
}

main();

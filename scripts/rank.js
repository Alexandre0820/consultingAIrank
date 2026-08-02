const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "ai-consulting-leaderboard.json");
const ACTION_SCORE_CURVE = 70;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function recentActionScore(company, asOfDate) {
  const now = Date.parse(`${asOfDate}T00:00:00Z`) || Date.now();
  const rows = (company.events || [])
    .filter((event) => eventTimestamp(event.date) <= now)
    .map((event) => actionEventWeight(event, now))
    .filter((weight) => weight > 0)
    .sort((a, b) => b - a);
  const total = rows.reduce((sum, weight, index) => sum + weight * rankDecay(index), 0);
  const score = Math.round((100 * (1 - Math.exp(-total / ACTION_SCORE_CURVE))) * 10) / 10;
  return {
    score,
    totalWeight: Math.round(total * 100) / 100,
  };
}

function displayActionScore(totalWeight, maxWeight) {
  if (!Number.isFinite(totalWeight) || maxWeight <= 0) return 0;
  const maxRaw = 100 * (1 - Math.exp(-maxWeight / ACTION_SCORE_CURVE));
  const rawScore = 100 * (1 - Math.exp(-totalWeight / ACTION_SCORE_CURVE));
  const headFloor = 90;

  if (maxRaw <= headFloor || rawScore <= headFloor) {
    return Math.round(rawScore * 10) / 10;
  }

  const normalized = Math.max(0, Math.min(1, (rawScore - headFloor) / (maxRaw - headFloor)));
  return Math.round((headFloor + normalized * (100 - headFloor)) * 10) / 10;
}

function rankedRows(data, asOfDate) {
  const rawRows = data.companies.map((company) => ({
    id: company.id,
    name: company.name,
    cn: company.cn,
    latestTimestamp: Math.max(...(company.events || []).map((event) => eventTimestamp(event.date)), 0),
    raw: recentActionScore(company, asOfDate),
  }));
  const maxWeight = Math.max(...rawRows.map((row) => row.raw.totalWeight), 0);
  return rawRows
    .map((row) => ({
      id: row.id,
      name: row.name,
      cn: row.cn,
      latestTimestamp: row.latestTimestamp,
      score: displayActionScore(row.raw.totalWeight, maxWeight),
    }))
    .sort((a, b) => b.score - a.score || b.latestTimestamp - a.latestTimestamp || a.name.localeCompare(b.name));
}

function main() {
  const data = readJson(DATA_PATH);
  const previousRows = rankedRows(data, data.meta.previous_updated_at);
  const previousRank = new Map(previousRows.map((row, index) => [row.id, index + 1]));

  const rows = rankedRows(data, data.meta.updated_at)
    .map((row, index) => ({
      rank: index + 1,
      ...row,
      previous_rank: previousRank.get(row.id),
      rank_delta: (previousRank.get(row.id) || index + 1) - (index + 1),
    }));

  console.log(`AI咨询行动榜 ${data.meta.updated_at}（对比 ${data.meta.previous_updated_at}）`);
  for (const row of rows.slice(0, 20)) {
    const movement = row.rank_delta > 0 ? `↑${row.rank_delta}` : row.rank_delta < 0 ? `↓${Math.abs(row.rank_delta)}` : "→";
    console.log(`${row.rank}. ${row.name} ${row.score.toFixed(1)} ${movement}`);
  }
}

main();

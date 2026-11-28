// 聚合匿名自评提交 → data/benchmark.json(公开只读聚合,不含任何个体记录)。
// 数据来源两处:
//   1) data/submissions/benchmark/*.jsonl        —— 本地 app.py 落盘(人工复核后把 pending- 重命名为 approved-)
//   2) data/benchmark-submissions/*.csv          —— Netlify Forms 后台导出的 CSV(列名与表单字段一致)
// 复核纪律:只把人工确认过的文件留在目录里;被判定为垃圾/重复的数据直接删除文件行,不进聚合。
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SUBMISSION_DIR = path.join(ROOT, "data", "submissions", "benchmark-submission");
const CSV_DIR = path.join(ROOT, "data", "benchmark-submissions");
const OUT_PATH = path.join(ROOT, "data", "benchmark.json");

const DIMS = ["strategy_signal", "tech_partnership", "proprietary_assets", "delivery_production",
  "capital_ma", "industry_coverage", "client_value_proof", "governance_risk", "thought_leadership"];
const SEGMENTS = ["consulting-mbb", "consulting-big4", "consulting-tech", "consulting-boutique", "enterprise", "other"];

function readJsonl(dir) {
  if (!fs.existsSync(dir)) return [];
  const rows = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"))) {
    for (const line of fs.readFileSync(path.join(dir, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { rows.push(JSON.parse(line)); } catch (error) { console.warn(`跳过损坏行(${file}):`, error.message); }
    }
  }
  return rows;
}

function readCsv(dir) {
  if (!fs.existsSync(dir)) return [];
  const rows = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
    const lines = fs.readFileSync(path.join(dir, file), "utf8").split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    for (const line of lines.slice(1)) {
      // Netlify 导出的 CSV 按字段顺序用逗号拼接;表单不含逗号字段,直接切分即可
      const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      rows.push(row);
    }
  }
  return rows;
}

function collect() {
  const rows = [];
  for (const r of readJsonl(SUBMISSION_DIR)) {
    rows.push({ segment_type: r.segment_type, segment_role: r.segment_role, received_at: r.received_at, ...Object.fromEntries(DIMS.map((d) => [d, Number(r[`d_${d}`])])) });
  }
  for (const r of readCsv(CSV_DIR)) {
    if ((r.consent || "").toLowerCase() !== "yes") continue;
    rows.push({ segment_type: r.segment_type, segment_role: r.segment_role || "other", received_at: r.received_at || r.created_at || "", ...Object.fromEntries(DIMS.map((d) => [d, Number(r[`d_${d}`])])) });
  }
  return rows.filter((r) => SEGMENTS.includes(r.segment_type) && DIMS.every((d) => Number.isInteger(r[d]) && r[d] >= 0 && r[d] <= 5));
}

function summarize(values) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const pct = (p) => { const idx = (v.length - 1) * p; const lo = Math.floor(idx), hi = Math.ceil(idx); return v[lo] + (v[hi] - v[lo]) * (idx - lo); };
  return { n: v.length, p25: Math.round(pct(0.25) * 10) / 10, p50: Math.round(pct(0.5) * 10) / 10, p75: Math.round(pct(0.75) * 10) / 10 };
}

function main() {
  const rows = collect();
  const result = {
    generated_at: new Date().toISOString().slice(0, 10),
    note: "匿名自评聚合(人工复核后纳入)。个体记录不出现在本文件;分层展示要求 n>=5。",
    total_submissions: rows.length,
    overall: {},
    segments: {},
  };
  for (const dim of DIMS) {
    const summary = summarize(rows.map((r) => r[dim]));
    if (summary) result.overall[dim] = summary;
  }
  for (const seg of SEGMENTS) {
    const segRows = rows.filter((r) => r.segment_type === seg);
    if (!segRows.length) continue;
    const dims = {};
    for (const dim of DIMS) {
      const summary = summarize(segRows.map((r) => r[dim]));
      if (summary) dims[dim] = summary;
    }
    result.segments[seg] = { n: segRows.length, dims };
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + "\n");
  console.log(`benchmark.json 写入完成:提交 ${rows.length} 条(overall:${Object.keys(result.overall).length}/9 维,segments:${Object.keys(result.segments).length} 组)`);
}

main();

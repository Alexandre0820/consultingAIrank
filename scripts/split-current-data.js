const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SOURCE_PATH = path.join(DATA_DIR, "ai-consulting-leaderboard.json");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const COMPANIES_PATH = path.join(DATA_DIR, "companies.json");
const EVENTS_DIR = path.join(DATA_DIR, "events");
const ARCHIVE_EVENTS_PATH = path.join(EVENTS_DIR, "archive.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function eventTimestamp(date) {
  if (!date) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(`${date}T00:00:00Z`) || 0;
  if (/^\d{4}-\d{2}$/.test(date)) return Date.parse(`${date}-01T00:00:00Z`) || 0;
  if (/^\d{4}$/.test(date)) return Date.parse(`${date}-01-01T00:00:00Z`) || 0;
  return Date.parse(date) || 0;
}

function main() {
  const data = readJson(SOURCE_PATH);
  const config = {
    meta: data.meta,
    dimensions: data.dimensions,
    event_types: data.event_types,
    event_score_model: data.event_score_model,
  };

  const companies = data.companies.map((company) => {
    const { events, ...base } = company;
    return base;
  });

  const comparisonStart = data.meta.previous_updated_at;
  const weeklyPath = path.join(EVENTS_DIR, `${data.meta.updated_at}.json`);
  const archiveEvents = [];
  const weeklyEvents = [];

  for (const company of data.companies) {
    for (const event of company.events || []) {
      const row = { company_id: company.id, ...event };
      if (
        comparisonStart &&
        eventTimestamp(event.date) >= eventTimestamp(comparisonStart) &&
        eventTimestamp(event.date) <= eventTimestamp(data.meta.updated_at)
      ) {
        weeklyEvents.push(row);
      } else {
        archiveEvents.push(row);
      }
    }
  }

  writeJson(CONFIG_PATH, config);
  writeJson(COMPANIES_PATH, companies);
  writeJson(ARCHIVE_EVENTS_PATH, {
    meta: {
      description: "Accumulated historical events before the latest weekly refresh window.",
      generated_from: "data/ai-consulting-leaderboard.json",
      generated_at: data.meta.updated_at,
    },
    events: archiveEvents,
  });
  writeJson(weeklyPath, {
    meta: {
      refresh_date: data.meta.updated_at,
      comparison_start: comparisonStart,
      description: "Net-new events merged during this weekly refresh.",
    },
    events: weeklyEvents,
  });

  console.log(`Wrote ${companies.length} companies`);
  console.log(`Wrote ${archiveEvents.length} archive events`);
  console.log(`Wrote ${weeklyEvents.length} weekly events`);
}

main();

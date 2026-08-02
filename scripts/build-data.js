const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const COMPANIES_PATH = path.join(DATA_DIR, "companies.json");
const EVENTS_DIR = path.join(DATA_DIR, "events");
const OUT_PATH = path.join(DATA_DIR, "ai-consulting-leaderboard.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function eventTimestamp(date) {
  if (!date) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return Date.parse(`${date}T00:00:00Z`) || 0;
  if (/^\d{4}-\d{2}$/.test(date)) return Date.parse(`${date}-01T00:00:00Z`) || 0;
  if (/^\d{4}$/.test(date)) return Date.parse(`${date}-01-01T00:00:00Z`) || 0;
  return Date.parse(date) || 0;
}

function eventSort(a, b) {
  const dateDiff = eventTimestamp(b.date) - eventTimestamp(a.date);
  if (dateDiff !== 0) return dateDiff;
  return String(b.event_score || 0).localeCompare(String(a.event_score || 0));
}

function loadEvents() {
  if (!fs.existsSync(EVENTS_DIR)) return [];
  const files = fs.readdirSync(EVENTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => {
      if (a === "archive.json") return -1;
      if (b === "archive.json") return 1;
      return a.localeCompare(b);
    });

  return files.flatMap((file) => {
    const payload = readJson(path.join(EVENTS_DIR, file));
    return (payload.events || []).map((event) => ({ ...event, _source_file: file }));
  });
}

function stripBuildOnlyFields(event) {
  const { company_id, _source_file, ...rest } = event;
  return rest;
}

function main() {
  const config = readJson(CONFIG_PATH);
  const companies = readJson(COMPANIES_PATH);
  const events = loadEvents();
  const eventsByCompany = new Map();

  for (const event of events) {
    if (!event.company_id) {
      throw new Error(`Event missing company_id: ${event.title || event.url || "unknown"}`);
    }
    if (!eventsByCompany.has(event.company_id)) eventsByCompany.set(event.company_id, []);
    eventsByCompany.get(event.company_id).push(event);
  }

  const unknownCompanyIds = Array.from(eventsByCompany.keys())
    .filter((companyId) => !companies.some((company) => company.id === companyId));
  if (unknownCompanyIds.length) {
    throw new Error(`Events reference unknown company IDs: ${unknownCompanyIds.join(", ")}`);
  }

  const builtCompanies = companies.map((company) => ({
    ...company,
    events: (eventsByCompany.get(company.id) || [])
      .sort(eventSort)
      .map(stripBuildOnlyFields),
  }));

  writeJson(OUT_PATH, {
    ...config,
    companies: builtCompanies,
  });

  console.log(`Built ${OUT_PATH}`);
  console.log(`Companies: ${builtCompanies.length}`);
  console.log(`Events: ${events.length}`);
}

main();

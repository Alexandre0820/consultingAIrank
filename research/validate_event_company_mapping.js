const data = require("../data/ai-consulting-leaderboard.json");

const aliases = new Map([
  ["accenture", ["accenture"]],
  ["deloitte", ["deloitte"]],
  ["monitor_deloitte", ["monitor deloitte", "monitor"]],
  ["ey", ["ey", "ernst young", "ernst & young"]],
  ["pwc", ["pwc", "pricewaterhousecoopers", "price waterhouse"]],
  ["kpmg", ["kpmg"]],
  ["mckinsey", ["mckinsey", "quantumblack"]],
  ["bcg", ["bcg", "boston consulting group"]],
  ["bain", ["bain"]],
  ["roland_berger", ["roland berger"]],
  ["kearney", ["kearney"]],
  ["oliver_wyman", ["oliver wyman"]],
  ["strategy_and", ["strategy&", "strategy and"]],
  ["capgemini", ["capgemini"]],
  ["fti", ["fti", "fti consulting"]],
  ["alvarez_marsal", ["alvarez", "a&m", "alvarez & marsal"]],
  ["lek", ["l.e.k", "lek", "l.e.k. consulting"]]
]);

const allAliases = [...aliases.entries()].flatMap(([companyId, names]) =>
  names.map((name) => ({ companyId, name }))
);

const findings = [];

for (const company of data.companies) {
  for (const event of company.events || []) {
    const haystack = `${event.title} ${event.summary || ""}`.toLowerCase();
    const mentionedCompanies = allAliases
      .filter(({ name }) => haystack.includes(name))
      .map(({ companyId }) => companyId)
      .filter((value, index, arr) => arr.indexOf(value) === index);

    if (mentionedCompanies.length && !mentionedCompanies.includes(company.id)) {
      findings.push({
        companyId: company.id,
        companyName: company.name,
        eventTitle: event.title,
        mentionedCompanies
      });
    }
  }
}

if (!findings.length) {
  console.log("OK: no obvious cross-company event mapping issues found.");
  process.exit(0);
}

console.log("Potential mapping issues:");
for (const finding of findings) {
  console.log(
    `- stored_under=${finding.companyId} (${finding.companyName}) | mentions=${finding.mentionedCompanies.join(", ")} | title=${finding.eventTitle}`
  );
}
process.exit(1);

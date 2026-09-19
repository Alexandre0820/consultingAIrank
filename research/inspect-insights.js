const fs = require("fs");
const code = fs.readFileSync("static/app.js", "utf8");

function el() {
  return {
    get content() { return el(); },
    innerHTML: "",
    textContent: "",
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute: () => null,
    appendChild() {},
    removeChild() {},
    querySelector: () => el(),
    querySelectorAll: () => [],
    value: "",
    checked: false,
    dataset: {},
    disabled: false,
    hidden: false,
    focus() {},
    blur() {},
    closest: () => null,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    replaceChildren() {},
    insertAdjacentHTML() {},
  };
}

const documentStub = {
  querySelector: () => el(),
  querySelectorAll: () => [],
  createElement: () => el(),
  createTextNode: () => ({}),
  getElementById: () => el(),
  addEventListener() {},
  removeEventListener() {},
  body: el(),
  documentElement: el(),
  head: el(),
  title: "",
};

const windowStub = {
  location: { search: "", hash: "", href: "http://localhost/index.html", origin: "http://localhost", pathname: "/index.html" },
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
  open() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  navigator: { language: "zh-CN", clipboard: { writeText: async () => {} } },
  history: { replaceState() {}, pushState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  requestAnimationFrame: (f) => setTimeout(f, 0),
  setTimeout,
  clearTimeout,
  URL,
  URLSearchParams,
};

global.window = windowStub;
global.document = documentStub;
global.navigator = windowStub.navigator;
global.localStorage = windowStub.localStorage;
global.location = windowStub.location;
global.requestAnimationFrame = windowStub.requestAnimationFrame;
global.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => JSON.parse(fs.readFileSync("data/ai-consulting-leaderboard.json", "utf8")),
  text: async () => "",
});

const fn = new Function(
  "document", "window", "navigator", "localStorage", "location", "fetch", "requestAnimationFrame", "URL", "URLSearchParams", "setTimeout", "clearTimeout",
  code + "\n;return { buildInsights, actionRankedCompanies, getData: () => data, getLang: () => activeLanguage };"
);
const api = fn(documentStub, windowStub, windowStub.navigator, windowStub.localStorage, windowStub.location, global.fetch, global.requestAnimationFrame, URL, URLSearchParams, setTimeout, clearTimeout);

setTimeout(() => {
  try {
    const d = api.getData();
    console.log("loaded data.updated_at =", d.meta && d.meta.updated_at, "| lang =", api.getLang());
    const cards = api.buildInsights();
    cards.forEach((c, i) => console.log("要点卡" + (i + 1) + " [" + c.kicker + "]: " + c.title));
    console.log("\n行动榜前3（页面实时计算）:");
    api.actionRankedCompanies().slice(0, 3).forEach((r, i) => console.log(" " + (i + 1) + ". " + r.company.name + " action=" + r.action));
  } catch (e) {
    console.log("HARNESS ERROR:", e.stack);
  }
}, 100);

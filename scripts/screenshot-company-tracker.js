// 公司追踪页 前后对比截图:改前(8765 旧服务,无公司页入口) vs 改后(8766 新服务)。
// 用法: node scripts/screenshot-company-tracker.js
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "..", "research", "screenshots", "company-tracker");

async function shotBoard(browser, base, file, clipTarget) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  if (clipTarget) {
    await page.waitForSelector(clipTarget, { timeout: 15000 });
    await page.locator(clipTarget).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  } else {
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(OUT_DIR, file) });
  await page.close();
  console.log(`${file} saved`);
}

async function shotFullPage(browser, url, file) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
  await page.close();
  console.log(`${file} saved`);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  // —— 改前(8765:旧服务 + 主榜无公司页入口)——
  await shotBoard(browser, "http://127.0.0.1:8765", "before-board-deloitte-card.png", "#company-deloitte");
  await shotFullPage(browser, "http://127.0.0.1:8765/companies/deloitte.html", "before-company-404.png");

  // —— 改后(8766:新服务 + 主榜带入口)——
  await shotFullPage(browser, "http://127.0.0.1:8766/companies/deloitte.html", "after-company-deloitte.png");
  await shotFullPage(browser, "http://127.0.0.1:8766/companies/", "after-company-directory.png");
  await shotBoard(browser, "http://127.0.0.1:8766", "after-board-deloitte-card.png", "#company-deloitte");

  await browser.close();
  console.log(`全部截图输出到 ${OUT_DIR}`);
})();

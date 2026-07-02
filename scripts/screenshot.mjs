import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT =
  "C:/Users/gabri/AppData/Local/Temp/claude/c--Users-gabri-toca-play-toca-play-app/3cb5c934-d721-44e6-bc70-716b4c08d727/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function shot(name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("shot:", name);
}

// 1. Login page
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await shot("01-login");

// 2. Log in -> dashboard
await page.fill('input[name="email"]', "admin@aponte.local");
await page.fill('input[name="password"]', "aponte123");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 15000 });
await shot("02-dashboard");

// 3. Pré-adolescentes list
await page.goto(`${BASE}/cadastros/pre-adolescentes`, { waitUntil: "networkidle" });
await shot("03-pre-adolescentes");

// 3b. Novo culto (calendar + services)
await page.goto(`${BASE}/cultos/novo`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const calBtn = page.getByRole("button", { name: /Escolher data|\/\d/ }).first();
try {
  await calBtn.click({ timeout: 3000 });
  await page.waitForTimeout(400);
} catch {}
await shot("03c-novo-culto");

// 4. Culto check-in
await page.goto(`${BASE}/cultos`, { waitUntil: "networkidle" });
const firstCulto = page.locator('ul a[href^="/cultos/"]').first();
await firstCulto.click();
await page.waitForURL(/\/cultos\/[0-9a-f-]{36}/, { timeout: 15000 });
await shot("04-checkin");

// 5. Grupos (generate if needed)
const url = page.url();
await page.goto(`${url}/grupos`, { waitUntil: "networkidle" });
const genBtn = page.getByRole("button", { name: /Gerar grupos/i });
if (await genBtn.count()) {
  await genBtn.first().click();
  await page.waitForTimeout(1500);
}
await shot("05-grupos");

// 6. Relatórios
await page.goto(`${BASE}/relatorios`, { waitUntil: "networkidle" });
await shot("06-relatorios");

await browser.close();
console.log("done");

// Visual + a11y sanity check of BOTH themes (light/dark), desktop + mobile.
// Logs in once, then re-renders each screen under each theme by setting the
// tp_theme cookie. Also asserts zero horizontal overflow on every screen.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const OUT =
  "C:/Users/gabri/AppData/Local/Temp/claude/c--Users-gabri-toca-play-toca-play-app/3cb5c934-d721-44e6-bc70-716b4c08d727/scratchpad";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

let overflowFails = 0;
async function checkOverflow(name) {
  const w = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  const over = w.scroll - w.client;
  if (over > 1) {
    overflowFails++;
    console.log(`  ⚠ overflow ${over}px em ${name}`);
  }
}
async function shot(name) {
  await page.waitForTimeout(500);
  await checkOverflow(name);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("shot:", name);
}
async function setTheme(theme) {
  await ctx.addCookies([
    { name: "tp_theme", value: theme, url: BASE },
  ]);
}

// --- log in (dark by default) ---
await setTheme("dark");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "admin@aponte.local");
await page.fill('input[name="password"]', "aponte123");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 20000 });

const SCREENS = [
  ["login", `${BASE}/login`],
  ["dashboard", `${BASE}/dashboard`],
  ["pre-adolescentes", `${BASE}/cadastros/pre-adolescentes`],
  ["voluntarios", `${BASE}/cadastros/voluntarios`],
  ["estoque", `${BASE}/estoque`],
  ["relatorios", `${BASE}/relatorios`],
  ["usuarios", `${BASE}/config/usuarios`],
  ["conta", `${BASE}/conta`],
];

for (const theme of ["dark", "light"]) {
  await setTheme(theme);
  for (const [name, url] of SCREENS) {
    await page.goto(url, { waitUntil: "networkidle" });
    await shot(`${theme}-${name}`);
  }
  // a culto screen (check-in board) — pick first culto
  await page.goto(`${BASE}/cultos`, { waitUntil: "networkidle" });
  const first = page.locator('ul a[href^="/cultos/"]').first();
  if (await first.count()) {
    await first.click();
    await page.waitForURL(/\/cultos\/[0-9a-f-]{36}/, { timeout: 15000 });
    await shot(`${theme}-checkin`);
  }
}

// --- mobile, both themes, a couple of key screens (overflow is the concern) ---
const mob = await browser.newContext({
  viewport: { width: 390, height: 844 },
  storageState: await ctx.storageState(),
});
const mp = mob.newPage ? await mob.newPage() : page;
for (const theme of ["dark", "light"]) {
  await mob.addCookies([{ name: "tp_theme", value: theme, url: BASE }]);
  for (const [name, url] of [
    ["dashboard", `${BASE}/dashboard`],
    ["pre-adolescentes", `${BASE}/cadastros/pre-adolescentes`],
    ["estoque", `${BASE}/estoque`],
  ]) {
    await mp.goto(url, { waitUntil: "networkidle" });
    await mp.waitForTimeout(400);
    const w = await mp.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    if (w.s - w.c > 1) {
      overflowFails++;
      console.log(`  ⚠ overflow mobile ${w.s - w.c}px em ${theme}-${name}`);
    }
    await mp.screenshot({ path: `${OUT}/m-${theme}-${name}.png`, fullPage: true });
    console.log("shot:", `m-${theme}-${name}`);
  }
}

await browser.close();
console.log(overflowFails === 0 ? "OVERFLOW: 0 ✅" : `OVERFLOW FAILS: ${overflowFails} ❌`);

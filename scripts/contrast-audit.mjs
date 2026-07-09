/**
 * Estudo de contraste (WCAG 2.1) dos dois temas do TocaPlay.
 *   node scripts/contrast-audit.mjs           # imprime a tabela
 *   node scripts/contrast-audit.mjs --write    # também grava docs/contraste.md
 *
 * Limiares: texto normal >= 4.5; texto grande/negrito, ícones e componentes de UI >= 3.0.
 * Fonte da verdade das cores = os tokens de src/app/globals.css (manter em sincronia).
 */
import { writeFileSync, mkdirSync } from "node:fs";

const srgb = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
function lum(hex) {
  const c = hex.replace("#", "");
  const r = srgb(parseInt(c.slice(0, 2), 16) / 255);
  const g = srgb(parseInt(c.slice(2, 4), 16) / 255);
  const b = srgb(parseInt(c.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [L1, L2] = [lum(a), lum(b)];
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
const r2 = (n) => Math.round(n * 100) / 100;

// ---- Paletas (espelham globals.css) -------------------------------------
const THEMES = {
  escuro: {
    surfaces: { "fundo (night-950)": "#0f0a1e", "painel (night-850)": "#1d1533", "hover (night-800)": "#241b3f", "sidebar (night-900)": "#171029" },
    text: { "ink (texto)": "#f6f1e8", "muted (secundário)": "#c4bbe0" },
    accentText: { orange: "#f0801f", grass: "#5aa83c", gold: "#f0c246", diamond: "#37c2b4", terra: "#db7846", amber: "#e2952f", redstone: "#db4a40" },
    borders: { "night-700": "#392c60", "night-600": "#4f3e80" },
  },
  claro: {
    surfaces: { "fundo (night-950)": "#f4f2fa", "painel (night-850)": "#ffffff", "hover (night-800)": "#eee9f6", "sidebar (night-900)": "#faf9fd" },
    text: { "ink (texto)": "#1b1430", "muted (secundário)": "#5a5178" },
    accentText: { orange: "#b4550f", grass: "#3f7a28", gold: "#8a6410", diamond: "#1b7a70", terra: "#9d4d27", amber: "#8a5a12", redstone: "#c0392b" },
    borders: { "night-700": "#d8d1e8", "night-600": "#c3b9dc" },
  },
};

// Preenchimentos brilhantes (iguais nos dois temas) + texto embutido.
const FILLS = {
  "botão grass": { fg: "#10240a", bg: "#5aa83c" },
  "botão terra": { fg: "#2a1206", bg: "#db7846" },
  "botão gold": { fg: "#2a2005", bg: "#f0c246" },
  "botão amber": { fg: "#2a1705", bg: "#e2952f" },
  "botão danger": { fg: "#1a0503", bg: "#db4a40" },
  "chip grass": { fg: "#0c1f07", bg: "#5aa83c" },
  "chip terra": { fg: "#2a1206", bg: "#db7846" },
  "chip gold": { fg: "#2a2005", bg: "#f0c246" },
  "chip orange": { fg: "#2a1505", bg: "#f0801f" },
  "chip diamond": { fg: "#04201e", bg: "#37c2b4" },
  "chip danger": { fg: "#1a0503", bg: "#db4a40" },
  "chip night": { fg: "#f6f1e8", bg: "#392c60" },
};

const TEXT_MIN = 4.5; // texto normal
const UI_MIN = 3.0; // texto grande/negrito, ícones, bordas, componentes

let fails = 0;
const lines = [];
const P = (s) => { lines.push(s); console.log(s); };

function checkGroup(title, fg, bgName, bgHex, min) {
  const c = r2(ratio(fg, bgHex));
  const ok = c >= min;
  if (!ok) fails++;
  return { c, ok, min };
}

for (const [themeName, t] of Object.entries(THEMES)) {
  P(`\n## Tema ${themeName}\n`);
  // Texto principal e secundário sobre cada superfície (>= 4.5)
  P(`### Texto sobre superfícies (mín. 4.5)`);
  for (const [tName, tHex] of Object.entries(t.text)) {
    for (const [sName, sHex] of Object.entries(t.surfaces)) {
      const { c, ok } = checkGroup("", tHex, sName, sHex, TEXT_MIN);
      P(`- ${tName} sobre ${sName}: **${c}** ${ok ? "✅" : "❌"}`);
    }
  }
  // Accent como texto sobre painel e fundo (>= 3.0 piso; ideal 4.5)
  P(`\n### Accent como texto (mín. 3.0; ideal 4.5) — sobre painel e fundo`);
  for (const [aName, aHex] of Object.entries(t.accentText)) {
    for (const sName of ["painel (night-850)", "fundo (night-950)"]) {
      const sHex = t.surfaces[sName];
      const { c, ok } = checkGroup("", aHex, sName, sHex, UI_MIN);
      const ideal = c >= TEXT_MIN ? "" : " (ok p/ grande/ícone)";
      P(`- ${aName} sobre ${sName}: **${c}** ${ok ? "✅" : "❌"}${ideal}`);
    }
  }
  // Bordas sobre painel (informativo, mín. 3.0 desejável)
  P(`\n### Bordas sobre painel (desejável 3.0)`);
  for (const [bName, bHex] of Object.entries(t.borders)) {
    const c = r2(ratio(bHex, t.surfaces["painel (night-850)"]));
    P(`- ${bName}: **${c}** ${c >= UI_MIN ? "✅" : "◽ (borda sutil)"}`);
  }
}

// Preenchimentos (iguais nos dois temas)
P(`\n## Preenchimentos (botões/chips) — texto embutido sobre a cor (mín. 4.5)\n`);
for (const [name, { fg, bg }] of Object.entries(FILLS)) {
  const c = r2(ratio(fg, bg));
  const ok = c >= TEXT_MIN;
  if (!ok) fails++;
  P(`- ${name} (${fg} sobre ${bg}): **${c}** ${ok ? "✅" : "❌"}`);
}

P(`\n---\n${fails === 0 ? "TODOS OS PARES PASSARAM ✅" : `${fails} par(es) reprovaram ❌`}`);

if (process.argv.includes("--write")) {
  mkdirSync("docs", { recursive: true });
  const header = `# Estudo de contraste — TocaPlay\n\nRazões de contraste WCAG 2.1 dos dois temas. Limiares: **texto normal ≥ 4,5**; **texto grande/negrito, ícones e componentes de UI ≥ 3,0**. Gerado por \`scripts/contrast-audit.mjs\`.\n`;
  writeFileSync("docs/contraste.md", header + lines.join("\n") + "\n");
  console.log("\n(escrito em docs/contraste.md)");
}

process.exit(fails === 0 ? 0 : 1);

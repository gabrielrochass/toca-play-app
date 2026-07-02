// Period helpers for the Cultos / Relatórios filters. Client-safe (no imports).

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2026-07" -> "Julho 2026". */
export function monthLabelBR(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS_PT[Number(m) - 1] ?? m} ${y}`;
}

/** Last `n` months as { value: "YYYY-MM", label } options, most recent first. */
export function recentMonths(n = 12): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: ym, label: monthLabelBR(ym) });
  }
  return out;
}

export interface SessionFilters {
  day?: string; // YYYY-MM-DD
  month?: string; // YYYY-MM
  service?: string; // service label (e.g. "10h")
}

/** Inclusive date range from a day (wins) or month; empty when neither set. */
export function dateRangeFor(f: SessionFilters): { gte?: string; lte?: string } {
  if (f.day) return { gte: f.day, lte: f.day };
  if (f.month) {
    const [y, m] = f.month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return { gte: `${f.month}-01`, lte: `${f.month}-${String(last).padStart(2, "0")}` };
  }
  return {};
}

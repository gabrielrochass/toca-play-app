// Theme (light / dark / system) — tiny, dependency-free, cookie-persisted.
// The <html data-theme> attribute drives every token in globals.css.

export const THEME_COOKIE = "tp_theme";
export const THEME_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === "light" || v === "dark" || v === "system";
}

/** Reads the persisted choice from the cookie ("system" on the server / when unset). */
export function readThemeChoice(): ThemeChoice {
  if (typeof document === "undefined") return "system";
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(light|dark|system)`));
  return m && isThemeChoice(m[1]) ? m[1] : "system";
}

/** Turns a choice into the concrete theme, resolving "system" via matchMedia. */
export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === "light" || choice === "dark") return choice;
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Persists the choice (module scope so React's immutability lint stays happy). */
export function persistThemeCookie(choice: ThemeChoice): void {
  document.cookie = `${THEME_COOKIE}=${choice};path=/;max-age=${THEME_MAX_AGE};samesite=lax`;
}

/** Stamps the resolved theme onto <html>. */
export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

/** Runs in <head> BEFORE first paint: resolves the saved choice (or the system
 *  preference when "system"/absent) and stamps data-theme on <html> so the page
 *  never flashes the wrong theme. Kept minimal and self-contained. */
export const themeInitScript = `(function(){try{
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);
var c=m?m[1]:'system';
var t=(c==='light'||c==='dark')?c:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();`;

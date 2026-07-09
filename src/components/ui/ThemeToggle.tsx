"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyResolvedTheme,
  persistThemeCookie,
  readThemeChoice,
  resolveTheme,
  type ThemeChoice,
} from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

const CHANGE_EVENT = "tp-theme-change";

// External store: the cookie is the source of truth; pick() writes it and pings
// subscribers. useSyncExternalStore keeps SSR ("system") and the client in sync
// without a setState-in-effect.
function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

/** Segmented Claro / Escuro / Sistema control. Applies instantly, persists in a
 *  cookie, and follows the device when set to "Sistema". */
export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribe,
    readThemeChoice,
    () => "system",
  );

  // Keep following the device while on "Sistema".
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyResolvedTheme(resolveTheme("system"));
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);

  function pick(next: ThemeChoice) {
    persistThemeCookie(next);
    applyResolvedTheme(resolveTheme(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-night-700 bg-night-950 p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => pick(value)}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded transition-colors",
              active
                ? "bg-(--color-orange-fill) text-[#2a1505]"
                : "text-muted hover:bg-night-800 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

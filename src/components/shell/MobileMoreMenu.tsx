"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen, User, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { hasAtLeast } from "@/lib/roles";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/database";

// Module-level scroll lock (keeps DOM mutation out of the component body).
function lockScroll() {
  document.body.style.overflow = "hidden";
}
function unlockScroll() {
  document.body.style.overflow = "";
}

/**
 * Mobile "Mais" tab: a 5th bottom-bar button that opens a bottom sheet with the
 * overflow nav (Estoque, Relatórios, Usuários — admin only), Guia, Minha conta
 * and Sair, plus the logged-in user's identity (which is hidden in the header
 * on small screens). Desktop uses the sidebar instead — this is md:hidden.
 */
export function MobileMoreMenu({
  role,
  userName,
  roleLabel,
}: {
  role: AppRole;
  userName: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open]);

  // Nav entries not pinned to the bottom bar, respecting role gating, + Guia + Conta.
  const items = [
    ...NAV_ITEMS.filter(
      (i) => !i.mobile && (!i.minRole || hasAtLeast(role, i.minRole)),
    ).map((i) => ({ href: i.href, label: i.label, Icon: i.icon })),
    { href: "/guia", label: "Guia", Icon: BookOpen },
    { href: "/conta", label: "Minha conta", Icon: User },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[0.6rem] font-medium",
          open ? "text-orange" : "text-muted",
        )}
      >
        <Menu className="h-5 w-5" strokeWidth={2.5} />
        <span className="truncate">Mais</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mais opções"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-night-700 bg-night-900 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-night-700" />

            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">
                  {userName}
                </div>
                <div className="truncate text-xs text-muted">{roleLabel}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {items.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive(href)
                      ? "border-orange bg-night-800 text-ink"
                      : "border-transparent text-muted hover:bg-night-850 hover:text-ink",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5 shrink-0", isActive(href) ? "text-orange" : "")}
                    strokeWidth={2.25}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              ))}

              <form action={signOut} className="mt-1">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-night-850 hover:text-redstone"
                >
                  <LogOut className="h-5 w-5 shrink-0" strokeWidth={2.25} />
                  Sair
                </button>
              </form>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

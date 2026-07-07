import Link from "next/link";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { NavList } from "@/components/shell/NavList";
import { GuiaLink } from "@/components/shell/GuiaLink";
import { UnitFilter } from "@/components/shell/UnitFilter";
import { Wordmark } from "@/components/ui/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MobileMoreMenu } from "@/components/shell/MobileMoreMenu";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/utils";
import type { SessionContext } from "@/lib/auth";
import type { Unit } from "@/types/database";

export function AppShell({
  ctx,
  units,
  currentUnit,
  children,
}: {
  ctx: SessionContext;
  units: Unit[];
  currentUnit: string | null;
  children: ReactNode;
}) {
  // Fixed-unit users no longer get a loud pill — their unit is evident from
  // context (the "Unidade" tile, culto header, etc.), so it isn't repeated next
  // to their name. Global admins keep the UnitFilter control.
  const isGlobal = !ctx.profile.unit_id;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Sidebar (desktop) — full viewport height, stays put while content scrolls */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-night-700 bg-night-900 p-4 md:sticky md:top-0 md:flex md:h-dvh">
        <div className="px-1 py-2">
          <Wordmark />
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          <NavList role={ctx.profile.role} variant="side" />
        </nav>
        <div className="mt-auto border-t border-night-700 pt-2">
          <GuiaLink variant="side" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-night-700 bg-night-900/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Wordmark size="sm" />
          </div>
          {isGlobal ? (
            <div className="hidden md:block">
              <UnitFilter units={units} current={currentUnit} />
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/conta"
              className="hidden rounded-md px-2 py-1 text-right transition-colors hover:bg-night-800 sm:block"
              title="Minha conta"
            >
              <div className="text-sm font-semibold leading-tight text-ink">
                {ctx.profile.full_name}
              </div>
              <div className="text-xs text-muted">
                {ROLE_LABELS[ctx.profile.role]}
              </div>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                title="Sair"
                className="grid h-10 w-10 place-items-center border border-night-700 text-muted transition-colors hover:border-redstone hover:text-redstone"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
                <span className="sr-only">Sair</span>
              </button>
            </form>
          </div>
        </header>

        {/* Mobile unit filter row — only the global admin's switcher (fixed-unit
            users see their unit as text in the header / "Mais" menu instead). */}
        {isGlobal ? (
          <div className="flex items-center border-b border-night-700 bg-night-850 px-4 py-2 md:hidden">
            <UnitFilter units={units} current={currentUnit} />
          </div>
        ) : null}

        {/* Content */}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom tab bar (mobile): 4 primary tabs + "Mais" (overflow + profile). */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-night-700 bg-night-900 md:hidden">
        <NavList role={ctx.profile.role} variant="bottom" />
        <MobileMoreMenu
          role={ctx.profile.role}
          userName={ctx.profile.full_name}
          roleLabel={ROLE_LABELS[ctx.profile.role]}
        />
      </nav>
    </div>
  );
}

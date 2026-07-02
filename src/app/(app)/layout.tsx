import { requireSession } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import type { Unit } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);

  // Only the global admin needs the unit switcher (+ the list of units).
  let units: Unit[] = [];
  if (scope.canSwitch) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("code");
    units = data ?? [];
  }

  return (
    <AppShell ctx={ctx} units={units} currentUnit={scope.code}>
      {children}
    </AppShell>
  );
}

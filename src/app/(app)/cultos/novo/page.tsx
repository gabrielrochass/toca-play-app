import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SessionForm } from "../SessionForm";
import { createSession } from "../actions";
import type { Unit, UnitService } from "@/types/database";

export default async function NovoCultoPage() {
  const ctx = await requireSession();
  const supabase = await createClient();

  // Services the user can see (RLS: unit admin only theirs; global all units).
  const { data: services } = await supabase
    .from("unit_services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  let units: Unit[] | undefined;
  if (!ctx.profile.unit_id) {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("code");
    units = data ?? [];
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Novo culto" subtitle="Escolha a data e o horário do culto." />
      <Card>
        <SessionForm
          action={createSession}
          units={units}
          services={(services ?? []) as UnitService[]}
          defaultUnitId={ctx.profile.unit_id}
          defaultDate={toISODate(new Date())}
        />
      </Card>
    </div>
  );
}

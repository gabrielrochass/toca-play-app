import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EventForm } from "../EventForm";
import { createEvent } from "../actions";
import type { Unit } from "@/types/database";

export default async function NovoEventoPage() {
  const ctx = await requireSession();
  const supabase = await createClient();

  // A unit user scopes to their own unit only; a global admin to any unit.
  // ("Todas" is always offered by the form.)
  let units: Unit[] = [];
  if (ctx.profile.unit_id) {
    if (ctx.unit) units = [ctx.unit];
  } else {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("code");
    units = data ?? [];
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Novo evento"
        subtitle="Defina o nome, quando acontece e para quais unidades."
      />
      <Card>
        <EventForm
          action={createEvent}
          units={units}
          defaultDate={toISODate(new Date())}
        />
      </Card>
    </div>
  );
}

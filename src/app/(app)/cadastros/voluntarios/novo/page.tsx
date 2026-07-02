import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { VolunteerForm } from "../VolunteerForm";
import { createVolunteer } from "../actions";
import type { Unit } from "@/types/database";

export default async function NovoVoluntarioPage() {
  const ctx = await requireRole("unit_admin");

  let units: Unit[] | undefined;
  if (!ctx.profile.unit_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("code");
    units = data ?? [];
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Novo voluntário" />
      <Card>
        <VolunteerForm
          action={createVolunteer}
          units={units}
          submitLabel="Cadastrar voluntário"
        />
      </Card>
    </div>
  );
}

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TeenForm } from "../TeenForm";
import { createTeen } from "../actions";
import type { Unit } from "@/types/database";

export default async function NovoPreAdolescentePage() {
  const ctx = await requireSession();

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
    <div className="max-w-3xl">
      <PageHeader
        title="Novo pré-adolescente"
        subtitle="Um ID será gerado automaticamente."
      />
      <Card>
        <TeenForm action={createTeen} units={units} submitLabel="Cadastrar" />
      </Card>
    </div>
  );
}

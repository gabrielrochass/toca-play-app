import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TeenForm } from "../../TeenForm";
import { updateTeen } from "../../actions";

export default async function EditarPreAdolescentePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;

  const supabase = await createClient();
  const { data: teen } = await supabase
    .from("teens")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!teen) notFound();

  const action = updateTeen.bind(null, teen.id);

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Editar pré-adolescente"
        subtitle={`${teen.display_id} · ${teen.name}`}
      />
      <Card>
        <TeenForm action={action} teen={teen} submitLabel="Salvar alterações" />
      </Card>
    </div>
  );
}

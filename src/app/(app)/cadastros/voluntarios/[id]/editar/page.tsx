import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { VolunteerForm } from "../../VolunteerForm";
import { updateVolunteer } from "../../actions";

export default async function EditarVoluntarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("unit_admin");
  const { id } = await params;

  const supabase = await createClient();
  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!volunteer) notFound();

  const action = updateVolunteer.bind(null, volunteer.id);

  return (
    <div className="max-w-lg">
      <PageHeader title="Editar voluntário" subtitle={volunteer.name} />
      <Card>
        <VolunteerForm
          action={action}
          volunteer={volunteer}
          submitLabel="Salvar alterações"
        />
      </Card>
    </div>
  );
}

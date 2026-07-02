import { requireSession } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { AccountForms } from "./AccountForms";

export default async function ContaPage() {
  const ctx = await requireSession();

  return (
    <>
      <PageHeader
        title="Minha conta"
        subtitle="Edite seu perfil, e-mail de acesso e senha."
        action={
          <Chip tone="night">
            {ROLE_LABELS[ctx.profile.role]}
            {ctx.unit ? ` · ${ctx.unit.code}` : ""}
          </Chip>
        }
      />
      <AccountForms
        initialName={ctx.profile.full_name}
        currentEmail={ctx.email ?? ""}
      />
    </>
  );
}

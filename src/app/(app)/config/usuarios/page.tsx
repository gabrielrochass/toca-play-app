import { requireRole, isGlobalAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { UsersList } from "./UsersList";
import { AddUserButton } from "./AddUserButton";
import type { Unit } from "@/types/database";

export default async function UsuariosPage() {
  const ctx = await requireRole("unit_admin");
  const global = isGlobalAdmin(ctx);
  const supabase = await createClient();

  // Global admin picks a unit in the wizard; unit admin is locked to their own.
  let units: Unit[] = [];
  if (global) {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("code");
    units = data ?? [];
  }

  // RLS scopes this: global admin sees everyone, unit admin only their unit.
  const { data: rawUsers } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, unit_id")
    .order("full_name");

  const { data: allUnits } = await supabase.from("units").select("id, code");
  const codeOf = new Map((allUnits ?? []).map((u) => [u.id, u.code]));
  const users = (rawUsers ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    is_active: u.is_active,
    unitLabel:
      u.role === "global_admin"
        ? "Geral"
        : u.unit_id
          ? (codeOf.get(u.unit_id) ?? "—")
          : "—",
  }));

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle={
          global
            ? "Todos os usuários. Voluntários fazem check-in; admins gerenciam."
            : "Usuários da sua unidade."
        }
        action={
          <AddUserButton
            canCreateGlobal={global}
            units={units}
            actorUnitId={ctx.profile.unit_id}
          />
        }
      />

      {!users?.length ? (
        <EmptyState title="Nenhum usuário" />
      ) : (
        <UsersList
          users={users}
          currentUserId={ctx.userId}
          canAssignGlobal={global}
        />
      )}
    </>
  );
}

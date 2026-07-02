"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, KeyRound, Power, Search } from "lucide-react";
import { cn, ROLE_LABELS } from "@/lib/utils";
import { defaultPassword } from "@/lib/naming";
import { Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { updateUserProfile, setUserActive, resetUserPassword } from "./actions";
import type { AppRole } from "@/types/database";

export interface UserRow {
  id: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  unitLabel: string;
}

type StatusFilter = "all" | "active" | "inactive";

export function UsersList({
  users,
  currentUserId,
  canAssignGlobal,
}: {
  users: UserRow[];
  currentUserId: string;
  canAssignGlobal: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [edit, setEdit] = useState<UserRow | null>(null);
  const [reset, setReset] = useState<UserRow | null>(null);
  const [toggle, setToggle] = useState<UserRow | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && !u.is_active) return false;
      if (filter === "inactive" && u.is_active) return false;
      if (term && !u.full_name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [users, q, filter]);

  const run = (fn: () => Promise<void>) => startTransition(fn);
  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "active", label: "Ativos" },
    { key: "inactive", label: "Inativos" },
    { key: "all", label: "Todos" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar usuário"
            className="pl-icon"
            aria-label="Buscar usuário"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                filter === f.key
                  ? "border-orange/60 bg-orange/15 text-orange"
                  : "border-night-600 text-muted hover:text-ink",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-night-700 text-muted">
              <th className="px-4 py-2.5 font-semibold">Nome</th>
              <th className="px-4 py-2.5 font-semibold">Papel</th>
              <th className="px-4 py-2.5 font-semibold">Unidade</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr
                  key={u.id}
                  className="border-b border-night-800 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {u.full_name}
                    {isSelf ? (
                      <span className="ml-2 text-xs text-muted">(você)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {ROLE_LABELS[u.role]}
                  </td>
                  <td className="px-4 py-2.5">
                    <Chip tone={u.role === "global_admin" ? "gold" : "night"}>
                      {u.unitLabel}
                    </Chip>
                  </td>
                  <td className="px-4 py-2.5">
                    <Chip tone={u.is_active ? "grass" : "night"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Chip>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn title="Editar" onClick={() => setEdit(u)}>
                        <Pencil className="h-4 w-4" strokeWidth={2.5} />
                      </IconBtn>
                      {!isSelf ? (
                        <>
                          <IconBtn
                            title="Resetar senha"
                            onClick={() => setReset(u)}
                          >
                            <KeyRound className="h-4 w-4" strokeWidth={2.5} />
                          </IconBtn>
                          <IconBtn
                            title={u.is_active ? "Inativar" : "Reativar"}
                            tone={u.is_active ? "danger" : "grass"}
                            onClick={() => setToggle(u)}
                          >
                            <Power className="h-4 w-4" strokeWidth={2.5} />
                          </IconBtn>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Nenhum usuário nesse filtro.
          </p>
        ) : null}
      </div>

      {/* Edit modal */}
      {edit ? (
        <EditUserModal
          user={edit}
          isSelf={edit.id === currentUserId}
          canAssignGlobal={canAssignGlobal}
          pending={pending}
          onSave={(fullName, role) =>
            run(async () => {
              await updateUserProfile(edit.id, fullName, role);
              setEdit(null);
            })
          }
          onClose={() => setEdit(null)}
        />
      ) : null}

      {/* Reset password confirm */}
      <ConfirmModal
        open={!!reset}
        title="Resetar senha"
        message={
          reset ? (
            <>
              A senha de <strong className="text-ink">{reset.full_name}</strong>{" "}
              será redefinida para{" "}
              <strong className="text-gold">{defaultPassword(reset.full_name)}</strong>
              . Avise a pessoa.
            </>
          ) : null
        }
        confirmLabel="Resetar senha"
        variant="amber"
        pending={pending}
        onConfirm={() => {
          const u = reset;
          if (!u) return;
          run(async () => {
            await resetUserPassword(u.id);
            setReset(null);
          });
        }}
        onClose={() => setReset(null)}
      />

      {/* Activate / inactivate confirm */}
      <ConfirmModal
        open={!!toggle}
        title={toggle?.is_active ? "Inativar usuário" : "Reativar usuário"}
        message={
          toggle ? (
            <>
              {toggle.is_active ? "Inativar" : "Reativar"}{" "}
              <strong className="text-ink">{toggle.full_name}</strong>?
              {toggle.is_active
                ? " A pessoa perde o acesso até ser reativada."
                : ""}
            </>
          ) : null
        }
        confirmLabel={toggle?.is_active ? "Inativar" : "Reativar"}
        variant={toggle?.is_active ? "danger" : "grass"}
        pending={pending}
        onConfirm={() => {
          const u = toggle;
          if (!u) return;
          run(async () => {
            await setUserActive(u.id, !u.is_active);
            setToggle(null);
          });
        }}
        onClose={() => setToggle(null)}
      />
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  tone?: "danger" | "grass";
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:text-ink",
        tone === "danger" && "hover:border-redstone hover:text-redstone",
        tone === "grass" && "hover:border-grass hover:text-grass",
      )}
    >
      {children}
      <span className="sr-only">{title}</span>
    </button>
  );
}

function EditUserModal({
  user,
  isSelf,
  canAssignGlobal,
  pending,
  onSave,
  onClose,
}: {
  user: UserRow;
  isSelf: boolean;
  canAssignGlobal: boolean;
  pending: boolean;
  onSave: (fullName: string, role: AppRole) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.full_name);
  const [role, setRole] = useState<AppRole>(user.role);

  return (
    <Modal open onClose={onClose} title="Editar usuário">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Nome</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Papel</span>
          <Select
            value={role}
            disabled={isSelf}
            onChange={(e) => setRole(e.target.value as AppRole)}
          >
            <option value="volunteer">Voluntário</option>
            <option value="unit_admin">Admin da unidade</option>
            {canAssignGlobal || role === "global_admin" ? (
              <option value="global_admin">Admin geral</option>
            ) : null}
          </Select>
          {isSelf ? (
            <span className="mt-1 block text-xs text-muted">
              Você não pode mudar o próprio papel.
            </span>
          ) : null}
        </label>
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="grass"
            disabled={pending || name.trim().length < 2}
            onClick={() => onSave(name, role)}
          >
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

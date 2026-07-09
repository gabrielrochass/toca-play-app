"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Unit } from "@/types/database";

// Loaded only when the admin opens the wizard.
const NewUserWizard = dynamic(() =>
  import("./NewUserWizard").then((m) => m.NewUserWizard),
);

export function AddUserButton({
  canCreateGlobal,
  units,
  actorUnitId,
}: {
  canCreateGlobal: boolean;
  units: Unit[];
  actorUnitId: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="grass" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={3} /> Adicionar usuário
      </Button>
      {open ? (
        <NewUserWizard
          onClose={() => setOpen(false)}
          canCreateGlobal={canCreateGlobal}
          units={units}
          actorUnitId={actorUnitId}
        />
      ) : null}
    </>
  );
}

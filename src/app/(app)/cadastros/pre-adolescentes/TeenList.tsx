"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { SexIcon } from "@/components/ui/SexIcon";
import { TeenDetailModal, type TeenDetail } from "@/components/TeenDetailModal";
import { ageAt } from "@/lib/age";
import { setTeenActive } from "./actions";

export function TeenList({
  teens,
  refDate,
  showInactive = false,
}: {
  teens: TeenDetail[];
  refDate: string;
  showInactive?: boolean;
}) {
  const [selected, setSelected] = useState<TeenDetail | null>(null);

  return (
    <>
      <ul className="flex flex-col gap-2">
        {teens.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setSelected(t)}
              title={`Ver e editar ${t.name}`}
              className="group panel flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:border-orange/50 hover:bg-night-800"
            >
              {/* Name is primary; the code is a small secondary line so it never
                  crowds out the name on narrow screens. */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-semibold text-ink">
                  {t.name}
                </span>
                <span className="font-mono text-xs leading-tight text-muted">
                  {t.display_id}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted">
                <SexIcon sex={t.sex} className="h-4 w-4" />
                {ageAt(t.birthdate, refDate)} anos
              </span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-night-700 text-muted transition-colors group-hover:border-orange group-hover:text-orange">
                <Pencil className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <TeenDetailModal
        teen={selected}
        refDate={refDate}
        onClose={() => setSelected(null)}
        onRemove={showInactive ? undefined : (id) => setTeenActive(id, false)}
        onReactivate={showInactive ? (id) => setTeenActive(id, true) : undefined}
      />
    </>
  );
}

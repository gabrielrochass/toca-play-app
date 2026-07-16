import { notFound } from "next/navigation";
import { requireSession, hasAtLeast, isGlobalAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ageAt } from "@/lib/age";
import { formatDateBR, formatTimeBR } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { MapPin, Globe } from "lucide-react";
import { unitTone } from "@/lib/units";
import { BoardHeaderActions } from "@/components/ui/BoardHeaderActions";
import { EventBoard, type BoardRow } from "./EventBoard";
import { closeEvent, reopenEvent, deleteEvent } from "../actions";
import type { Unit } from "@/types/database";

export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, unit_id, name, event_date, start_time, location, notes, closed_at")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  // Enriched roster (teens across units + visitors), gated by event access.
  const { data: roster } = await supabase.rpc("event_roster", { p_event: id });

  const rows: BoardRow[] = (roster ?? []).map((r) => ({
    id: r.checkin_id,
    name: r.name,
    isVisitor: r.is_visitor,
    unitCode: r.unit_code,
    sex: r.sex,
    age: r.birthdate ? ageAt(r.birthdate, event.event_date) : null,
    status: r.status,
    guardianName: r.guardian_name,
    guardianPhone: r.guardian_phone,
  }));

  // Units the operator can route a NEW teen to: on a "Todas" event, any unit
  // (cross-unit is allowed via the controlled RPC); on a unit event, just that
  // unit. units_sel RLS lets any authenticated user read the unit list.
  const { data: unitRows } = await supabase
    .from("units")
    .select("*")
    .eq("is_active", true)
    .order("code");
  const allUnits = (unitRows ?? []) as Unit[];
  const registerUnits = event.unit_id
    ? allUnits.filter((u) => u.id === event.unit_id)
    : allUnits;

  const code = event.unit_id
    ? allUnits.find((u) => u.id === event.unit_id)?.code ?? null
    : null;

  // Delete is admin-only and follows the RLS scope: global admin for any event;
  // a unit admin only for their OWN unit's event (never a "Todas" event).
  const canDelete =
    isGlobalAdmin(ctx) ||
    (hasAtLeast(ctx.profile.role, "unit_admin") &&
      event.unit_id != null &&
      event.unit_id === ctx.profile.unit_id);

  // Close is allowed once everyone has left (server re-checks); mirrors the board.
  const closed = Boolean(event.closed_at);
  const everyoneLeft =
    rows.length > 0 && rows.every((r) => r.status === "left");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={event.name}
        subtitle={
          [
            event.event_date ? formatDateBR(event.event_date) : null,
            event.start_time ? formatTimeBR(event.start_time) : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        action={
          <BoardHeaderActions
            closed={closed}
            canClose={everyoneLeft}
            closeHint="Libere a saída de todos para encerrar"
            closeLabel="Encerrar evento"
            reopenLabel="Reabrir evento"
            onClose={closeEvent.bind(null, id)}
            onReopen={reopenEvent.bind(null, id)}
            canReopen={hasAtLeast(ctx.profile.role, "unit_admin")}
            onDelete={canDelete ? deleteEvent.bind(null, id) : undefined}
            deleteLabel="Excluir evento"
            deleteMessage={
              <>
                Isto remove <b className="text-ink">{event.name}</b> e todos os
                check-ins e visitantes dele. Os pré-adolescentes cadastrados
                continuam nas suas unidades. Esta ação não pode ser desfeita.
              </>
            }
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {event.unit_id && code ? (
          <Chip tone={unitTone(code)}>{code}</Chip>
        ) : (
          <span className="chip border border-night-600 text-muted">
            <Globe className="h-3 w-3" /> Todas as unidades
          </span>
        )}
        {event.location ? (
          <span className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" /> {event.location}
          </span>
        ) : null}
        {closed ? <Chip tone="night">Encerrado</Chip> : null}
      </div>

      {event.notes ? (
        <p className="block-flat p-3 text-sm text-muted">{event.notes}</p>
      ) : null}

      <EventBoard
        eventId={id}
        eventName={event.name}
        eventDate={event.event_date}
        scopeUnitId={event.unit_id}
        registerUnits={registerUnits}
        rows={rows}
        closed={closed}
      />
    </div>
  );
}

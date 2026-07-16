import Link from "next/link";
import { Plus, Users, ChevronRight, MapPin, Globe } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR, formatTimeBR } from "@/lib/utils";
import { unitTone } from "@/lib/units";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

export default async function EventosPage() {
  await requireSession();
  const supabase = await createClient();

  // RLS already limits rows to events the user can access (global + own unit +
  // "Todas"), so no extra unit filter is needed here.
  const { data: events } = await supabase
    .from("events")
    .select("id, unit_id, name, event_date, start_time, location, closed_at")
    .order("event_date", { ascending: false })
    .order("start_time", { ascending: true })
    .limit(100);

  const eventIds = (events ?? []).map((e) => e.id);

  // One round-trip for all check-ins of the visible events; aggregate present
  // counts per event in JS (avoids an N+1 count-per-event).
  const presentByEvent = new Map<string, number>();
  if (eventIds.length) {
    const { data: cis } = await supabase
      .from("event_checkins")
      .select("event_id, status")
      .in("event_id", eventIds)
      .eq("status", "present");
    for (const c of cis ?? [])
      presentByEvent.set(c.event_id, (presentByEvent.get(c.event_id) ?? 0) + 1);
  }

  // Unit codes for the scope chips (an event may belong to any unit or none).
  const unitCodeById = new Map<string, string>();
  const { data: unitRows } = await supabase.from("units").select("id, code");
  for (const u of unitRows ?? []) unitCodeById.set(u.id, u.code);

  return (
    <>
      <PageHeader
        title="Eventos"
        subtitle="Eventos especiais para todas as unidades ou uma específica — mesmo check-in e saída dos cultos, com visitantes."
        action={
          <Link href="/eventos/novo">
            <Button variant="grass" size="sm">
              <Plus className="h-4 w-4" strokeWidth={3} /> Novo evento
            </Button>
          </Link>
        }
      />

      {!events?.length ? (
        <EmptyState
          title="Nenhum evento ainda"
          hint="Crie um evento para receber os pré-adolescentes das unidades e visitantes."
          action={
            <Link href="/eventos/novo">
              <Button variant="grass" size="sm">
                Criar evento
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {events.map((e) => {
            const code = e.unit_id ? unitCodeById.get(e.unit_id) : null;
            return (
              <li key={e.id}>
                <Link
                  href={`/eventos/${e.id}`}
                  className="panel flex items-center gap-4 p-4 transition-colors hover:border-night-600 hover:bg-night-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-ink">
                      {e.name}
                    </div>
                    <div className="mt-1 font-mono text-sm text-muted">
                      {e.event_date ? formatDateBR(e.event_date) : "—"}
                      {e.start_time ? ` · ${formatTimeBR(e.start_time)}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {e.unit_id && code ? (
                        <Chip tone={unitTone(code)}>{code}</Chip>
                      ) : (
                        <span className="chip border border-night-600 text-muted">
                          <Globe className="h-3 w-3" /> Todas
                        </span>
                      )}
                      {e.location ? (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <MapPin className="h-3.5 w-3.5" /> {e.location}
                        </span>
                      ) : null}
                      {e.closed_at ? (
                        <Chip tone="night">Encerrado</Chip>
                      ) : (
                        <Chip tone="grass">Aberto</Chip>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted">
                    <Users className="h-4 w-4" />
                    <span className="font-mono text-2xl text-grass">
                      {presentByEvent.get(e.id) ?? 0}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

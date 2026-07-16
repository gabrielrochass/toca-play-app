import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession, hasAtLeast } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/utils";
import { unitTone } from "@/lib/units";
import { Chip } from "@/components/ui/Chip";
import { BoardHeaderActions } from "@/components/ui/BoardHeaderActions";
import { SessionTabs } from "./SessionTabs";
import { closeSession, reopenSession } from "./actions";
import { getSession, getServiceLabel, getUnit } from "./session";

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireSession();
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const scope = await getUnitScope(ctx);
  const serviceLabel = await getServiceLabel(session.service_id);
  // A global admin navigates across units — show which unit this culto belongs to.
  const unit = scope.canSwitch ? await getUnit(session.unit_id) : null;

  // Encerrar is allowed once everyone has left (server re-checks in closeSession).
  const supabase = await createClient();
  const [{ count: total }, { count: notLeft }] = await Promise.all([
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("session_id", id),
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("session_id", id)
      .neq("status", "left"),
  ]);
  const closed = Boolean(session.closed_at);
  const everyoneLeft = (total ?? 0) > 0 && (notLeft ?? 0) === 0;

  return (
    <div>
      <Link
        href="/cultos"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Todos os cultos
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-3xl leading-none text-ink">
          {formatDateBR(session.session_date)}
        </h1>
        {unit ? (
          <Chip tone={unitTone(unit.code)} title={unit.name}>
            {unit.code} · {unit.name}
          </Chip>
        ) : null}
        <Chip tone="gold">{serviceLabel ?? ""}</Chip>
        {closed ? <Chip tone="night">Encerrado</Chip> : null}
        <div className="ml-auto">
          <BoardHeaderActions
            closed={closed}
            canClose={everyoneLeft}
            closeHint="Libere a saída de todos para encerrar"
            closeLabel="Encerrar culto"
            reopenLabel="Reabrir culto"
            onClose={closeSession.bind(null, id)}
            onReopen={reopenSession.bind(null, id)}
            canReopen={hasAtLeast(ctx.profile.role, "unit_admin")}
          />
        </div>
      </div>

      <SessionTabs sessionId={id} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { formatDateBR } from "@/lib/utils";
import { unitTone } from "@/lib/units";
import { Chip } from "@/components/ui/Chip";
import { SessionTabs } from "./SessionTabs";
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
        {session.closed_at ? <Chip tone="night">Encerrado</Chip> : null}
      </div>

      <SessionTabs sessionId={id} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

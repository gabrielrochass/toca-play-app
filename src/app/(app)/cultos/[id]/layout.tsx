import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/utils";
import { Chip } from "@/components/ui/Chip";
import { SessionTabs } from "./SessionTabs";

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!session) notFound();

  const { data: service } = await supabase
    .from("unit_services")
    .select("label")
    .eq("id", session.service_id)
    .maybeSingle();

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
        <Chip tone="gold">{service?.label ?? ""}</Chip>
        {session.closed_at ? <Chip tone="night">Encerrado</Chip> : null}
      </div>

      <SessionTabs sessionId={id} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

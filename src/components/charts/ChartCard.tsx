import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/PageHeader";

export function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3">
        <h3 className="font-display text-[0.72rem] text-ink [word-spacing:-0.1em]">
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {empty ? (
        <EmptyState title="Sem dados ainda" hint="Os gráficos aparecem após os primeiros cultos." />
      ) : (
        children
      )}
    </div>
  );
}

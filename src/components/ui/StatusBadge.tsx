import { Chip } from "@/components/ui/Chip";
import type { CheckinStatus } from "@/types/database";

const MAP: Record<
  CheckinStatus,
  { label: string; tone: "grass" | "night" }
> = {
  present: { label: "Presente", tone: "grass" },
  authorized_to_leave: { label: "Liberado", tone: "night" },
  left: { label: "Liberado", tone: "night" },
};

export function StatusBadge({ status }: { status: CheckinStatus }) {
  const { label, tone } = MAP[status];
  return <Chip tone={tone}>{label}</Chip>;
}

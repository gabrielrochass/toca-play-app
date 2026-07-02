import { Chip } from "@/components/ui/Chip";
import type { Unit } from "@/types/database";

const UNIT_TONE: Record<string, "grass" | "diamond" | "terra"> = {
  CF: "grass",
  BV: "diamond",
  RA: "terra",
};

export function UnitBadge({ unit }: { unit: Unit | null }) {
  if (!unit) {
    return <Chip tone="gold">Todas as unidades</Chip>;
  }
  return (
    <Chip tone={UNIT_TONE[unit.code] ?? "night"} title={unit.name}>
      {unit.code} · {unit.name}
    </Chip>
  );
}

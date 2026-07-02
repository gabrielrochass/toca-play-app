const TONE: Record<string, string> = {
  grass: "text-grass",
  gold: "text-gold",
  amber: "text-amber",
  diamond: "text-diamond",
  terra: "text-terra",
  ink: "text-ink",
};

export function StatTile({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number | string;
  tone?: keyof typeof TONE;
}) {
  return (
    <div className="panel px-4 py-4">
      <div className={`font-mono text-4xl leading-none ${TONE[tone]}`}>
        {value}
      </div>
      <div className="eyebrow mt-2">{label}</div>
    </div>
  );
}

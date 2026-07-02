"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, Boxes, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

export function SessionTabs({ sessionId }: { sessionId: string }) {
  const pathname = usePathname();
  const base = `/cultos/${sessionId}`;
  const tabs = [
    { href: base, label: "Check-in", icon: UserCheck },
    { href: `${base}/voluntarios`, label: "Voluntários", icon: HeartHandshake },
    { href: `${base}/grupos`, label: "Grupos", icon: Boxes },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active =
          t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              active
                ? "border-night-600 bg-night-800 text-orange"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <t.icon className="h-4 w-4" strokeWidth={2.5} />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

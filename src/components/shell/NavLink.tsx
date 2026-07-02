"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  label,
  icon: Icon,
  variant = "side",
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "side" | "bottom";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bottom") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[0.6rem] font-medium",
          active ? "text-orange" : "text-muted",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "border-orange bg-night-800 text-ink"
          : "border-transparent text-muted hover:bg-night-850 hover:text-ink",
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", active ? "text-orange" : "")}
        strokeWidth={2.25}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

"use client";

import { NAV_ITEMS } from "./nav";
import { NavLink } from "./NavLink";
import { hasAtLeast } from "@/lib/roles";
import type { AppRole } from "@/types/database";

/**
 * Renders the nav for a role. Client component so the lucide icon components
 * never cross the server→client boundary (only the role string does).
 */
export function NavList({
  role,
  variant,
}: {
  role: AppRole;
  variant: "side" | "bottom";
}) {
  const items = NAV_ITEMS.filter(
    (i) => !i.minRole || hasAtLeast(role, i.minRole),
  ).filter((i) => variant === "side" || i.mobile);

  return (
    <>
      {items.map((i) => (
        <NavLink
          key={i.href}
          href={i.href}
          label={variant === "bottom" ? (i.shortLabel ?? i.label) : i.label}
          icon={i.icon}
          variant={variant}
        />
      ))}
    </>
  );
}

"use client";

import { BookOpen } from "lucide-react";
import { NavLink } from "./NavLink";

/** The onboarding guide link — pinned at the bottom of the sidebar / mobile bar. */
export function GuiaLink({ variant }: { variant: "side" | "bottom" }) {
  return (
    <NavLink href="/guia" label="Guia" icon={BookOpen} variant={variant} />
  );
}

import {
  Home,
  CalendarDays,
  PartyPopper,
  Users,
  HeartHandshake,
  BarChart3,
  UserCog,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the cramped mobile bottom bar. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Minimum role required to see this item. */
  minRole?: AppRole;
  /** Show in the mobile bottom bar. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home, mobile: true },
  { href: "/cultos", label: "Cultos", icon: CalendarDays, mobile: true },
  // No mobile:true → lives in the "Mais" sheet, keeping the bottom bar at 4 tabs.
  { href: "/eventos", label: "Eventos", icon: PartyPopper },
  {
    href: "/cadastros/pre-adolescentes",
    label: "Pré-adolescentes",
    shortLabel: "Pré-adol.",
    icon: Users,
    mobile: true,
  },
  {
    href: "/cadastros/voluntarios",
    label: "Voluntários",
    icon: HeartHandshake,
    mobile: true,
  },
  // Estoque/Relatórios/Usuários live in the mobile "Mais" sheet (not the bottom
  // bar) — keeping the bar to 4 primary tabs avoids cramped labels on phones.
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  {
    href: "/config/usuarios",
    label: "Usuários",
    icon: UserCog,
    minRole: "unit_admin",
  },
];

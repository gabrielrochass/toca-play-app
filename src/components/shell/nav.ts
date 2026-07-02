import {
  Home,
  CalendarDays,
  Users,
  HeartHandshake,
  BarChart3,
  UserCog,
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
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, mobile: true },
  {
    href: "/config/usuarios",
    label: "Usuários",
    icon: UserCog,
    minRole: "unit_admin",
  },
];

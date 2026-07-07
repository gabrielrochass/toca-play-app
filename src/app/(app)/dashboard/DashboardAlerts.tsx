"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Cake, AlertTriangle, Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { NotifyTeen } from "@/app/(app)/cultos/[id]/NotifyGuardiansModal";

const NotifyGuardiansModal = dynamic(() =>
  import("@/app/(app)/cultos/[id]/NotifyGuardiansModal").then(
    (m) => m.NotifyGuardiansModal,
  ),
);

export interface BirthdayTeen {
  id: string;
  name: string;
  guardians: { name: string; phone: string }[];
  /** Unit code/name — present (and shown) only for a global admin on "Todas". */
  unitCode?: string | null;
  unitName?: string | null;
}

export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  min_quantity: number;
  unit_label: string;
  unitCode?: string | null;
}

export function DashboardAlerts({
  birthdays,
  lowStock,
  dateKey,
}: {
  birthdays: BirthdayTeen[];
  lowStock: LowStockItem[];
  dateKey: string;
}) {
  const [notify, setNotify] = useState<NotifyTeen[] | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  const hasAlerts = birthdays.length > 0 || lowStock.length > 0;

  // Auto-open a one-time popup per browser session (per day). The reveal is
  // scheduled in a rAF callback (not a synchronous setState in the effect body).
  useEffect(() => {
    if (!hasAlerts) return;
    const key = `tp-alerts-${dateKey}`;
    let raf = 0;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        raf = requestAnimationFrame(() => setPopupOpen(true));
      }
    } catch {
      /* sessionStorage unavailable — skip the popup */
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hasAlerts, dateKey]);

  if (!hasAlerts) return null;

  const notifyAll = () =>
    setNotify(
      birthdays.map((b) => ({
        id: b.id,
        name: b.name,
        guardians: b.guardians,
        unitName: b.unitName,
        unitCode: b.unitCode,
      })),
    );

  // Comma-separated names, each with a small unit chip when notifying across
  // units (global admin on "Todas"). Falls back to plain names otherwise.
  const nameList = (items: { id: string; name: string; unitCode?: string | null }[]) =>
    items.map((it, i) => (
      <span key={it.id}>
        {i > 0 ? ", " : ""}
        {it.name}
        {it.unitCode ? (
          <Chip tone="night" className="ml-1 px-1.5 py-0 text-[0.65rem]">
            {it.unitCode}
          </Chip>
        ) : null}
      </span>
    ));

  return (
    <>
      <div className="mb-5 flex flex-col gap-3">
        {birthdays.length > 0 ? (
          <div className="panel flex flex-wrap items-center justify-between gap-3 border-gold/50 bg-gold/5 p-4">
            <div className="flex items-start gap-3">
              <Cake className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={2.25} />
              <div>
                <p className="font-semibold text-ink">
                  {birthdays.length === 1
                    ? "Aniversariante de hoje"
                    : `${birthdays.length} aniversariantes de hoje`}
                </p>
                <p className="mt-0.5 text-sm text-muted">{nameList(birthdays)}</p>
              </div>
            </div>
            <Button size="sm" variant="gold" onClick={notifyAll}>
              Parabenizar responsáveis
            </Button>
          </div>
        ) : null}

        {lowStock.length > 0 ? (
          <div className="panel flex flex-wrap items-center justify-between gap-3 border-terra/50 bg-terra/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-terra"
                strokeWidth={2.25}
              />
              <div>
                <p className="font-semibold text-ink">
                  {lowStock.length === 1
                    ? "1 produto com baixo estoque"
                    : `${lowStock.length} produtos com baixo estoque`}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {lowStock.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 ? ", " : ""}
                      {p.name} ({p.quantity} {p.unit_label})
                      {p.unitCode ? (
                        <Chip tone="night" className="ml-1 px-1.5 py-0 text-[0.65rem]">
                          {p.unitCode}
                        </Chip>
                      ) : null}
                    </span>
                  ))}
                </p>
              </div>
            </div>
            <Link href="/estoque">
              <Button size="sm">
                <Package className="h-4 w-4" strokeWidth={2.5} /> Ver estoque
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      {popupOpen ? (
        <Modal open onClose={() => setPopupOpen(false)} title="Avisos de hoje">
          <div className="flex flex-col gap-4">
            {birthdays.length > 0 ? (
              <div className="flex items-start gap-2">
                <Cake className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <p className="text-sm text-ink">
                  <span className="font-semibold">Aniversário: </span>
                  {nameList(birthdays)}
                </p>
              </div>
            ) : null}
            {lowStock.length > 0 ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terra" />
                <p className="text-sm text-ink">
                  <span className="font-semibold">Baixo estoque: </span>
                  {nameList(lowStock)}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              {birthdays.length > 0 ? (
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => {
                    setPopupOpen(false);
                    notifyAll();
                  }}
                >
                  Parabenizar responsáveis
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setPopupOpen(false)}>
                Entendi
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {notify ? (
        <NotifyGuardiansModal
          teens={notify}
          variant="birthday"
          onClose={() => setNotify(null)}
        />
      ) : null}
    </>
  );
}

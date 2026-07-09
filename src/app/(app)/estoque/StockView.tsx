"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Archive,
  History,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Download,
} from "lucide-react";
import { cn, PRODUCT_CATEGORIES } from "@/lib/utils";
import { unitTone } from "@/lib/units";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Field, Input } from "@/components/ui/Field";

// Only loaded when the edit modal opens.
const ProductFormModal = dynamic(() =>
  import("./ProductFormModal").then((m) => m.ProductFormModal),
);
import {
  updateProduct,
  adjustStock,
  setProductActive,
  listMovements,
} from "./actions";

export interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  unit_label: string;
  quantity: number;
  min_quantity: number;
  /** Unit code — shown (row + confirm) only for a global admin on "Todas". */
  unitCode?: string | null;
}

/**
 * Stock status drives the row color: red at/below the minimum, yellow when
 * within 2 units of it, neutral otherwise.
 */
function statusOf(p: ProductRow) {
  const min = `${p.min_quantity} ${p.unit_label}`;
  if (p.quantity <= p.min_quantity)
    return {
      key: "low" as const,
      label: "Baixo",
      row: "bg-redstone/10 hover:bg-redstone/[0.16]",
      tip: `Abaixo do mínimo (${min})`,
    };
  if (p.quantity <= p.min_quantity + 2)
    return {
      key: "warn" as const,
      label: "Atenção",
      row: "bg-gold/10 hover:bg-gold/[0.16]",
      tip: `Perto do mínimo (${min})`,
    };
  return {
    key: "ok" as const,
    label: "OK",
    row: "hover:bg-night-800/40",
    tip: `Acima do mínimo (${min})`,
  };
}

export function StockView({
  products,
  canManage,
  unitId,
}: {
  products: ProductRow[];
  canManage: boolean;
  /** When focused on one unit, scope the realtime channel to it. Null = all. */
  unitId?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [adjusting, setAdjusting] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<ProductRow | null>(null);
  const [removing, setRemoving] = useState<ProductRow | null>(null);
  const [pending, start] = useTransition();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"all" | "low" | "warn" | "ok">("all");

  // Live low-stock updates across devices. When a single unit is in focus,
  // scope the subscription to it so other units' product changes don't trigger
  // needless refetches; on the "all units" view we do want every change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(unitId ? `products-${unitId}` : "products")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          ...(unitId ? { filter: `unit_id=eq.${unitId}` } : {}),
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, unitId]);

  const term = q.trim().toLowerCase();
  // filtered by search + category — status counts are computed over this set
  const bySearchCat = useMemo(
    () =>
      products.filter(
        (p) =>
          (!term || p.name.toLowerCase().includes(term)) &&
          (!category || p.category === category),
      ),
    [products, term, category],
  );
  const statusCounts = useMemo(() => {
    const c = { all: bySearchCat.length, low: 0, warn: 0, ok: 0 };
    for (const p of bySearchCat) c[statusOf(p).key]++;
    return c;
  }, [bySearchCat]);
  const filtered = useMemo(
    () =>
      status === "all"
        ? bySearchCat
        : bySearchCat.filter((p) => statusOf(p).key === status),
    [bySearchCat, status],
  );
  const hasFilter = Boolean(term || category || status !== "all");

  const STATUS_FILTERS = [
    { key: "all" as const, label: "Todos" },
    { key: "low" as const, label: "Baixo" },
    { key: "warn" as const, label: "Atenção" },
    { key: "ok" as const, label: "OK" },
  ];

  function exportCsv() {
    const header = ["Produto", "Categoria", "Quantidade", "Unidade", "Mínimo", "Status"];
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(";")];
    for (const p of filtered) {
      lines.push(
        [p.name, p.category ?? "", p.quantity, p.unit_label, p.min_quantity, statusOf(p).label]
          .map(esc)
          .join(";"),
      );
    }
    // BOM + CRLF so Excel (pt-BR) opens it cleanly.
    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    a.download = `estoque-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative h-10 min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto"
            className="h-10 pl-icon"
            aria-label="Buscar produto"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 shrink-0 rounded-md border border-night-600 bg-night-950 px-3 text-sm text-ink outline-none focus-visible:border-orange"
          aria-label="Filtrar por categoria"
        >
          <option value="">Categoria</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-night-600 bg-night-800 px-3.5 text-sm font-semibold text-ink transition-colors hover:border-orange disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" strokeWidth={2.5} /> Exportar
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            aria-pressed={status === f.key}
            className={cn(
              "h-9 rounded-md border px-3 text-xs font-semibold transition-colors",
              status === f.key
                ? "border-orange/60 bg-orange/15 text-orange"
                : "border-night-700 text-muted hover:text-ink",
            )}
          >
            {f.label} ({statusCounts[f.key]})
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-muted">
        <span className="font-mono text-sm text-ink">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "produto" : "produtos"}
        {hasFilter ? " no filtro" : ""}
      </p>

      {/* x-scroll on small screens; visible on lg so the status tooltip isn't
          clipped (the table fits without scrolling at that width). */}
      <div className="panel overflow-x-auto lg:overflow-visible">
        <table className="w-full min-w-xl text-left text-sm">
          <thead>
            <tr className="border-b border-night-700 bg-night-900/60">
              <th className="eyebrow px-4 py-3">Produto</th>
              <th className="eyebrow px-4 py-3">Categoria</th>
              <th className="eyebrow px-4 py-3">Estoque</th>
              <th className="eyebrow px-4 py-3">Status</th>
              <th className="eyebrow px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const s = statusOf(p);
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-night-800 transition-colors last:border-0",
                    s.row,
                  )}
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    <span className="flex items-center gap-2">
                      {p.name}
                      {p.unitCode ? (
                        <Chip tone={unitTone(p.unitCode)}>{p.unitCode}</Chip>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-base font-semibold tabular-nums text-ink">
                      {p.quantity}
                    </span>
                    <span className="ml-1 text-xs text-muted">{p.unit_label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Tooltip label={s.tip}>
                      <span className="inline-flex cursor-help items-center gap-1.5 text-xs font-medium leading-none text-muted">
                        {s.key !== "ok" ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                        ) : null}
                        <span className="leading-none">{s.label}</span>
                      </span>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Tooltip label="Movimentar (entrada/saída)">
                        <IconBtn
                          ariaLabel={`Movimentar ${p.name}`}
                          onClick={() => setAdjusting(p)}
                        >
                          <ArrowUpDown className="h-4 w-4" strokeWidth={2.5} />
                        </IconBtn>
                      </Tooltip>
                      <Tooltip label="Histórico">
                        <IconBtn
                          ariaLabel={`Histórico de ${p.name}`}
                          onClick={() => setHistory(p)}
                        >
                          <History className="h-4 w-4" strokeWidth={2.5} />
                        </IconBtn>
                      </Tooltip>
                      {canManage ? (
                        <>
                          <Tooltip label="Editar">
                            <IconBtn
                              ariaLabel={`Editar ${p.name}`}
                              onClick={() => setEditing(p)}
                            >
                              <Pencil className="h-4 w-4" strokeWidth={2.5} />
                            </IconBtn>
                          </Tooltip>
                          <Tooltip label="Inativar">
                            <IconBtn
                              ariaLabel={`Inativar ${p.name}`}
                              danger
                              onClick={() => setRemoving(p)}
                            >
                              <Archive className="h-4 w-4" strokeWidth={2.5} />
                            </IconBtn>
                          </Tooltip>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {hasFilter
              ? "Nenhum produto encontrado com esses filtros."
              : canManage
                ? "Nenhum produto cadastrado. Toque em “Novo produto” para começar."
                : "Nenhum produto cadastrado nesta unidade."}
          </p>
        ) : null}
      </div>

      {editing ? (
        <ProductFormModal
          title="Editar produto"
          action={updateProduct.bind(null, editing.id)}
          product={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {adjusting ? (
        <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} />
      ) : null}

      {history ? (
        <HistoryModal product={history} onClose={() => setHistory(null)} />
      ) : null}

      <ConfirmModal
        open={!!removing}
        title="Inativar produto"
        variant="danger"
        confirmLabel="Inativar"
        pending={pending}
        message={
          <>
            Inativar <b>{removing?.name}</b>
            {removing?.unitCode ? ` (unidade ${removing.unitCode})` : ""}? O
            histórico de movimentos é preservado.
          </>
        }
        onConfirm={() => {
          const p = removing;
          if (!p) return;
          start(async () => {
            await setProductActive(p.id, false);
            setRemoving(null);
          });
        }}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

function IconBtn({
  children,
  ariaLabel,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-md border border-night-700 text-muted transition-colors",
        danger
          ? "hover:border-redstone hover:text-redstone"
          : "hover:border-orange hover:text-orange",
      )}
    >
      {children}
    </button>
  );
}

function AdjustModal({
  product,
  onClose,
}: {
  product: ProductRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const n = Number(amount);
  const valid = Number.isInteger(n) && n > 0;

  function submit() {
    if (!valid) {
      setError("Informe uma quantidade válida.");
      return;
    }
    const delta = mode === "in" ? n : -n;
    start(async () => {
      const res = await adjustStock(product.id, delta, reason);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title={`Movimentar · ${product.name}`}>
      <div className="flex flex-col gap-4">
        <div className="text-sm text-muted">
          Em estoque:{" "}
          <span className="font-mono text-ink">
            {product.quantity} {product.unit_label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("in")}
            aria-pressed={mode === "in"}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-semibold transition-colors",
              mode === "in"
                ? "border-grass-dark bg-grass/15 text-grass"
                : "border-night-700 text-muted hover:text-ink",
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} /> Entrada
          </button>
          <button
            type="button"
            onClick={() => setMode("out")}
            aria-pressed={mode === "out"}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-semibold transition-colors",
              mode === "out"
                ? "border-redstone bg-redstone/15 text-redstone"
                : "border-night-700 text-muted hover:text-ink",
            )}
          >
            <ArrowDown className="h-4 w-4" strokeWidth={2.5} /> Saída
          </button>
        </div>

        <Field label="Quantidade">
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            autoFocus
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Motivo" hint="Opcional (ex: compra, doação, uso no culto)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>

        {error ? (
          <p className="text-sm font-medium text-redstone">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant={mode === "in" ? "grass" : "danger"}
            onClick={submit}
            disabled={pending || !valid}
          >
            {pending
              ? "Salvando…"
              : mode === "in"
                ? "Registrar entrada"
                : "Registrar saída"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryModal({
  product,
  onClose,
}: {
  product: ProductRow;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<
    { id: string; delta: number; reason: string | null; created_at: string }[] | null
  >(null);

  useEffect(() => {
    let active = true;
    listMovements(product.id).then((data) => {
      if (active) setRows(data);
    });
    return () => {
      active = false;
    };
  }, [product.id]);

  return (
    <Modal open onClose={onClose} title={`Histórico · ${product.name}`}>
      {rows === null ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum movimento registrado ainda.</p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
          {rows.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 border-b border-night-800 py-2 last:border-0"
            >
              <div className="min-w-0">
                <span
                  className={cn(
                    "font-mono text-sm font-semibold",
                    m.delta >= 0 ? "text-grass" : "text-redstone",
                  )}
                >
                  {m.delta >= 0 ? `+${m.delta}` : m.delta}
                </span>
                <span className="ml-2 text-sm text-muted">
                  {m.reason ?? (m.delta >= 0 ? "Entrada" : "Saída")}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {formatDateTime(m.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

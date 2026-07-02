"use client";

import { MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { guardianMessage, waLink } from "@/lib/whatsapp";

export interface NotifyTeen {
  id: string;
  name: string;
  guardianName: string;
  guardianPhone: string;
}

export function NotifyGuardiansModal({
  teens,
  onClose,
}: {
  teens: NotifyTeen[];
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Notificar responsáveis">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Avisa que o culto terminou e o filho está esperando. Toque em cada
          responsável para enviar pelo WhatsApp.
        </p>

        {teens.length === 0 ? (
          <p className="text-sm text-muted">Ninguém presente para notificar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teens.map((t) => {
              const link = waLink(
                t.guardianPhone,
                guardianMessage(t.name, t.guardianName),
              );
              return (
                <li
                  key={t.id}
                  className="block-flat flex items-center gap-3 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink">{t.name}</div>
                    <div className="truncate text-xs text-muted">
                      {t.guardianName} · {t.guardianPhone || "sem telefone"}
                    </div>
                  </div>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mc-btn mc-btn-sm mc-btn-grass"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-muted">sem telefone</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

"use client";

import { MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { guardianMessage, birthdayMessage, waLink } from "@/lib/whatsapp";

export interface NotifyGuardian {
  name: string;
  phone: string;
}

export interface NotifyTeen {
  id: string;
  name: string;
  guardians: NotifyGuardian[];
  /** Unit name — shown + woven into the message (useful across units). */
  unitName?: string | null;
  /** Unit code — shown as a small chip when notifying across units. */
  unitCode?: string | null;
}

export function NotifyGuardiansModal({
  teens,
  variant = "end",
  onClose,
}: {
  teens: NotifyTeen[];
  /** "end" = culto acabou; "birthday" = aniversário. Picks the message. */
  variant?: "end" | "birthday";
  onClose: () => void;
}) {
  const title =
    variant === "birthday" ? "Parabenizar responsáveis" : "Notificar responsáveis";
  const intro =
    variant === "birthday"
      ? "Envie um feliz aniversário. Escolha qual responsável avisar pelo WhatsApp."
      : "Avisa que o culto terminou e o filho está esperando. Escolha qual responsável avisar pelo WhatsApp.";
  const buildMessage =
    variant === "birthday" ? birthdayMessage : guardianMessage;

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{intro}</p>

        {teens.length === 0 ? (
          <p className="text-sm text-muted">Ninguém para notificar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teens.map((t) => (
              <li key={t.id} className="block-flat flex flex-col gap-2 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate font-medium text-ink">{t.name}</span>
                  {t.unitCode ? <Chip tone="night">{t.unitCode}</Chip> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  {t.guardians.map((g, i) => {
                    const link = waLink(
                      g.phone,
                      buildMessage(t.name, g.name, t.unitName),
                    );
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 text-xs text-muted">
                          {g.name} · {g.phone || "sem telefone"}
                        </div>
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mc-btn mc-btn-sm mc-btn-grass shrink-0"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={2.5} />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-muted">
                            sem telefone
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

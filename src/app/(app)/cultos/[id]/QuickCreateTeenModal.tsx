"use client";

import { Modal } from "@/components/ui/Modal";
import { TeenForm } from "@/app/(app)/cadastros/pre-adolescentes/TeenForm";
import type { FormState } from "@/lib/forms";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * In-culto teen registration: the SAME full form as the cadastros page (multiple
 * guardians, address, observations) so data stays consistent, then checks in.
 */
export function QuickCreateTeenModal({
  onClose,
  initialName,
  action,
}: {
  onClose: () => void;
  initialName: string;
  action: Action;
}) {
  return (
    <Modal open onClose={onClose} title="Cadastrar e fazer check-in" size="lg">
      <TeenForm
        action={action}
        variant="page"
        initialName={initialName}
        submitLabel="Cadastrar e fazer check-in"
        onSuccess={onClose}
      />
    </Modal>
  );
}

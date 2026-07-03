"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Unit } from "@/types/database";
import { ProductFormModal } from "./ProductFormModal";
import { createProduct } from "./actions";

/** Header action: opens the create-product modal. */
export function NewProductButton({ units }: { units?: Unit[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="grass" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" strokeWidth={3} /> Novo produto
      </Button>
      {open ? (
        <ProductFormModal
          title="Novo produto"
          action={createProduct}
          units={units}
          withInitialQuantity
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

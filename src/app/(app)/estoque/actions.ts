"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { productSchema, stockMovementSchema } from "@/lib/validations";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSession();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const unitId =
    ctx.profile.unit_id ?? ((formData.get("unit_id") as string) || null);
  if (!unitId) return { error: "Selecione a unidade." };

  const supabase = await createClient();
  const { name, category, unit_label, min_quantity, quantity } = parsed.data;

  // Create at zero, then log the opening stock as a movement (audit trail).
  const { data: product, error } = await supabase
    .from("products")
    .insert({
      unit_id: unitId,
      name,
      category,
      unit_label,
      min_quantity,
      quantity: 0,
    })
    .select("id")
    .single();
  if (error || !product) return { error: "Não foi possível salvar o produto." };

  if (quantity > 0) {
    await supabase.rpc("record_stock_movement", {
      p_product: product.id,
      p_delta: quantity,
      p_reason: "Estoque inicial",
    });
  }

  revalidatePath("/estoque");
  return { ok: true };
}

/** Edit product metadata + minimum. Quantity is changed only via movements. */
export async function updateProduct(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { name, category, unit_label, min_quantity } = parsed.data;
  const { error } = await supabase
    .from("products")
    .update({
      name,
      category,
      unit_label,
      min_quantity,
    })
    .eq("id", id);
  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/estoque");
  return { ok: true };
}

/** Register a stock movement (+entrada / -saída) atomically via the RPC. */
export async function adjustStock(
  productId: string,
  delta: number,
  reason: string,
): Promise<{ error?: string } | void> {
  await requireSession();
  const parsed = stockMovementSchema.safeParse({ delta, reason });
  if (!parsed.success) return { error: "Quantidade inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_stock_movement", {
    p_product: productId,
    p_delta: parsed.data.delta,
    p_reason: parsed.data.reason?.trim() || null,
  });
  if (error) return { error: "Não foi possível registrar o movimento." };
  revalidatePath("/estoque");
}

export async function setProductActive(id: string, isActive: boolean) {
  await requireSession();
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/estoque");
}

/** Recent movements for a product (for the history modal). */
export async function listMovements(productId: string) {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("stock_movements")
    .select("id, delta, reason, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

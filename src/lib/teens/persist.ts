/**
 * Shared teen persistence — used by the registration actions AND the in-culto
 * quick create, so both write the exact same shape (multi-guardian, address,
 * observations). teens.guardian_name/phone are kept as a denormalized cache of
 * the first guardian; teen_guardians is the source of truth.
 */
import { teenSchema, type TeenInput } from "@/lib/validations";

type Supabase = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

const orNull = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** FormData → object with `guardians` decoded from its JSON hidden field. */
export function parseTeenForm(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, unknown>;
  try {
    raw.guardians = JSON.parse((formData.get("guardians") as string) || "[]");
  } catch {
    raw.guardians = [];
  }
  return teenSchema.safeParse(raw);
}

/** Columns written to the teens row (first guardian denormalized as cache). */
export function teenRow(data: TeenInput) {
  const primary = data.guardians[0];
  return {
    name: data.name,
    birthdate: data.birthdate,
    sex: data.sex,
    guardian_name: primary.name,
    guardian_phone: primary.phone,
    cep: orNull(data.cep),
    street: orNull(data.street),
    neighborhood: orNull(data.neighborhood),
    city: orNull(data.city),
    state: orNull(data.state),
    observations: orNull(data.observations),
  };
}

export function guardianRows(data: TeenInput, unitId: string, teenId: string) {
  return data.guardians.map((g, i) => ({
    unit_id: unitId,
    teen_id: teenId,
    name: g.name,
    phone: g.phone,
    relationship: orNull(g.relationship),
    is_primary: i === 0,
    sort_order: i,
  }));
}

export async function insertTeenWithGuardians(
  supabase: Supabase,
  unitId: string,
  data: TeenInput,
): Promise<{ id?: string; error?: string }> {
  const { data: inserted, error } = await supabase
    .from("teens")
    .insert({ unit_id: unitId, ...teenRow(data) })
    .select("id")
    .single();
  if (error || !inserted) return { error: "Não foi possível salvar." };

  const { error: gErr } = await supabase
    .from("teen_guardians")
    .insert(guardianRows(data, unitId, inserted.id));
  if (gErr) {
    await supabase.from("teens").delete().eq("id", inserted.id);
    return { error: "Não foi possível salvar os responsáveis." };
  }
  return { id: inserted.id };
}

export async function replaceGuardians(
  supabase: Supabase,
  unitId: string,
  teenId: string,
  data: TeenInput,
): Promise<{ error?: string }> {
  await supabase.from("teen_guardians").delete().eq("teen_id", teenId);
  const { error } = await supabase
    .from("teen_guardians")
    .insert(guardianRows(data, unitId, teenId));
  return error ? { error: "Não foi possível salvar os responsáveis." } : {};
}

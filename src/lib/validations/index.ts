import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/lib/utils";

const phone = z
  .string()
  .trim()
  .min(8, "Telefone muito curto")
  .max(20, "Telefone muito longo")
  .regex(/^[0-9()+\-\s]+$/, "Telefone inválido");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .refine((d) => !Number.isNaN(Date.parse(d)), "Data inválida");

export const sexEnum = z.enum(["M", "F"], { message: "Selecione o sexo" });
export const roleEnum = z.enum(["global_admin", "unit_admin", "volunteer"]);
export const volunteerFunctionEnum = z.enum([
  "ministro_culto",
  "gerencia",
  "recepcao",
  "diversao",
  "louvor",
  "pequenos_grupos",
]);
export type VolunteerFunction = z.infer<typeof volunteerFunctionEnum>;

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

/** One responsável. The first in the list is the primary guardian. */
export const guardianSchema = z.object({
  name: z.string().trim().min(2, "Informe o responsável"),
  phone,
  relationship: optionalText(40),
});
export type GuardianInput = z.infer<typeof guardianSchema>;

export const teenSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  birthdate: isoDate.refine(
    (d) => new Date(d) <= new Date(),
    "Data de nascimento não pode ser no futuro",
  ),
  sex: sexEnum,
  guardians: z
    .array(guardianSchema)
    .min(1, "Informe ao menos um responsável")
    .max(6, "Máximo de 6 responsáveis"),
  cep: optionalText(12),
  street: optionalText(200),
  neighborhood: optionalText(120),
  city: optionalText(120),
  state: optionalText(2),
  observations: optionalText(2000),
});
export type TeenInput = z.infer<typeof teenSchema>;

export const volunteerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  phone: phone.optional().or(z.literal("")),
  sex: sexEnum.optional().or(z.literal("")),
  birthdate: isoDate.optional().or(z.literal("")),
  functions: z.array(volunteerFunctionEnum).default([]),
});
export type VolunteerInput = z.infer<typeof volunteerSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do produto"),
  category: z.enum(PRODUCT_CATEGORIES, { message: "Selecione a categoria" }),
  unit_label: z.string().trim().min(1).max(12).default("un"),
  min_quantity: z.coerce.number().int().min(0, "Mínimo inválido").default(0),
  quantity: z.coerce.number().int().min(0, "Quantidade inválida").default(0),
});
export type ProductInput = z.infer<typeof productSchema>;

export const stockMovementSchema = z.object({
  delta: z.coerce.number().int().refine((n) => n !== 0, "Informe uma quantidade"),
  reason: optionalText(200),
});
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export const sessionSchema = z.object({
  session_date: isoDate,
  service_id: z.string().uuid("Selecione o horário"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type SessionInput = z.infer<typeof sessionSchema>;

export const eventSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do evento"),
  event_date: isoDate,
  // "HH:MM" opcional (horário de início do evento), 00:00–23:59
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido")
    .optional()
    .or(z.literal("")),
  location: optionalText(200),
  notes: optionalText(2000),
  // "" / "todas" = todas as unidades (null); senão o uuid da unidade
  unit_id: z.preprocess(
    (v) => (v === "" || v === "todas" || v === undefined ? null : v),
    z.string().uuid("Selecione a unidade").nullable(),
  ),
});
export type EventInput = z.infer<typeof eventSchema>;

/** Visitante: presente no evento, sem unidade. Nome + sexo + nascimento + responsável. */
export const visitorSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  sex: sexEnum,
  birthdate: isoDate.refine(
    (d) => new Date(d) <= new Date(),
    "Data de nascimento não pode ser no futuro",
  ),
  guardian_name: z.string().trim().min(2, "Informe o responsável"),
  guardian_phone: phone,
});
export type VisitorInput = z.infer<typeof visitorSchema>;

export const provisionUserSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido"),
    full_name: z.string().trim().min(2, "Informe o nome"),
    // optional: blank = default from first name (nome123)
    password: z
      .string()
      .min(6, "Senha deve ter ao menos 6 caracteres")
      .or(z.literal("")),
    role: roleEnum,
    unit_id: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.string().uuid().nullable(),
    ),
  })
  .refine((u) => u.role === "global_admin" || u.unit_id !== null, {
    message: "Unidade é obrigatória para este papel",
    path: ["unit_id"],
  });
export type ProvisionUserInput = z.infer<typeof provisionUserSchema>;

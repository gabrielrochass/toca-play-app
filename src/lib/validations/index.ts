import { z } from "zod";

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

export const teenSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  birthdate: isoDate.refine(
    (d) => new Date(d) <= new Date(),
    "Data de nascimento não pode ser no futuro",
  ),
  sex: sexEnum,
  guardian_name: z.string().trim().min(2, "Informe o responsável"),
  guardian_phone: phone,
});
export type TeenInput = z.infer<typeof teenSchema>;

export const volunteerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  phone: phone.optional().or(z.literal("")),
  sex: sexEnum.optional().or(z.literal("")),
  birthdate: isoDate.optional().or(z.literal("")),
});
export type VolunteerInput = z.infer<typeof volunteerSchema>;

export const sessionSchema = z.object({
  session_date: isoDate,
  service_id: z.string().uuid("Selecione o horário"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type SessionInput = z.infer<typeof sessionSchema>;

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

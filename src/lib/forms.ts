import type { ZodError } from "zod";

export interface FormState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export const EMPTY_FORM_STATE: FormState = {};

/** Turn a Zod error into the { field: [messages] } shape the forms render. */
export function fieldErrorsFrom(error: ZodError): FormState {
  return { fieldErrors: error.flatten().fieldErrors as Record<string, string[]> };
}

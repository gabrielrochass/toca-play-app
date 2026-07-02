/** Message sent to a guardian when the culto ends. No emojis (WhatsApp Web
 * renders them poorly), greets the guardian by name, warm but responsible. */
export function guardianMessage(teenName: string, guardianName?: string): string {
  const greet = guardianName?.trim() ? `Olá, ${guardianName.trim()}!` : "Olá!";
  return `${greet} Aqui é do ministério TocaPlay da Igreja Aponte. O culto de hoje já terminou e ${teenName} está te esperando para ir para casa. Quando puder, é só vir buscar com tranquilidade. Obrigado por confiar o(a) ${teenName} ao nosso time!`;
}

/** Build a wa.me link (assumes Brazil +55 if no country code). Null if no phone. */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

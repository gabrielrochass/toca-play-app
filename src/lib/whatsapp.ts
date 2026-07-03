/** Message sent to a guardian when the culto ends. No emojis (WhatsApp Web
 * renders them poorly), greets the guardian by name, warm but responsible. */
export function guardianMessage(teenName: string, guardianName?: string): string {
  const greet = guardianName?.trim() ? `Olá, ${guardianName.trim()}!` : "Olá!";
  return `${greet} Aqui é do ministério TocaPlay da Igreja Aponte. O culto de hoje já terminou e ${teenName} está te esperando para ir para casa. Quando puder, é só vir buscar com tranquilidade. Obrigado por confiar o(a) ${teenName} ao nosso time!`;
}

/** Birthday greeting for a guardian. No emojis, warm, from the ministry. */
export function birthdayMessage(teenName: string, guardianName?: string): string {
  const greet = guardianName?.trim() ? `Olá, ${guardianName.trim()}!` : "Olá!";
  return `${greet} Aqui é do ministério TocaPlay da Igreja Aponte. Hoje é um dia especial: passamos para desejar um feliz aniversário para ${teenName}! Que este novo ano seja cheio de alegria e bênçãos. Contamos com ${teenName} no próximo culto para comemorarmos juntos!`;
}

/** Build a wa.me link (assumes Brazil +55 if no country code). Null if no phone. */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

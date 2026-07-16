/** "do ministério TocaPlay da Igreja A Ponte" — with the unit when known, so a
 * guardian (and an admin sending across units) sees which campus it's from. */
function ministryPhrase(unitName?: string | null): string {
  return unitName?.trim()
    ? `do ministério TocaPlay da Igreja A Ponte (unidade ${unitName.trim()})`
    : "do ministério TocaPlay da Igreja A Ponte";
}

/** Message sent to a guardian when the culto ends. No emojis (WhatsApp Web
 * renders them poorly), greets the guardian by name, warm but responsible. */
export function guardianMessage(
  teenName: string,
  guardianName?: string,
  unitName?: string | null,
): string {
  const greet = guardianName?.trim() ? `Olá, ${guardianName.trim()}!` : "Olá!";
  return `${greet} Aqui é ${ministryPhrase(unitName)}. O culto de hoje já terminou e ${teenName} está te esperando para ir para casa. Quando puder, é só vir buscar com tranquilidade. Obrigado por confiar o(a) ${teenName} ao nosso time!`;
}

/** Birthday greeting for a guardian. No emojis, warm, from the ministry. */
export function birthdayMessage(
  teenName: string,
  guardianName?: string,
  unitName?: string | null,
): string {
  const greet = guardianName?.trim() ? `Olá, ${guardianName.trim()}!` : "Olá!";
  return `${greet} Aqui é ${ministryPhrase(unitName)}. Hoje é um dia especial: passamos para desejar um feliz aniversário para ${teenName}! Que este novo ano seja cheio de alegria e bênçãos. Contamos com ${teenName} no próximo culto para comemorarmos juntos!`;
}

/** Message sent to a guardian when an event ends. Names the event, warm but
 * responsible. No emojis. */
export function eventEndMessage(
  personName: string,
  guardianName?: string,
  eventName?: string | null,
): string {
  const greet = guardianName?.trim() ? `Olá, ${guardianName.trim()}!` : "Olá!";
  const ev = eventName?.trim() ? `o evento ${eventName.trim()}` : "o evento";
  return `${greet} Aqui é ${ministryPhrase()}. ${ev} já terminou e ${personName} está te esperando para ir para casa. Quando puder, é só vir buscar com tranquilidade. Obrigado por confiar ${personName} ao nosso time!`;
}

/** Build a wa.me link (assumes Brazil +55 if no country code). Null if no phone. */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

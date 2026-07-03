/**
 * Age helpers. Age is always derived from birthdate — for grouping it must be
 * computed as of the SESSION date (not today), so a teen isn't misgrouped by a
 * birthday that fell after an old culto.
 */

/** Whole years between birthdate and a reference date (default: the session/now). */
export function ageAt(birthdate: string | Date, asOf: string | Date): number {
  const b = new Date(birthdate);
  const ref = new Date(asOf);
  let age = ref.getFullYear() - b.getFullYear();
  const monthDiff = ref.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < b.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * True when `asOf` falls on the teen's birthday (same day + month). Compares the
 * ISO date parts directly so it never drifts by timezone. Feb-29 birthdays fall
 * on Feb-29 only (non-leap years simply don't match — intentional, no fudging).
 */
export function isBirthday(
  birthdate: string | Date,
  asOf: string | Date,
): boolean {
  const b = typeof birthdate === "string" ? birthdate.slice(0, 10) : toISO(birthdate);
  const ref = typeof asOf === "string" ? asOf.slice(0, 10) : toISO(asOf);
  return b.slice(5) === ref.slice(5); // MM-DD == MM-DD
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

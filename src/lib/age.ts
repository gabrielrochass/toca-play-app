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

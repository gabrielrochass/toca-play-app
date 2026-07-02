import type { Sex } from "@/types/database";
import { ageAt } from "@/lib/age";

/**
 * Small-group formation for a culto.
 *
 * Rules:
 *  - same sex (hard);
 *  - members age-sorted, kept in contiguous blocks so ages stay close;
 *  - each group gets ONE responsible volunteer of the same sex, matched by age
 *    (youngest teens ↔ youngest volunteer);
 *  - the NUMBER of groups per sex follows the number of present volunteers of
 *    that sex (each leads one group). With no volunteers, fall back to groups of
 *    ~3–4 teens with no leader;
 *  - a group is flagged `outsideAgeRule` only when its age spread exceeds 3 years
 *    (small/large groups are expected and NOT flagged).
 */

export type GroupFlag = "age_spread_exceeded";

export interface GroupingCandidate {
  id: string; // checkin id
  sex: Sex;
  birthdate: string;
}

export interface GroupingVolunteer {
  id: string;
  sex: Sex;
  birthdate: string;
}

export interface FormedGroup {
  sex: Sex;
  memberIds: string[];
  volunteerId: string | null;
  ageSpread: number;
  outsideAgeRule: boolean;
}

const MAX_AGE_SPREAD = 3;

interface Item {
  id: string;
  age: number;
  birthdate: string;
}

/** Ideal group count for n teens when there are no volunteers: ~3–4 each. */
function idealGroupCount(n: number): number {
  if (n <= 0) return 0;
  return Math.max(1, Math.round(n / 3.5));
}

function toItems(
  rows: { id: string; birthdate: string }[],
  sessionDate: string | Date,
): Item[] {
  return rows
    .map((r) => ({ id: r.id, age: ageAt(r.birthdate, sessionDate), birthdate: r.birthdate }))
    .sort(
      (a, b) =>
        a.age - b.age ||
        a.birthdate.localeCompare(b.birthdate) ||
        a.id.localeCompare(b.id),
    );
}

export function formGroups(
  candidates: GroupingCandidate[],
  sessionDate: string | Date,
  volunteers: GroupingVolunteer[] = [],
): FormedGroup[] {
  const result: FormedGroup[] = [];

  for (const sex of ["F", "M"] as Sex[]) {
    const teens = toItems(
      candidates.filter((c) => c.sex === sex),
      sessionDate,
    );
    if (teens.length === 0) continue;

    const vols = toItems(
      volunteers.filter((v) => v.sex === sex),
      sessionDate,
    );

    const n = teens.length;
    const k = vols.length > 0 ? Math.min(vols.length, n) : idealGroupCount(n);

    // Balanced contiguous sizes: first (n % k) groups get one extra.
    const base = Math.floor(n / k);
    const rem = n % k;

    let start = 0;
    for (let i = 0; i < k; i++) {
      const size = base + (i < rem ? 1 : 0);
      const block = teens.slice(start, start + size);
      start += size;
      const spread = block[block.length - 1].age - block[0].age;
      result.push({
        sex,
        memberIds: block.map((t) => t.id),
        volunteerId: vols[i]?.id ?? null,
        ageSpread: spread,
        outsideAgeRule: spread > MAX_AGE_SPREAD,
      });
    }
  }

  return result;
}

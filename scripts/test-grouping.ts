/* Correctness checks for the volunteer-aware small-group formation.
   Run: npx tsx scripts/test-grouping.ts */
import {
  formGroups,
  type GroupingCandidate,
  type GroupingVolunteer,
} from "@/lib/grouping/formGroups";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${detail}`);
  }
}

const SESSION = "2026-07-02";
const yearFor = (age: number) => `${2026 - age}-01-01`;

function cohort(sex: "M" | "F", ages: number[]): GroupingCandidate[] {
  return ages.map((age, i) => ({ id: `${sex}${i}`, sex, birthdate: yearFor(age) }));
}
function vols(sex: "M" | "F", ages: number[]): GroupingVolunteer[] {
  return ages.map((age, i) => ({ id: `v${sex}${i}`, sex, birthdate: yearFor(age) }));
}
const members = (g: { memberIds: string[] }[]) => g.flatMap((x) => x.memberIds);

// 1. No volunteers: ~3–4 per group, everyone grouped once.
{
  const g = formGroups(cohort("M", [11, 11, 11, 12, 12, 12, 13, 13, 13, 14, 14]), SESSION);
  const m = members(g);
  check("n=11 no vols: everyone grouped once", m.length === 11 && new Set(m).size === 11);
  check("n=11 no vols: sizes 3–4", g.every((x) => x.memberIds.length >= 3 && x.memberIds.length <= 4), JSON.stringify(g.map((x) => x.memberIds.length)));
  check("n=11 no vols: no leader", g.every((x) => x.volunteerId === null));
}

// 2. Sexes never mix.
{
  const g = formGroups([...cohort("M", [11, 12, 13]), ...cohort("F", [11, 12, 13])], SESSION);
  check("sexes never mix", g.every((grp) => new Set(grp.memberIds.map((id) => id[0])).size === 1));
  check("two cohorts grouped", members(g).length === 6);
}

// 3. Volunteers drive the group count + each gets a leader.
{
  const g = formGroups(cohort("F", [10, 10, 11, 12, 12, 13]), SESSION, vols("F", [19, 25, 40]));
  check("3 vols -> 3 groups", g.length === 3, `got ${g.length}`);
  check("every group has a leader", g.every((x) => x.volunteerId !== null));
  check("all teens grouped once", members(g).length === 6 && new Set(members(g)).size === 6);
}

// 4. Youngest teen group gets youngest volunteer.
{
  const g = formGroups(cohort("M", [10, 10, 16, 16]), SESSION, vols("M", [40, 18]));
  // groups sorted by age asc: [10,10] then [16,16]; vols sorted asc: 18 (vM1), 40 (vM0)
  check("2 vols -> 2 groups", g.length === 2);
  check("youngest group -> youngest volunteer", g[0].volunteerId === "vM1" && g[1].volunteerId === "vM0", JSON.stringify(g.map((x) => x.volunteerId)));
}

// 5. Age spread flag only when > 3 years.
{
  const ok = formGroups(cohort("F", [11, 12, 13]), SESSION);
  check("tight group not flagged", ok.every((x) => !x.outsideAgeRule));
  const wide = formGroups(cohort("F", [10, 17]), SESSION, vols("F", [20]));
  check("wide group flagged", wide[0].outsideAgeRule === true);
}

// 6. Small coherent group is NOT flagged (the 'revise' complaint).
{
  const g = formGroups(cohort("M", [12, 12]), SESSION);
  check("n=2 coherent: one group, no flag", g.length === 1 && !g[0].outsideAgeRule);
}

// 7. Empty.
check("empty -> no groups", formGroups([], SESSION).length === 0);

console.log(failures === 0 ? "\nAll grouping checks passed." : `\n${failures} failed.`);
process.exit(failures === 0 ? 0 : 1);

/** Friendly default password from a person's first name: "José Silva" -> "jose123". */
export function defaultPassword(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  const clean = first
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, ""); // NFD + this strip also removes accent marks
  return clean ? `${clean}123` : "";
}

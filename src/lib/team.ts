import type { Role } from "@/lib/auth/session";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  radiologist: "Radiologist",
};

export function canManageTeam(role: Role | undefined) {
  return role === "owner" || role === "admin";
}

/** Roles this person may give to someone else. Nobody hands out ownership here. */
export function assignableRoles(role: Role | undefined): Role[] {
  if (role === "owner") return ["radiologist", "admin"];
  if (role === "admin") return ["radiologist"];
  return [];
}

/** Owners manage everyone but themselves; admins manage radiologists only. */
export function canManageMember(actor: { id: string; role: Role | undefined }, target: { id: string; role: Role }) {
  if (actor.id === target.id) return false;
  if (actor.role === "owner") return target.role !== "owner";
  if (actor.role === "admin") return target.role === "radiologist";
  return false;
}

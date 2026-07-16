import type { User } from "@supabase/supabase-js";

export const ownerRole = "OWNER";

export function getUserRole(user: User | null) {
  if (!user) {
    return null;
  }

  const appRole = readRole(user.app_metadata?.role);
  const userRole = readRole(user.user_metadata?.role);

  return appRole ?? userRole;
}

export function isOwner(user: User | null) {
  return getUserRole(user) === ownerRole;
}

function readRole(value: unknown) {
  return typeof value === "string" ? value.toUpperCase() : null;
}

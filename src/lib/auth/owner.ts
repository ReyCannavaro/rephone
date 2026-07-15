import type { User } from "@supabase/supabase-js";

import { apiError } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ownerRole = "OWNER";

export type OwnerSession = {
  user: User;
  role: string;
};

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

export async function getOwnerSession(): Promise<
  | { data: OwnerSession; error?: undefined }
  | { data?: undefined; error: Response }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: apiError("UNAUTHENTICATED", "Login is required.", 401, error?.message),
    };
  }

  const role = getUserRole(user);

  if (role !== ownerRole) {
    return {
      error: apiError("FORBIDDEN", "OWNER role is required.", 403, { role }),
    };
  }

  return { data: { user, role } };
}

function readRole(value: unknown) {
  return typeof value === "string" ? value.toUpperCase() : null;
}

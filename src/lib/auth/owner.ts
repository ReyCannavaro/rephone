import type { User } from "@supabase/supabase-js";

import { apiError } from "@/lib/api/responses";
import { getUserRole, ownerRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export { getUserRole, isOwner, ownerRole } from "@/lib/auth/roles";

export type OwnerSession = {
  user: User;
  role: string;
};

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

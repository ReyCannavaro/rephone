import { apiOk } from "@/lib/api/responses";
import { getUserRole, isOwner } from "@/lib/auth/owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return apiOk({
    authenticated: Boolean(user) && !error,
    owner: isOwner(user),
    role: getUserRole(user),
    user: user
      ? {
          id: user.id,
          email: user.email,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata,
        }
      : null,
  });
}

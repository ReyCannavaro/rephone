import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUserRole, ownerRole } from "@/lib/auth/owner";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });
  const { url, publishableKey } = getPublicSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedMutation(request) && getUserRole(user) !== ownerRole) {
    return Response.json(
      {
        ok: false,
        error: {
          code: user ? "FORBIDDEN" : "UNAUTHENTICATED",
          message: user ? "OWNER role is required." : "Login is required.",
        },
      },
      { status: user ? 403 : 401 },
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};

function isProtectedMutation(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/") && mutatingMethods.has(request.method);
}

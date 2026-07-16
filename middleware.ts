import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getUserRole, ownerRole } from "@/lib/auth/roles";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

const publicRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });
  const { publishableKey, url } = getPublicSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirectToLogin(request, "login_required");
  }

  if (getUserRole(user) !== ownerRole) {
    return redirectToLogin(request, "owner_required");
  }

  return response;
}

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function redirectToLogin(request: NextRequest, error: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

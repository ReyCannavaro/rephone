"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getPublicSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}

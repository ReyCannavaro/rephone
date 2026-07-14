import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getAdminSupabaseEnv } from "./env";
import type { Database } from "./database.types";

let cachedAdminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const { url, serviceRoleKey } = getAdminSupabaseEnv();

  cachedAdminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}

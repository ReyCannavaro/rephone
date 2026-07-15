import { getUserRole } from "@/lib/auth/owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
type AuditAction = AuditLogInsert["action"];
type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type AuditInput = {
  action: AuditAction;
  entity_table: string;
  entity_id?: string | null;
  reason?: string | null;
  old_values?: unknown;
  new_values?: unknown;
  metadata?: unknown;
  request?: Request;
};

export async function writeAuditLog(supabase: AdminClient, input: AuditInput) {
  const actor = await getAuditActor();
  const requestUrl = input.request ? new URL(input.request.url) : null;

  const payload: AuditLogInsert = {
    action: input.action,
    entity_table: input.entity_table,
    entity_id: input.entity_id ?? null,
    actor_user_id: actor.user_id,
    actor_email: actor.email,
    actor_role: actor.role,
    reason: input.reason ?? null,
    old_values: toJsonValue(input.old_values),
    new_values: toJsonValue(input.new_values),
    metadata: toJsonValue(input.metadata),
    request_path: requestUrl ? `${requestUrl.pathname}${requestUrl.search}` : null,
    request_method: input.request?.method ?? null,
  };

  return supabase.from("audit_logs").insert(payload).select().single();
}

async function getAuditActor() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      role: getUserRole(user) ?? null,
    };
  } catch {
    return {
      user_id: null,
      email: null,
      role: null,
    };
  }
}

function toJsonValue(value: unknown): Json | null {
  if (value === undefined) {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Json;
}

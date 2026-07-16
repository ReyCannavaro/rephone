import type { Json } from "@/lib/supabase/database.types";

export type AuditAction = "CREATE" | "UPDATE" | "ACCEPT" | "REJECT" | "SALE" | "REVERSAL";

export type AuditLogRecord = {
  id: string;
  event_time: string;
  action: AuditAction;
  entity_table: string;
  entity_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  reason: string | null;
  old_values: Json | null;
  new_values: Json | null;
  metadata: Json | null;
  request_path: string | null;
  request_method: string | null;
  created_at: string;
};

export type AuditLogsResponse = {
  logs: AuditLogRecord[];
  count: number;
};

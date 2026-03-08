import { createServiceClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/types/database";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a notification for a user.
 * Uses the service client (no RLS) so it can be called from any server context.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  metadata = {},
}: CreateNotificationParams): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    metadata,
  });
  if (error) {
    console.error("Failed to create notification:", error);
  }
}

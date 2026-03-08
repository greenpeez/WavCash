import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import type { NotificationType } from "@/lib/types/database";

interface NotifyAllParams {
  splitId: string;
  excludeUserId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sends a notification to the split creator and every linked contributor,
 * optionally excluding one user (e.g. the person who triggered the event).
 */
export async function notifyAllLinkedUsers({
  splitId,
  excludeUserId,
  type,
  title,
  body,
  metadata = {},
}: NotifyAllParams): Promise<void> {
  const supabase = await createServiceClient();

  // Get the creator
  const { data: split } = await supabase
    .from("splits")
    .select("created_by")
    .eq("id", splitId)
    .single();

  // Get all linked contributors
  const { data: contributors } = await supabase
    .from("split_contributors")
    .select("user_id")
    .eq("split_id", splitId)
    .not("user_id", "is", null);

  // Collect unique user IDs
  const userIds = new Set<string>();
  if (split?.created_by) userIds.add(split.created_by);
  for (const c of (contributors || []) as { user_id: string }[]) {
    userIds.add(c.user_id);
  }

  // Remove the excluded user
  if (excludeUserId) userIds.delete(excludeUserId);

  // Send notifications
  for (const userId of userIds) {
    createNotification({
      userId,
      type,
      title,
      body,
      metadata: { ...metadata, split_id: splitId },
    }).catch(() => {});
  }
}

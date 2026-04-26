import "server-only";
import { shroudb } from "./shroudb";

const DEFAULT_CHANNEL = process.env.SHROUDB_NOTIFY_CHANNEL ?? "default";

export interface NotifyInput {
  recipient: string;
  subject: string;
  body: string;
  contentType?: string;
}

/** Fire-and-forget delivery via the courier engine. Channel must be pre-
 *  configured by ops. Failures are swallowed: notifications are best-effort
 *  and must never block the user-visible action that triggered them. */
export async function notifyUser({
  recipient,
  subject,
  body,
  contentType = "text/plain",
}: NotifyInput): Promise<void> {
  try {
    await shroudb().courier.deliver({
      channel: DEFAULT_CHANNEL,
      recipient,
      SUBJECT: subject,
      BODY: body,
      CONTENT_TYPE: contentType,
    });
  } catch {
    // Courier failures are non-fatal — they shouldn't fail the swipe / send.
  }
}

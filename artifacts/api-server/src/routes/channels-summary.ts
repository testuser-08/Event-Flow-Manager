import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

router.get("/channels/summary", async (req, res) => {
  try {
    // Fetch all channels
    const { data: channels, error: chanErr } = await supabaseAdmin
      .from("channels")
      .select("*")
      .order("name");

    if (chanErr) {
      res.status(500).json({ error: chanErr.message });
      return;
    }

    // For each channel, get open issue/urgent counts + latest message
    const summaries = await Promise.all(
      (channels ?? []).map(async (channel) => {
        const [{ data: unresolvedMessages }, { data: latestMessage }] =
          await Promise.all([
            supabaseAdmin
              .from("messages")
              .select("urgency")
              .eq("channel_id", channel.id)
              .eq("is_resolved", false)
              .in("urgency", ["issue", "urgent"]),
            supabaseAdmin
              .from("messages")
              .select("content, created_at")
              .eq("channel_id", channel.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        const open_urgents = (unresolvedMessages ?? []).filter(
          (m) => m.urgency === "urgent"
        ).length;
        const open_issues = (unresolvedMessages ?? []).filter(
          (m) => m.urgency === "issue"
        ).length;

        return {
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          is_announcements: channel.is_announcements,
          open_issues,
          open_urgents,
          latest_message_at: latestMessage?.created_at ?? null,
          latest_message_preview: latestMessage?.content
            ? latestMessage.content.slice(0, 120)
            : null,
        };
      })
    );

    // Sort: channels with open urgents first, then open issues, then rest
    summaries.sort((a, b) => {
      if (b.open_urgents !== a.open_urgents) return b.open_urgents - a.open_urgents;
      if (b.open_issues !== a.open_issues) return b.open_issues - a.open_issues;
      return (b.latest_message_at ?? "").localeCompare(a.latest_message_at ?? "");
    });

    res.json(summaries);
  } catch (err) {
    logger.error({ err }, "getChannelsSummary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

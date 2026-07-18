import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

router.post("/admin/setup", async (req, res) => {
  try {
    // Check that Supabase is reachable and tables exist
    const { error: channelError } = await supabaseAdmin
      .from("channels")
      .select("id")
      .limit(1);

    if (channelError) {
      res.status(500).json({
        success: false,
        message: `Database not ready: ${channelError.message}. Please run supabase/setup.sql in the Supabase SQL editor first.`,
      });
      return;
    }

    // Upsert the predefined channels
    const channels = [
      { name: "Admin", slug: "admin", is_announcements: false },
      { name: "PR", slug: "pr", is_announcements: false },
      { name: "Sherpa", slug: "sherpa", is_announcements: false },
      { name: "Registration Desk", slug: "registration-desk", is_announcements: false },
      { name: "Feedback", slug: "feedback", is_announcements: false },
      { name: "Support Acc", slug: "support-acc", is_announcements: false },
      { name: "Content Specialist", slug: "content-specialist", is_announcements: false },
      { name: "Track Managers", slug: "track-managers", is_announcements: false },
      { name: "Tshirt Distribution", slug: "tshirt-distribution", is_announcements: false },
      { name: "SAP for me", slug: "sap-for-me", is_announcements: false },
    ];

    // Remove any channels not in the new list (won't cascade-delete messages
    // because messages reference channel_id, but old orphaned rows disappear)
    const validSlugs = channels.map((c) => c.slug);
    const { error: deleteError } = await supabaseAdmin
      .from("channels")
      .delete()
      .not("slug", "in", `(${validSlugs.map((s) => `"${s}"`).join(",")})`);

    if (deleteError) {
      logger.warn({ err: deleteError }, "Could not delete old channels (non-fatal)");
    }

    // Upsert the canonical channel list
    const { error: upsertError } = await supabaseAdmin
      .from("channels")
      .upsert(channels, { onConflict: "slug" });

    if (upsertError) {
      logger.error({ err: upsertError }, "Failed to seed channels");
      res.status(500).json({ success: false, message: upsertError.message });
      return;
    }

    res.json({
      success: true,
      message: "Database reachable and channels seeded.",
    });
  } catch (err) {
    logger.error({ err }, "Setup error");
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

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
      { name: "All Hands", slug: "all-hands", is_announcements: true },
      {
        name: "Content Operations Team",
        slug: "content-operations-team",
        is_announcements: false,
      },
      {
        name: "Public Relations",
        slug: "public-relations",
        is_announcements: false,
      },
      {
        name: "Registrations",
        slug: "registrations",
        is_announcements: false,
      },
      {
        name: "Track Managers",
        slug: "track-managers",
        is_announcements: false,
      },
      {
        name: "Misc On Ground",
        slug: "misc-on-ground",
        is_announcements: false,
      },
    ];

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

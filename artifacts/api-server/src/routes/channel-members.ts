import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

/**
 * GET /api/channels/:slug/members
 * Returns the list of volunteers who belong to the workstream matching this channel.
 * Accessible to any authenticated volunteer (not admin-only).
 */
router.get("/channels/:slug/members", requireAuth, async (req, res) => {
  const { slug } = req.params;

  try {
    // Look up the channel by slug to get its display name
    const { data: channel, error: chanErr } = await supabaseAdmin
      .from("channels")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (chanErr || !channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }

    // Volunteers whose workstreams array contains this channel's name
    const { data: members, error: memErr } = await supabaseAdmin
      .from("volunteers")
      .select("id, name, is_admin")
      .contains("workstreams", [channel.name])
      .order("name");

    if (memErr) {
      logger.error({ err: memErr }, "channel-members query error");
      res.status(500).json({ error: memErr.message });
      return;
    }

    res.json({ channel: { id: channel.id, name: channel.name, slug: channel.slug }, members: members ?? [] });
  } catch (err) {
    logger.error({ err }, "channel-members error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

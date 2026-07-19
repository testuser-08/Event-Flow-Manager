import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /api/alerts — create an emergency alert
router.post("/alerts", requireAuth, async (req, res) => {
  const v = req.volunteer!;
  const { channel_id, channel_name, note } = req.body as {
    channel_id?: string;
    channel_name?: string;
    note?: string;
  };

  if (!channel_id || !channel_name || !note?.trim()) {
    res.status(400).json({ error: "channel_id, channel_name, and note are required." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.from("alerts").insert({
      channel_id,
      channel_name,
      user_id: v.volunteerId,
      sender_name: v.name,
      note: note.trim(),
      status: "active",
    }).select().single();

    if (error) {
      logger.error({ err: error }, "alert insert error");
      res.status(500).json({ error: "Failed to send alert." });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "alert unexpected error");
    res.status(500).json({ error: "Failed to send alert." });
  }
});

// PATCH /api/alerts/:id — acknowledge or resolve an alert (admin only)
router.patch("/alerts/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const v = req.volunteer!;
  const { status } = req.body as { status?: string };

  if (!status || !["acknowledged", "resolved"].includes(status)) {
    res.status(400).json({ error: "status must be acknowledged or resolved." });
    return;
  }

  try {
    const updates: Record<string, unknown> = { status };
    if (status === "acknowledged") {
      updates.acknowledged_by = v.volunteerId;
      updates.acknowledged_by_name = v.name;
      updates.acknowledged_at = new Date().toISOString();
    } else if (status === "resolved") {
      updates.resolved_by = v.volunteerId;
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("alerts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to update alert." });
      return;
    }
    res.json(data);
  } catch (err) {
    logger.error({ err }, "alert update error");
    res.status(500).json({ error: "Failed to update alert." });
  }
});

export default router;

import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /api/agenda — all authenticated users
router.get("/agenda", requireAuth, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("agenda_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      logger.error({ err: error }, "agenda fetch error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (err) {
    logger.error({ err }, "agenda unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/agenda — admin only
router.post("/agenda", requireAdmin, async (req, res) => {
  const { sort_order, start_time, end_time, label, title, location, is_breakout } =
    req.body as {
      sort_order?: number;
      start_time?: string;
      end_time?: string;
      label?: string;
      title?: string;
      location?: string;
      is_breakout?: boolean;
    };

  if (!start_time || !end_time || !label || !title) {
    res.status(400).json({ error: "start_time, end_time, label, and title are required." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("agenda_items")
      .insert({
        sort_order: sort_order ?? 0,
        start_time,
        end_time,
        label,
        title,
        location: location ?? "",
        is_breakout: is_breakout ?? false,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "agenda insert error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "agenda insert unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/agenda/:id — admin only
router.patch("/agenda/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { sort_order, start_time, end_time, label, title, location, is_breakout } =
    req.body as {
      sort_order?: number;
      start_time?: string;
      end_time?: string;
      label?: string;
      title?: string;
      location?: string;
      is_breakout?: boolean;
    };

  const updates: Record<string, unknown> = {};
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (label !== undefined) updates.label = label;
  if (title !== undefined) updates.title = title;
  if (location !== undefined) updates.location = location;
  if (is_breakout !== undefined) updates.is_breakout = is_breakout;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("agenda_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "agenda update error");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Agenda item not found." });
      return;
    }
    res.json(data);
  } catch (err) {
    logger.error({ err }, "agenda update unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/agenda/:id — admin only
router.delete("/agenda/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin.from("agenda_items").delete().eq("id", id);
    if (error) {
      logger.error({ err: error }, "agenda delete error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "agenda delete unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

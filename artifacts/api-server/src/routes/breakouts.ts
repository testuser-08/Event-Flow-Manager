import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /api/breakouts — all authenticated users
// Returns tracks with their sessions nested
router.get("/breakouts", requireAuth, async (_req, res) => {
  try {
    const { data: tracks, error: tracksErr } = await supabaseAdmin
      .from("breakout_tracks")
      .select("*")
      .order("sort_order", { ascending: true });

    if (tracksErr) {
      logger.error({ err: tracksErr }, "breakout tracks fetch error");
      res.status(500).json({ error: tracksErr.message });
      return;
    }

    const { data: sessions, error: sessionsErr } = await supabaseAdmin
      .from("breakout_sessions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (sessionsErr) {
      logger.error({ err: sessionsErr }, "breakout sessions fetch error");
      res.status(500).json({ error: sessionsErr.message });
      return;
    }

    const result = (tracks ?? []).map((track) => ({
      ...track,
      sessions: (sessions ?? []).filter((s) => s.track_id === track.id),
    }));

    res.json(result);
  } catch (err) {
    logger.error({ err }, "breakouts unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Track CRUD (admin) ────────────────────────────────────────────────────────

// POST /api/breakouts/tracks
router.post("/breakouts/tracks", requireAdmin, async (req, res) => {
  const { slug, sort_order, name, location, color, text_color, border_color } =
    req.body as {
      slug?: string;
      sort_order?: number;
      name?: string;
      location?: string;
      color?: string;
      text_color?: string;
      border_color?: string;
    };

  if (!slug || !name) {
    res.status(400).json({ error: "slug and name are required." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("breakout_tracks")
      .insert({
        slug,
        sort_order: sort_order ?? 0,
        name,
        location: location ?? "",
        color: color ?? "bg-blue-600",
        text_color: text_color ?? "text-blue-600 dark:text-blue-400",
        border_color: border_color ?? "border-blue-600 dark:border-blue-400",
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "breakout track insert error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "breakout track insert unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/breakouts/tracks/:id
router.patch("/breakouts/tracks/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { slug, sort_order, name, location, color, text_color, border_color } =
    req.body as {
      slug?: string;
      sort_order?: number;
      name?: string;
      location?: string;
      color?: string;
      text_color?: string;
      border_color?: string;
    };

  const updates: Record<string, unknown> = {};
  if (slug !== undefined) updates.slug = slug;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (name !== undefined) updates.name = name;
  if (location !== undefined) updates.location = location;
  if (color !== undefined) updates.color = color;
  if (text_color !== undefined) updates.text_color = text_color;
  if (border_color !== undefined) updates.border_color = border_color;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("breakout_tracks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "breakout track update error");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Track not found." });
      return;
    }
    res.json(data);
  } catch (err) {
    logger.error({ err }, "breakout track update unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/breakouts/tracks/:id
router.delete("/breakouts/tracks/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin.from("breakout_tracks").delete().eq("id", id);
    if (error) {
      logger.error({ err: error }, "breakout track delete error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "breakout track delete unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Session CRUD (admin) ──────────────────────────────────────────────────────

// POST /api/breakouts/sessions
router.post("/breakouts/sessions", requireAdmin, async (req, res) => {
  const { track_id, sort_order, zone, title, start_time, end_time, time_label } =
    req.body as {
      track_id?: string;
      sort_order?: number;
      zone?: string;
      title?: string;
      start_time?: string;
      end_time?: string;
      time_label?: string;
    };

  if (!track_id || !title || !start_time || !end_time || !time_label) {
    res.status(400).json({ error: "track_id, title, start_time, end_time, and time_label are required." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("breakout_sessions")
      .insert({
        track_id,
        sort_order: sort_order ?? 0,
        zone: zone ?? null,
        title,
        start_time,
        end_time,
        time_label,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "breakout session insert error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "breakout session insert unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/breakouts/sessions/:id
router.patch("/breakouts/sessions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { track_id, sort_order, zone, title, start_time, end_time, time_label } =
    req.body as {
      track_id?: string;
      sort_order?: number;
      zone?: string | null;
      title?: string;
      start_time?: string;
      end_time?: string;
      time_label?: string;
    };

  const updates: Record<string, unknown> = {};
  if (track_id !== undefined) updates.track_id = track_id;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (zone !== undefined) updates.zone = zone;
  if (title !== undefined) updates.title = title;
  if (start_time !== undefined) updates.start_time = start_time;
  if (end_time !== undefined) updates.end_time = end_time;
  if (time_label !== undefined) updates.time_label = time_label;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("breakout_sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "breakout session update error");
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    res.json(data);
  } catch (err) {
    logger.error({ err }, "breakout session update unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/breakouts/sessions/:id
router.delete("/breakouts/sessions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabaseAdmin.from("breakout_sessions").delete().eq("id", id);
    if (error) {
      logger.error({ err: error }, "breakout session delete error");
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "breakout session delete unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

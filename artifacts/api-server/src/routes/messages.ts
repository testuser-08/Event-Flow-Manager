import { Router } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/messages — send a message
router.post("/messages", requireAuth, async (req, res) => {
  const v = req.volunteer!;
  const { channel_id, content, urgency, photo_url } = req.body as {
    channel_id?: string;
    content?: string;
    urgency?: string;
    photo_url?: string | null;
  };

  if (!channel_id) {
    res.status(400).json({ error: "channel_id is required." });
    return;
  }
  if (!content?.trim() && !photo_url) {
    res.status(400).json({ error: "Message must have content or a photo." });
    return;
  }
  const validUrgency = ["info", "issue", "urgent"];
  if (urgency && !validUrgency.includes(urgency)) {
    res.status(400).json({ error: "urgency must be info, issue, or urgent." });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.from("messages").insert({
      channel_id,
      user_id: v.volunteerId,
      sender_name: v.name,
      content: content?.trim() ?? "",
      urgency: urgency ?? "info",
      photo_url: photo_url ?? null,
    }).select().single();

    if (error) {
      logger.error({ err: error }, "messages insert error");
      res.status(500).json({ error: "Failed to send message." });
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err }, "messages unexpected error");
    res.status(500).json({ error: "Failed to send message." });
  }
});

// POST /api/messages/upload-photo — upload a photo and return its URL
router.post("/messages/upload-photo", requireAuth, upload.single("photo"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No photo uploaded." });
    return;
  }

  const { channel_id } = req.body as { channel_id?: string };
  if (!channel_id) {
    res.status(400).json({ error: "channel_id is required." });
    return;
  }

  const ext = req.file.originalname.split(".").pop() ?? "jpg";
  const filePath = `${channel_id}/${Date.now()}.${ext}`;

  try {
    const { error } = await supabaseAdmin.storage
      .from("message-photos")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      logger.error({ err: error }, "photo upload error");
      res.status(500).json({ error: "Failed to upload photo." });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("message-photos")
      .getPublicUrl(filePath);

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    logger.error({ err }, "photo upload unexpected error");
    res.status(500).json({ error: "Failed to upload photo." });
  }
});

// DELETE /api/messages/:id — sender or admin only
router.delete("/messages/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const v = req.volunteer!;

  try {
    // Fetch the message first to check ownership
    const { data: msg, error: fetchErr } = await supabaseAdmin
      .from("messages")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !msg) {
      res.status(404).json({ error: "Message not found." });
      return;
    }

    if (!v.isAdmin && msg.user_id !== v.volunteerId) {
      res.status(403).json({ error: "You can only delete your own messages." });
      return;
    }

    const { error } = await supabaseAdmin.from("messages").delete().eq("id", id);
    if (error) {
      res.status(500).json({ error: "Failed to delete message." });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "delete message error");
    res.status(500).json({ error: "Failed to delete message." });
  }
});

// PATCH /api/messages/:id/resolve
router.patch("/messages/:id/resolve", requireAuth, async (req, res) => {
  const { id } = req.params;
  const v = req.volunteer!;

  try {
    const { data, error } = await supabaseAdmin.from("messages").update({
      is_resolved: true,
      resolved_by: v.volunteerId,
      resolved_at: new Date().toISOString(),
    }).eq("id", id).select().single();

    if (error) {
      res.status(500).json({ error: "Failed to resolve message." });
      return;
    }
    res.json(data);
  } catch (err) {
    logger.error({ err }, "resolve message error");
    res.status(500).json({ error: "Failed to resolve message." });
  }
});

export default router;

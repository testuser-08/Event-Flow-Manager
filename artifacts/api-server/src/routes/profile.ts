import { Router } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/profile/avatar — upload a new profile photo
router.post("/profile/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  const v = req.volunteer!;

  if (!req.file) {
    res.status(400).json({ error: "No image uploaded." });
    return;
  }

  try {
    const buffer = req.file.buffer;
    const ext = req.file.mimetype === "image/png" ? "png" : req.file.mimetype === "image/webp" ? "webp" : "jpg";
    const path = `${v.volunteerId}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (upErr) {
      logger.error({ err: upErr }, "avatar upload error");
      res.status(500).json({ error: "Failed to upload image." });
      return;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(path);

    // Bust any CDN cache by appending a timestamp
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: dbErr } = await supabaseAdmin
      .from("volunteers")
      .update({ avatar_url: avatarUrl })
      .eq("id", v.volunteerId);

    if (dbErr) {
      logger.error({ err: dbErr }, "avatar db update error");
      res.status(500).json({ error: "Uploaded but failed to save URL." });
      return;
    }

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    logger.error({ err }, "avatar unexpected error");
    res.status(500).json({ error: "Failed to update avatar." });
  }
});

export default router;

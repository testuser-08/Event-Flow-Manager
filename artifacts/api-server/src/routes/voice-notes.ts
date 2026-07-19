import { Router } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max (2-min audio)
});

const BUCKET = "message-voice-notes";

/**
 * POST /api/messages/upload-voice-note
 * Accepts a single `audio` file and an optional `folder` body field.
 * Returns { url } pointing to the public audio file in Supabase Storage.
 */
router.post(
  "/messages/upload-voice-note",
  requireAuth,
  upload.single("audio"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No audio file uploaded." });
      return;
    }

    const { folder } = req.body as { folder?: string };
    const folderName = (folder ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "_");

    // Determine extension from MIME type (iOS → mp4, Chrome → webm, Firefox → ogg)
    const mime = req.file.mimetype ?? "";
    const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
    const filePath = `${folderName}/${Date.now()}.${ext}`;

    try {
      // Create bucket if it does not exist yet (idempotent, ignores "already exists" error)
      await supabaseAdmin.storage
        .createBucket(BUCKET, { public: true })
        .catch(() => {});

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadErr) {
        logger.error({ err: uploadErr }, "voice-note upload error");
        res.status(500).json({ error: "Failed to upload voice note." });
        return;
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      res.json({ url: urlData.publicUrl });
    } catch (err) {
      logger.error({ err }, "voice-note upload unexpected error");
      res.status(500).json({ error: "Failed to upload voice note." });
    }
  }
);

export default router;

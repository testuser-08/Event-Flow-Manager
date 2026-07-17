import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// List volunteers
router.get("/admin/roster", async (req, res) => {
  try {
    let query = supabaseAdmin.from("volunteers").select("*").order("name");

    if (req.query.workstream) {
      query = query.eq("workstream", req.query.workstream as string);
    }
    if (req.query.is_admin !== undefined) {
      query = query.eq("is_admin", req.query.is_admin === "true");
    }

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data ?? []);
  } catch (err) {
    logger.error({ err }, "listVolunteers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upload CSV roster
// Expected CSV columns: name, email, workstream, is_admin (optional, default false)
router.post("/admin/roster", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ inserted: 0, skipped: 0, errors: ["No file uploaded"] });
    return;
  }

  let records: Record<string, string>[];
  try {
    records = parse(req.file.buffer.toString("utf-8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch (parseErr) {
    res.status(400).json({
      inserted: 0,
      skipped: 0,
      errors: [`CSV parse error: ${(parseErr as Error).message}`],
    });
    return;
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of records) {
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const workstream = row.workstream?.trim() || null;
    const isAdmin = row.is_admin?.toLowerCase() === "true" || row.is_admin === "1";

    if (!name || !email) {
      errors.push(`Row skipped — missing name or email: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "sap.com";
    if (!email.endsWith(`@${allowedDomain}`)) {
      errors.push(`Row skipped — email domain not allowed: ${email}`);
      skipped++;
      continue;
    }

    const { error } = await supabaseAdmin
      .from("volunteers")
      .upsert({ name, email, workstream, is_admin: isAdmin }, { onConflict: "email" });

    if (error) {
      errors.push(`Failed to insert ${email}: ${error.message}`);
      skipped++;
    } else {
      inserted++;
    }
  }

  res.json({ inserted, skipped, errors });
});

// Update volunteer
router.patch("/admin/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  const { workstream, is_admin } = req.body as { workstream?: string | null; is_admin?: boolean };

  const updates: Record<string, unknown> = {};
  if (workstream !== undefined) updates.workstream = workstream;
  if (is_admin !== undefined) updates.is_admin = is_admin;

  const { data, error } = await supabaseAdmin
    .from("volunteers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// Delete volunteer
router.delete("/admin/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin
    .from("volunteers")
    .delete()
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
});

export default router;

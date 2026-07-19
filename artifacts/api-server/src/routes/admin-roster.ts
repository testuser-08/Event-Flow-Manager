import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { supabaseAdmin } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// List volunteers — admin only
router.get("/admin/roster", requireAdmin, async (req, res) => {
  try {
    let query = supabaseAdmin.from("volunteers").select("*").order("name");
    if (req.query.workstream) {
      query = query.contains("workstreams", [req.query.workstream as string]);
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

// Upload CSV roster — fully replaces the existing roster
router.post("/admin/roster", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ inserted: 0, errors: ["No file uploaded."] });
    return;
  }

  // Parse CSV
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
      errors: [`CSV parse error: ${(parseErr as Error).message}`],
    });
    return;
  }

  // Validate required columns
  if (records.length === 0) {
    res.status(400).json({ inserted: 0, errors: ["CSV is empty."] });
    return;
  }
  const firstRow = records[0];
  const requiredCols = ["name", "email", "workstream", "is_admin"];
  const missingCols = requiredCols.filter((c) => !(c in firstRow));
  if (missingCols.length > 0) {
    res.status(400).json({
      inserted: 0,
      errors: [`CSV is missing required columns: ${missingCols.join(", ")}. Required: name, email, workstream, is_admin`],
    });
    return;
  }

  // Fetch valid channel names for workstream validation
  const { data: channels } = await supabaseAdmin.from("channels").select("name");
  const validChannelNames = new Set((channels ?? []).map((c: { name: string }) => c.name));

  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "sap.com";
  const errors: string[] = [];

  // Aggregate rows by email (supports multiple workstream rows per person)
  const byEmail = new Map<string, {
    name: string;
    email: string;
    workstreams: string[];
    isAdmin: boolean;
  }>();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // 1-indexed, +1 for header
    const name = row.name?.trim();
    const email = row.email?.trim().toLowerCase();
    const workstream = row.workstream?.trim() || null;
    const isAdmin = row.is_admin?.toLowerCase() === "true" || row.is_admin === "1";

    if (!email) {
      errors.push(`Row ${rowNum}: missing email.`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${rowNum} (${email}): missing name.`);
      continue;
    }
    if (!email.endsWith(`@${allowedDomain}`)) {
      errors.push(`Row ${rowNum}: email "${email}" is not an @${allowedDomain} address.`);
      continue;
    }
    if (workstream && !validChannelNames.has(workstream)) {
      errors.push(
        `Row ${rowNum} (${email}): workstream "${workstream}" does not match any existing channel. Valid channels: ${[...validChannelNames].join(", ")}`
      );
      continue;
    }

    if (byEmail.has(email)) {
      const existing = byEmail.get(email)!;
      // Merge: take is_admin = true if any row is admin
      if (isAdmin) existing.isAdmin = true;
      // Add workstream if not already listed
      if (workstream && !existing.workstreams.includes(workstream)) {
        existing.workstreams.push(workstream);
      }
    } else {
      byEmail.set(email, {
        name,
        email,
        workstreams: workstream ? [workstream] : [],
        isAdmin,
      });
    }
  }

  if (errors.length > 0 && byEmail.size === 0) {
    res.status(400).json({ inserted: 0, errors });
    return;
  }

  // REPLACE: delete all existing volunteers, then insert fresh
  const { error: deleteError } = await supabaseAdmin
    .from("volunteers")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows

  if (deleteError) {
    logger.error({ err: deleteError }, "roster delete-all error");
    res.status(500).json({ inserted: 0, errors: ["Failed to clear existing roster: " + deleteError.message] });
    return;
  }

  // Insert all aggregated volunteers
  const rows = [...byEmail.values()].map((v) => ({
    name: v.name,
    email: v.email,
    workstreams: v.workstreams,
    is_admin: v.isAdmin,
  }));

  const { error: insertError } = await supabaseAdmin.from("volunteers").insert(rows);
  if (insertError) {
    logger.error({ err: insertError }, "roster insert error");
    res.status(500).json({ inserted: 0, errors: ["Failed to insert roster: " + insertError.message] });
    return;
  }

  res.json({ inserted: rows.length, errors });
});

// Update volunteer — admin only
router.patch("/admin/volunteers/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { workstreams, is_admin } = req.body as { workstreams?: string[]; is_admin?: boolean };

  const updates: Record<string, unknown> = {};
  if (workstreams !== undefined) updates.workstreams = workstreams;
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

// Delete volunteer — admin only
router.delete("/admin/volunteers/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from("volunteers").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
});

export default router;

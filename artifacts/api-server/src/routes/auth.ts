import { Router } from "express";
import rateLimit from "express-rate-limit";
import { supabaseAdmin } from "../lib/supabase.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait a minute and try again." },
});

// POST /api/auth/login
router.post("/auth/login", loginLimiter, async (req, res) => {
  const rawEmail: string = req.body?.email ?? "";
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "sap.com";
  if (!email.endsWith(`@${allowedDomain}`)) {
    res.status(403).json({
      error: `Only @${allowedDomain} email addresses are accepted.`,
    });
    return;
  }

  try {
    // Fetch all rows for this email (could be multiple workstreams)
    const { data, error } = await supabaseAdmin
      .from("volunteers")
      .select("id, name, email, workstreams, is_admin")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      logger.error({ err: error }, "auth/login DB error");
      res.status(500).json({ error: "Login failed due to a server error. Please try again." });
      return;
    }

    if (!data) {
      res.status(403).json({
        error:
          "This email isn't on the volunteer roster. Contact your organiser if you believe this is a mistake.",
      });
      return;
    }

    const token = signToken({
      volunteerId: data.id,
      email: data.email,
      name: data.name,
      workstreams: data.workstreams ?? [],
      isAdmin: data.is_admin ?? false,
    });

    // Try to fetch avatar_url separately (column may not exist until migration runs)
    let avatarUrl: string | null = null;
    try {
      const { data: av } = await supabaseAdmin
        .from("volunteers")
        .select("avatar_url")
        .eq("id", data.id)
        .maybeSingle();
      avatarUrl = av?.avatar_url ?? null;
    } catch { /* migration not run yet — fine, defaults to initials avatar */ }

    res.json({
      token,
      volunteer: {
        volunteerId: data.id,
        email: data.email,
        name: data.name,
        workstreams: data.workstreams ?? [],
        isAdmin: data.is_admin ?? false,
        avatarUrl,
      },
    });
  } catch (err) {
    logger.error({ err }, "auth/login unexpected error");
    res.status(500).json({ error: "Login failed due to a server error. Please try again." });
  }
});

// GET /api/auth/me — validate token AND confirm still on roster
router.get("/auth/me", requireAuth, async (req, res) => {
  const v = req.volunteer!;
  try {
    const { data } = await supabaseAdmin
      .from("volunteers")
      .select("id, name, email, workstreams, is_admin")
      .eq("email", v.email)
      .maybeSingle();

    if (!data) {
      res.status(401).json({ error: "Your account has been removed from the roster." });
      return;
    }

    // Try to fetch avatar_url separately (column may not exist until migration runs)
    let avatarUrl: string | null = null;
    try {
      const { data: av } = await supabaseAdmin
        .from("volunteers")
        .select("avatar_url")
        .eq("id", data.id)
        .maybeSingle();
      avatarUrl = av?.avatar_url ?? null;
    } catch { /* migration not run yet */ }

    res.json({
      volunteerId: data.id,
      email: data.email,
      name: data.name,
      workstreams: data.workstreams ?? [],
      isAdmin: data.is_admin ?? false,
      avatarUrl,
    });
  } catch (err) {
    logger.error({ err }, "auth/me error");
    res.status(500).json({ error: "Server error checking session." });
  }
});

export default router;

import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

router.get("/alerts/active", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("alerts")
      .select("*")
      .in("status", ["active", "acknowledged"])
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json(data ?? []);
  } catch (err) {
    logger.error({ err }, "getActiveAlerts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

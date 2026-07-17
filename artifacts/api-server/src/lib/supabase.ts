import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) logger.warn("SUPABASE_URL is not set");
if (!serviceKey) logger.warn("SUPABASE_SERVICE_ROLE_KEY is not set — admin endpoints will return 503");

// Use a non-empty placeholder so createClient does not throw at startup.
// Individual route handlers will receive a proper Supabase auth error if the
// real key isn't configured yet, instead of crashing the process.
export const supabaseAdmin = createClient(
  url || "https://placeholder.supabase.co",
  serviceKey || "placeholder-key-set-SUPABASE_SERVICE_ROLE_KEY-secret",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

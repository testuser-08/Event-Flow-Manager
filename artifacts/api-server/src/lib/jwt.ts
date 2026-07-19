import jwt from "jsonwebtoken";

export interface SessionPayload {
  volunteerId: string;
  email: string;
  name: string;
  workstreams: string[];
  isAdmin: boolean;
}

const secret = (): string => {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    console.warn("[jwt] SESSION_SECRET not set — using insecure fallback");
    return "dev-insecure-fallback-secret-change-me";
  }
  return s;
};

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: "24h" });
}

export function verifyToken(token: string): SessionPayload {
  return jwt.verify(token, secret()) as SessionPayload;
}

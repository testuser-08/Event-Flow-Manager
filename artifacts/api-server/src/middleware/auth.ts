import { Request, Response, NextFunction } from "express";
import { verifyToken, SessionPayload } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      volunteer?: SessionPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }
  try {
    req.volunteer = verifyToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.volunteer?.isAdmin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  });
}

import { type Request, type Response, type NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (session) {
    req.user = session.user;
    req.session = session.session;
    next();
    return;
  }

  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string") {
    try {
      const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
      if (result.valid && result.key) {
        const userId = result.key.userId;
        req.user = { id: userId } as typeof req.user;
        next();
        return;
      }
    } catch {
      // fall through to 401
    }
  }

  res.status(401).json({ error: "Unauthorized" });
}

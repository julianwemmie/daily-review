import { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";

/**
 * Express middleware that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (and coerced) data.
 * On failure, responds with 400 and the structured error tree.
 */
export function validate<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: z.treeifyError(parsed.error) });
      return;
    }
    req.body = parsed.data;
    next();
  };
}

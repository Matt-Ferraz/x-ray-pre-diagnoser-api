import type { Request, Response, NextFunction } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthRequest<P extends ParamsDictionary = ParamsDictionary> extends Request<P> {
  user?: { userId: string; email: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de acesso não fornecido" });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";
import { env } from "../../config/env.js";

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: "Refresh token não encontrado" });
      return;
    }

    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
      await authService.logout(token);
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    res.json({ message: "Logout realizado com sucesso" });
  } catch (err) {
    next(err);
  }
}

import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import * as userService from "./user.service.js";

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.user!.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateProfile(req.user!.userId, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.changePassword(req.user!.userId, req.body);
    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.deleteAccount(req.user!.userId);
    res.clearCookie("refresh_token", { path: "/api/auth" });
    res.json({ message: "Conta excluída com sucesso" });
  } catch (err) {
    next(err);
  }
}

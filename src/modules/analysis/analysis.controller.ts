import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import * as analysisService from "./analysis.service.js";
import path from "node:path";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function analyze(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhuma imagem enviada" });
      return;
    }

    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      res.status(400).json({ error: "Formato de imagem não suportado. Use PNG, JPEG, WebP ou GIF" });
      return;
    }

    const result = await analysisService.analyzeImage(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user!.userId
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const analyses = await analysisService.getHistory(req.user!.userId);
    res.json({ analyses });
  } catch (err) {
    next(err);
  }
}

export async function getAnalysisById(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const analysis = await analysisService.getAnalysisById(req.params.id, req.user!.userId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
}

export async function getImage(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const fullPath = await analysisService.getImagePath(req.params.id, req.user!.userId);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
}

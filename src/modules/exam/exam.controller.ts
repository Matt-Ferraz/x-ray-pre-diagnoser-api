import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import * as examService from "./exam.service.js";
import path from "node:path";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
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

    const { patientId, type, reason } = req.body;
    if (!patientId || !type) {
      res.status(400).json({ error: "Paciente e tipo de exame são obrigatórios" });
      return;
    }

    const result = await examService.createExam(
      req.user!.userId,
      patientId,
      type,
      reason,
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function analyze(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const result = await examService.analyzeExam(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const exams = await examService.listExams(req.user!.userId);
    res.json({ exams });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const exam = await examService.getExamById(req.params.id, req.user!.userId);
    res.json({ exam });
  } catch (err) {
    next(err);
  }
}

export async function getImage(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const fullPath = await examService.getImagePath(req.params.id, req.user!.userId);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    await examService.deleteExam(req.params.id, req.user!.userId);
    res.json({ message: "Exame removido com sucesso" });
  } catch (err) {
    next(err);
  }
}

export async function dashboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await examService.getDashboardStats(req.user!.userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Dados inválidos",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Error) {
    console.error(`[Error] ${err.message}`, err.stack);

    const statusCode = "statusCode" in err ? (err as { statusCode: number }).statusCode : 500;
    const message = statusCode === 500 ? "Erro interno do servidor" : err.message;

    res.status(statusCode).json({ error: message });
    return;
  }

  console.error("[Error] Unknown error:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
}

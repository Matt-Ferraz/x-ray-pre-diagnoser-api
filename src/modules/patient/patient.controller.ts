import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middleware/auth.js";
import * as patientService from "./patient.service.js";

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const patient = await patientService.create(req.user!.userId, req.body);
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
}

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const patients = await patientService.list(req.user!.userId);
    res.json({ patients });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const patient = await patientService.getById(req.params.id, req.user!.userId);
    res.json({ patient });
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const patient = await patientService.update(req.params.id, req.user!.userId, req.body);
    res.json({ patient });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest<{ id: string }>, res: Response, next: NextFunction) {
  try {
    await patientService.remove(req.params.id, req.user!.userId);
    res.json({ message: "Paciente removido com sucesso" });
  } catch (err) {
    next(err);
  }
}

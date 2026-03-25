import { prisma } from "../../lib/prisma.js";
import type { CreatePatientInput, UpdatePatientInput } from "./patient.schema.js";

class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function create(userId: string, data: CreatePatientInput) {
  return prisma.patient.create({
    data: { ...data, userId },
  });
}

export async function list(userId: string) {
  return prisma.patient.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { exams: true } } },
  });
}

export async function getById(id: string, userId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id, userId },
    include: { _count: { select: { exams: true } } },
  });

  if (!patient) throw new HttpError("Paciente não encontrado", 404);
  return patient;
}

export async function update(id: string, userId: string, data: UpdatePatientInput) {
  const patient = await prisma.patient.findFirst({ where: { id, userId } });
  if (!patient) throw new HttpError("Paciente não encontrado", 404);

  return prisma.patient.update({ where: { id }, data });
}

export async function remove(id: string, userId: string) {
  const patient = await prisma.patient.findFirst({ where: { id, userId } });
  if (!patient) throw new HttpError("Paciente não encontrado", 404);

  await prisma.patient.delete({ where: { id } });
}

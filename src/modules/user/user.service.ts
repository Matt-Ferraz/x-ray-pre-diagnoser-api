import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import type { UpdateUserInput, ChangePasswordInput } from "./user.schema.js";

const BCRYPT_ROUNDS = 12;

class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const userSelect = { id: true, name: true, email: true, createdAt: true, updatedAt: true };

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) throw new HttpError("Usuário não encontrado", 404);
  return user;
}

export async function updateProfile(userId: string, data: UpdateUserInput) {
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: userId } },
    });
    if (existing) throw new HttpError("Email já está em uso", 409);
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect,
  });
}

export async function changePassword(userId: string, data: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError("Usuário não encontrado", 404);

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) throw new HttpError("Senha atual incorreta", 401);

  const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function deleteAccount(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

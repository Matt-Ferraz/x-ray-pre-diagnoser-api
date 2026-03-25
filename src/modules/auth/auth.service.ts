import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../../utils/jwt.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

const BCRYPT_ROUNDS = 12;

class HttpError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function register(data: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new HttpError("Email já cadastrado", 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const tokens = await generateTokens(user.id, user.email);

  return { user, ...tokens };
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new HttpError("Credenciais inválidas", 401);
  }

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) {
    throw new HttpError("Credenciais inválidas", 401);
  }

  const tokens = await generateTokens(user.id, user.email);

  return {
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    ...tokens,
  };
}

export async function refresh(refreshTokenRaw: string) {
  const payload = verifyRefreshToken(refreshTokenRaw);
  const tokenHash = hashToken(refreshTokenRaw);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
    }
    throw new HttpError("Refresh token inválido ou expirado", 401);
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new HttpError("Usuário não encontrado", 404);
  }

  return generateTokens(user.id, user.email);
}

export async function logout(refreshTokenRaw: string) {
  const tokenHash = hashToken(refreshTokenRaw);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

async function generateTokens(userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });

  const record = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: "placeholder",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const refreshToken = signRefreshToken({ userId, tokenId: record.id });
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { tokenHash },
  });

  return { accessToken, refreshToken };
}

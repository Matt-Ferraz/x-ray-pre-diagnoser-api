import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número"),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

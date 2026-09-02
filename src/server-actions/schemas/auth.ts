import { z } from 'zod';

export const loginSchema = z.object({
  username: z.coerce
    .string()
    .trim()
    .min(1, 'El nombre de usuario es obligatorio'),
  password: z.coerce
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const signupSchema = z.object({
  username: z.coerce
    .string()
    .trim()
    .min(1, 'El nombre de usuario es obligatorio')
    .regex(/^[a-zA-Z0-9._-]+$/, 'El nombre solo puede tener letras, números, puntos, guiones y guion bajo'),
  password: z.coerce
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

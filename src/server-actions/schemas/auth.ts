import { z } from 'zod';
import { authErrores } from '@/literals';

export const loginSchema = z.object({
  username: z.coerce
    .string()
    .trim()
    .min(1, authErrores.usuarioObligatorio),
  password: z.coerce
    .string()
    .min(6, authErrores.contrasenaCorta),
});

export const signupSchema = z.object({
  username: z.coerce
    .string()
    .trim()
    .min(1, authErrores.usuarioObligatorio)
    .regex(/^[a-zA-Z0-9._-]+$/, authErrores.usuarioFormatoInvalido),
  password: z.coerce
    .string()
    .min(6, authErrores.contrasenaCorta),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

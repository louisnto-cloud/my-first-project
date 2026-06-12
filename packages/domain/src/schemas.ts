import { z } from 'zod';
import { ROLES } from './rbac';

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(6).max(200),
});

export const roleSchema = z.enum(ROLES);

export type LoginInput = z.infer<typeof loginSchema>;

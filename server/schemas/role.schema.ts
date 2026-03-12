import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(1, "Имя роли обязательно").max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();
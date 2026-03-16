import { z } from "zod";

export const createPermissionSchema = z.object({
  key: z.string().min(1, "Ключ обязателен").max(100),
  name: z.string().min(1, "Название обязательно").max(100),
  description: z.string().optional(),
  category: z.enum(["pages", "management"]),
});
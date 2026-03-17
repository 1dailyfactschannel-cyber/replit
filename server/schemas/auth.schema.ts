import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Имя пользователя обязательно"),
  password: z.string().min(1, "Пароль обязателен"),
});

export const registerSchema = z.object({
  username: z.string()
    .min(1, "Имя пользователя обязательно")
    .max(50, "Имя пользователя слишком длинное"),
  email: z.string().email("Невалидный email адрес"),
  password: z.string()
    .min(6, "Пароль должен быть минимум 6 символов")
    .max(100, "Пароль слишком длинный"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
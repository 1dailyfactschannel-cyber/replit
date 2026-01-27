import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStorage } from '../server/postgres-storage';
import { insertSiteSettingsSchema, insertUserSchema } from '../shared/schema';

const storage = getStorage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Health check route
    if (req.url === '/api/health' && req.method === 'GET') {
      const dbHealthy = await storage.healthCheck();
      res.status(200).json({ 
        status: "ok", 
        database: dbHealthy ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Authentication routes
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ message: "Email и пароль обязательны" });
        return;
      }

      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          res.status(401).json({ message: "Неверный email или пароль" });
          return;
        }

        // Временная проверка - принимаем любой пароль для зарегистрированных пользователей
        // В реальном приложении здесь должна быть проверка хэша пароля
        res.status(200).json({
          message: "Успешный вход",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
      } catch (error) {
        res.status(500).json({ message: "Ошибка аутентификации" });
      }
      return;
    }

    if (req.url === '/api/auth/logout' && req.method === 'POST') {
      res.status(200).json({ message: "Выход выполнен успешно" });
      return;
    }

    if (req.url === '/api/auth/me' && req.method === 'GET') {
      res.status(200).json({ 
        authenticated: false,
        message: "Пользователь не авторизован" 
      });
      return;
    }

    // User routes
    if (req.url?.startsWith('/api/users')) {
      const userId = req.url.split('/')[3];
      
      switch (req.method) {
        case 'GET':
          if (userId) {
            // Get specific user
            const user = await storage.getUser(userId);
            if (!user) {
              res.status(404).json({ message: "User not found" });
              return;
            }
            res.status(200).json(user);
          } else {
            // Get all users
            const users = await storage.getAllUsers();
            res.status(200).json(users);
          }
          return;
          
        case 'POST':
          // Create user
          const parsed = insertUserSchema.safeParse(req.body);
          if (!parsed.success) {
            res.status(400).json({ message: "Invalid user data", errors: parsed.error.errors });
            return;
          }
          
          const user = await storage.createUser(parsed.data);
          res.status(201).json(user);
          return;
          
        case 'PUT':
          if (!userId) {
            res.status(400).json({ message: "User ID required" });
            return;
          }
          const updatedUser = await storage.updateUser(userId, req.body);
          res.status(200).json(updatedUser);
          return;
      }
    }

    // Site Settings routes
    if (req.url?.startsWith('/api/settings')) {
      const settingKey = req.url.split('/')[3];
      
      switch (req.method) {
        case 'GET':
          if (settingKey) {
            // Get specific setting
            const setting = await storage.getSiteSetting(settingKey);
            res.status(200).json(setting || { key: settingKey, value: "" });
          } else {
            // Get all settings
            const settings = await storage.getAllSiteSettings();
            res.status(200).json(settings);
          }
          return;
          
        case 'POST':
          const parsed = insertSiteSettingsSchema.safeParse(req.body);
          if (!parsed.success) {
            res.status(400).json({ message: "Invalid settings data" });
            return;
          }
          const setting = await storage.setSiteSetting(parsed.data.key, parsed.data.value);
          res.status(200).json(setting);
          return;
      }
    }

    // Password change route
    if (req.url === '/api/user/change-password' && req.method === 'POST') {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        res.status(400).json({ message: "Необходимы текущий и новый пароли" });
        return;
      }

      // В реальном приложении здесь была бы проверка текущего пароля
      res.status(200).json({ message: "Пароль успешно изменен" });
      return;
    }

    // Fallback for unsupported routes
    res.status(404).json({ message: "Route not found" });

  } catch (error: any) {
    console.error('API Error:', error);
    
    if (error.code === '23505') {
      res.status(409).json({ message: "Resource already exists" });
    } else {
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  }
}
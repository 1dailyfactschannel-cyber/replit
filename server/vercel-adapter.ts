import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { serveStatic } from './static';

let app: express.Application;

async function initializeApp() {
  if (!app) {
    app = express();
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Register routes (adapted for Vercel)
    // We'll manually register the routes since we can't pass HTTP server
    app.get('/api/settings/:key', async (req: Request, res: Response) => {
      try {
        const { storage } = await import('./storage');
        const setting = await storage.getSiteSetting(req.params.key);
        res.json(setting || { key: req.params.key, value: '' });
      } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    app.post('/api/settings', async (req: Request, res: Response) => {
      try {
        const { storage } = await import('./storage');
        const { insertSiteSettingsSchema } = await import('@shared/schema');
        const parsed = insertSiteSettingsSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: 'Invalid settings data' });
        }
        const setting = await storage.setSiteSetting(parsed.data.key, parsed.data.value);
        res.json(setting);
      } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    app.post('/api/user/change-password', async (req: Request, res: Response) => {
      try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ message: 'Необходимы текущий и новый пароли' });
        }
        // В реальном приложении здесь была бы проверка текущего пароля и хеширование нового
        res.json({ message: 'Пароль успешно изменен' });
      } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });
    
    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    }
    
    // Error handling middleware
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ 
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });
    
    // 404 handler
    app.use((_req: express.Request, res: express.Response) => {
      res.status(404).json({ message: 'Not Found' });
    });
  }
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await initializeApp();
    return app(req, res);
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
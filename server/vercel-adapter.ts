import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes';
import { serveStatic } from './static';

let app: express.Application;
let server: ReturnType<typeof createServer>;

async function initializeApp() {
  if (!app) {
    app = express();
    const httpServer = createServer(app);
    
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Register routes
    await registerRoutes(httpServer, app);
    
    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    }
    
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ message });
    });
    
    server = httpServer;
  }
  return { app, server };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { app } = await initializeApp();
  
  // Convert Vercel request to Express request
  app(req as any, res as any);
}
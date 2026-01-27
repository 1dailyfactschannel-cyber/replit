import express from 'express';
import type { Request, Response, NextFunction } from 'express';

// Simple Vercel adapter for Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/settings/:key', async (req: Request, res: Response) => {
  try {
    // Mock response for now - replace with actual storage
    res.json({ key: req.params.key, value: '' });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    // Mock response for now - replace with actual storage
    res.json({ key: req.body.key, value: req.body.value });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/user/change-password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Необходимы текущий и новый пароли' });
    }
    // Mock success response
    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Static file serving for production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
  const distPath = path.resolve(__dirname, '../dist/public');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

// Error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found' });
});

export default async function handler(req: any, res: any) {
  try {
    console.log(`Processing ${req.method} ${req.url}`);
    return app(req, res);
  } catch (error) {
    console.error('Function crash:', error);
    res.status(500).json({ 
      message: 'Function crashed',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
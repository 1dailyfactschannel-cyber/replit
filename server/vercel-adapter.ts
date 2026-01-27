import express from 'express';
import type { Request, Response } from 'express';

// Phase 1: Basic working adapter
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check - working endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Express adapter is working!'
  });
});

// Test endpoint
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({ 
    message: 'Test endpoint works!',
    adapter: 'vercel-express'
  });
});

// Phase 2: Add basic API routes gradually
app.get('/api/settings/:key', async (req: Request, res: Response) => {
  try {
    // Simple mock response for now
    res.json({ 
      key: req.params.key, 
      value: `mock-value-for-${req.params.key}`,
      source: 'vercel-deployment'
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    // Simple mock response
    res.json({ 
      key: req.body.key, 
      value: req.body.value,
      saved: true,
      source: 'vercel-deployment'
    });
  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Catch-all for frontend routing
app.get('*', (_req: Request, res: Response) => {
  res.json({ 
    message: 'Frontend route placeholder',
    note: 'Static files will be served in production'
  });
});

// Error handling
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Express error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default async function handler(req: any, res: any) {
  try {
    console.log(`Processing ${req.method} ${req.url}`);
    return app(req, res);
  } catch (error) {
    console.error('Function crash:', error);
    res.status(500).json({ 
      message: 'Function crashed during Express processing',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
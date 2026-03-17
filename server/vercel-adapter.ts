import express from 'express';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';

// Main Vercel adapter for full website deployment
const app = express();

// Security: CORS configuration
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : null;
  
  if (process.env.NODE_ENV === 'production' && !origins) {
    console.warn('⚠️  WARNING: ALLOWED_ORIGINS not set in production');
    return [];
  }
  
  return origins || ['http://localhost:3005', 'http://localhost:3000'];
};

const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Security: Helmet for HTTP headers protection including CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      workerSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true,
  crossOriginEmbedderPolicy: false,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API is working!'
  });
});

app.get('/api/test', (_req: Request, res: Response) => {
  res.json({ 
    message: 'API test successful!',
    adapter: 'vercel-full-site'
  });
});

app.get('/api/settings/:key', async (req: Request, res: Response) => {
  try {
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

// Static file serving for production website
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
  // Try multiple possible paths for static files
  const possiblePaths = [
    path.resolve(__dirname, '../dist/public'),
    path.resolve(__dirname, '../../dist/public'),
    path.resolve(__dirname, '../public')
  ];
  
  let distPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      distPath = possiblePath;
      console.log('Found static files at:', distPath);
      break;
    }
  }
  
  if (distPath) {
    // Serve static files
    app.use(express.static(distPath));
    
    // SPA fallback - all routes serve index.html
    app.get('*', (_req: Request, res: Response) => {
      const indexPath = path.resolve(distPath!, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Fallback if index.html not found
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>m4portal</title>
            <meta charset="utf-8">
          </head>
          <body>
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
              <h1>m4portal</h1>
              <p>Website is deployed successfully!</p>
              <p><a href="/api/health">Check API Health</a></p>
              <p>Build path: ${distPath}</p>
            </div>
          </body>
          </html>
        `);
      }
    });
  } else {
    console.log('Static files not found, serving fallback HTML');
    // Fallback when no static files found
    app.get('*', (_req: Request, res: Response) => {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>m4portal - Deployed</title>
          <meta charset="utf-8">
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1>m4portal</h1>
            <p>✅ Application deployed successfully to Vercel!</p>
            <p>🚀 Serverless function is working</p>
            <p>🔧 Static files path needs configuration</p>
            <hr>
            <p><a href="/api/health">🏥 Check API Health</a></p>
            <p><a href="/api/test">🧪 Test API Endpoint</a></p>
          </div>
        </body>
        </html>
      `);
    });
  }
} else {
  // Development mode fallback
  app.get('*', (_req: Request, res: Response) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>m4portal - Development</title>
        <meta charset="utf-8">
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
          <h1>m4portal</h1>
          <p>Development mode - run 'npm run dev' locally</p>
          <p><a href="/api/health">Check API</a></p>
        </div>
      </body>
      </html>
    `);
  });
}

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
      message: 'Function crashed during site processing',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
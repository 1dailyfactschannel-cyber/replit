// Ultra-simple Vercel function that serves the built website
import { createReadStream } from 'fs';
import { join } from 'path';

// Security: Get allowed CORS origins
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

// Security: CSP directives for production
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' ws: wss:",
  "worker-src 'self' blob:",
  "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
  "object-src 'none'",
  "frame-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ');

// Security headers to apply to all responses
function setSecurityHeaders(res: any, req?: any) {
  // CSP header
  res.setHeader('Content-Security-Policy', CSP_DIRECTIVES);
  
  // HSTS header - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS headers for API requests
  const allowedOrigins = getAllowedOrigins();
  const origin = req?.headers?.origin || '';
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
}

export default async function handler(req: any, res: any) {
  try {
    // Set security headers for all responses
    setSecurityHeaders(res, req);
    
    console.log('Request received:', req.method, req.url);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Handle API endpoints first
    if (req.url.startsWith('/api/')) {
      if (req.url === '/api/health') {
        return res.status(200).json({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          message: 'API is working!'
        });
      }
      
      if (req.url === '/api/test') {
        return res.status(200).json({ 
          message: 'API test successful!',
          function: 'ultra-simple-vercel'
        });
      }
      
      // Other API routes
      return res.status(200).json({ 
        message: 'API endpoint called',
        url: req.url
      });
    }
    
    // Serve the website for all other routes
    const path = require('path');
    const fs = require('fs');
    
    // Try to find the built files
    const possiblePaths = [
      path.resolve(__dirname, '../dist/public'),
      path.resolve(__dirname, '../../dist/public'),
      path.resolve(process.cwd(), 'dist/public'),
      path.resolve(process.cwd(), '../dist/public')
    ];
    
    let distPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        distPath = possiblePath;
        console.log('Found dist at:', distPath);
        break;
      }
    }
    
    if (distPath) {
      // For root path, serve index.html
      if (req.url === '/' || req.url === '') {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.setHeader('Content-Type', 'text/html');
          return res.status(200).send(fs.readFileSync(indexPath, 'utf8'));
        }
      }
      
      // Try to serve requested file
      // Security: Prevent path traversal attacks
      const requestedPath = req.url.split('?')[0]; // Remove query string
      if (requestedPath.includes('..')) {
        return res.status(403).send('Forbidden');
      }
      
      const filePath = path.join(distPath, requestedPath);
      
      // Security: Ensure the resolved path is within distPath
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(distPath))) {
        return res.status(403).send('Forbidden');
      }
      
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Set appropriate content type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        };
        
        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        
        // Stream the file
        const stream = createReadStream(filePath);
        res.status(200);
        return stream.pipe(res);
      }
      
      // SPA fallback - serve index.html for any route
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(fs.readFileSync(indexPath, 'utf8'));
      }
    }
    
    // Ultimate fallback - simple HTML page
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>m4portal - Deployed Successfully</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center; 
            margin: 0; 
            padding: 50px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
          }
          h1 { font-size: 2.5rem; margin-bottom: 20px; }
          .status { 
            display: inline-block;
            background: rgba(0, 255, 0, 0.2);
            padding: 10px 20px;
            border-radius: 30px;
            margin: 20px 0;
          }
          .links {
            margin: 30px 0;
          }
          a {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 12px 24px;
            margin: 10px;
            text-decoration: none;
            border-radius: 8px;
            transition: background 0.3s;
          }
          a:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          .info {
            margin-top: 30px;
            font-size: 0.9rem;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 m4portal</h1>
          <div class="status">✅ Successfully Deployed to Vercel!</div>
          
          <p>Serverless function is working correctly</p>
          <p>Built files location: ${distPath || 'Not found'}</p>
          
          <div class="links">
            <a href="/api/health">🏥 API Health Check</a>
            <a href="/api/test">🧪 Test API</a>
          </div>
          
          <div class="info">
            <p>If you see this page, the deployment is working!</p>
            <p>The React app should load automatically.</p>
          </div>
        </div>
      </body>
      </html>
    `);
    
  } catch (error: any) {
    console.error('Function error:', error);
    res.status(500).json({ 
      error: 'Function crashed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
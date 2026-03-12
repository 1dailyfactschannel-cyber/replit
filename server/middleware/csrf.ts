import { Request, Response, NextFunction } from "express";
import { doubleCsrf } from "csrf-csrf";

const CSRF_SECRET = process.env.SESSION_SECRET || "default-secret-change-in-production";

const { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req) => {
    // @ts-ignore - express-session adds session property
    return req.sessionID || "anonymous";
  },
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    path: "/",
  },
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
});

// Apply CSRF protection only to specific endpoints
export const csrfProtect = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;
  
  // Define protected endpoints
  const protectedEndpoints = [
    { path: '/api/auth/login', methods: ['POST'] },
    { path: '/api/auth/register', methods: ['POST'] },
    { path: '/api/auth/logout', methods: ['POST'] },
    { path: '/api/roles', methods: ['POST', 'PUT', 'DELETE'] },
    { path: /^\/api\/roles\/.+$/, methods: ['PUT', 'DELETE'] },
    { path: '/api/permissions', methods: ['POST', 'DELETE'] },
    { path: /^\/api\/permissions\/.+$/, methods: ['DELETE'] },
  ];
  
  const shouldProtect = protectedEndpoints.some(p => {
    const pathMatch = typeof p.path === 'string' 
      ? path === p.path || (p.path.endsWith('/') && path.startsWith(p.path))
      : p.path.test(path);
    return pathMatch && p.methods.includes(method);
  });
  
  if (shouldProtect) {
    return doubleCsrfProtection(req, res, next);
  }
  next();
};

// Endpoint to get CSRF token for frontend
export const getCsrfToken = (req: Request, res: Response) => {
  try {
    const token = generateCsrfToken(req, res);
    return res.json({ csrfToken: token });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return res.status(500).json({ error: "Failed to generate CSRF token", details: String(error) });
  }
};

export { invalidCsrfTokenError };

import { Request, Response, NextFunction } from "express";
import { doubleCsrf } from "csrf-csrf";

const CSRF_SECRET = process.env.SESSION_SECRET;
if (!CSRF_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for CSRF protection");
}

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

// Apply CSRF protection to ALL state-changing API endpoints
export const csrfProtect = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  const method = req.method;

  // Skip CSRF for non-API routes (static assets, vite HMR, etc.)
  if (!path.startsWith("/api/")) {
    return next();
  }

  // Skip safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next();
  }

  // Skip auth login/register endpoints (they establish the session)
  const authExempt = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/webhook/telegram",
  ];
  if (authExempt.includes(path)) {
    return next();
  }

  // Protect everything else
  return doubleCsrfProtection(req, res, next);
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

import { Request, Response, NextFunction } from "express";
export function rateLimiter(maxRequests: number, windowMs: number) {
  // Scoped per rateLimiter(...) call site (i.e. per route), not module-wide — a shared
  // Map here would mean every rate-limited route drew from the same per-IP budget, so a
  // burst on one route (e.g. login) could false-positive-429 an unrelated route with its
  // own, possibly lower, threshold.
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = requestCounts.get(ip);
    if (!record || now > record.resetTime) { requestCounts.set(ip, { count: 1, resetTime: now + windowMs }); return next(); }
    record.count++;
    if (record.count > maxRequests) return res.status(429).json({ error: "Too many requests. Please wait and try again." });
    next();
  };
}
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  function clean(v: string) { return v.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;").trim(); }
  function sanitizeObj(obj: Record<string,unknown>): Record<string,unknown> {
    const out: Record<string,unknown> = {};
    for (const [k,v] of Object.entries(obj)) { out[k] = typeof v==="string" ? clean(v) : (typeof v==="object"&&v!==null&&!Array.isArray(v)) ? sanitizeObj(v as Record<string,unknown>) : v; }
    return out;
  }
  if (req.body && typeof req.body==="object") req.body = sanitizeObj(req.body);
  next();
}
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("X-XSS-Protection","1; mode=block");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
res.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self';");
  next();
}
export function globalErrorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error("[ERROR]", err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

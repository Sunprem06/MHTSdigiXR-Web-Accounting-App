import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import type { Express, Request, Response, NextFunction } from "express";
import type { Role, Permission } from "@shared/schema";
import { SYSTEM_ROLE_PERMISSIONS } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      fullName: string;
      role: Role;
      permissions: Permission[];
      isActive: boolean;
    }
  }
}

async function resolvePermissions(employee: { role: string; permissions: unknown }): Promise<Permission[]> {
  const rolePerms: Permission[] = [];
  try {
    const dbRole = await storage.getRoleBySlug(employee.role);
    if (dbRole && Array.isArray(dbRole.permissions)) {
      rolePerms.push(...(dbRole.permissions as Permission[]));
    }
  } catch {
    const fallback = SYSTEM_ROLE_PERMISSIONS[employee.role];
    if (fallback) rolePerms.push(...fallback);
  }
  if (rolePerms.length === 0) {
    const fallback = SYSTEM_ROLE_PERMISSIONS[employee.role];
    if (fallback) rolePerms.push(...fallback);
  }
  const userOverrides = Array.isArray(employee.permissions) ? (employee.permissions as Permission[]) : [];
  if (userOverrides.length > 0) {
    const merged = new Set([...rolePerms, ...userOverrides]);
    return [...merged];
  }
  return rolePerms;
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const employee = await storage.getEmployeeByUsername(username);
        if (!employee) {
          return done(null, false, { message: "Invalid username or password" });
        }
        if (!employee.isActive) {
          return done(null, false, { message: "Account is deactivated" });
        }
        const isValid = await bcrypt.compare(password, employee.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        await storage.updateEmployeeLastLogin(employee.id);
        const perms = await resolvePermissions(employee);
        return done(null, {
          id: employee.id,
          username: employee.username,
          email: employee.email,
          fullName: employee.fullName,
          role: employee.role as Role,
          permissions: perms,
          isActive: employee.isActive,
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const employee = await storage.getEmployeeById(id);
      if (!employee || !employee.isActive) {
        return done(null, false);
      }
      const perms = await resolvePermissions(employee);
      done(null, {
        id: employee.id,
        username: employee.username,
        email: employee.email,
        fullName: employee.fullName,
        role: employee.role as Role,
        permissions: perms,
        isActive: employee.isActive,
      });
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.logIn(user, async (err) => {
        if (err) return next(err);
        await storage.createAuditLog({
          employeeId: user.id,
          action: "login",
          entity: "auth",
          details: "User logged in",
          ipAddress: req.ip || req.socket.remoteAddress || null,
        });
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      if (userId) {
        storage.createAuditLog({
          employeeId: userId,
          action: "logout",
          entity: "auth",
          details: "User logged out",
          ipAddress: req.ip || req.socket.remoteAddress || null,
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!roles.includes(req.user!.role as Role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

export function requirePermission(...perms: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const userPerms = req.user!.permissions || [];
    const hasAll = perms.every(p => userPerms.includes(p));
    if (!hasAll) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

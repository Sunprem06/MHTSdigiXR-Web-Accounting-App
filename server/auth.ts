import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import crypto from "crypto";
import { pool } from "./db";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import type { Express, Request, Response, NextFunction } from "express";
import type { Role, Permission } from "@shared/schema";
import { SYSTEM_ROLE_PERMISSIONS } from "@shared/schema";

const PASSWORD_EXPIRY_DAYS = 45;
const CHALLENGE_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const expiryTokens = new Map<string, { employeeId: number; expiresAt: number }>();

function createExpiryToken(employeeId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  expiryTokens.set(token, { employeeId, expiresAt: Date.now() + CHALLENGE_TOKEN_EXPIRY_MS });
  return token;
}

function consumeExpiryToken(token: string): number | null {
  const record = expiryTokens.get(token);
  if (!record) return null;
  expiryTokens.delete(token);
  if (Date.now() > record.expiresAt) return null;
  return record.employeeId;
}

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
      passwordChangedAt: string | null;
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
  const userOverrides = Array.isArray(employee.permissions) ? (employee.permissions as Permission[]) : null;
  if (userOverrides !== null) {
    return [...new Set(userOverrides)];
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

        const passwordChangedAt = employee.passwordChangedAt || employee.createdAt;
        const daysSinceChange = Math.floor((Date.now() - new Date(passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceChange >= PASSWORD_EXPIRY_DAYS) {
          return done(null, false, { message: `PASSWORD_EXPIRED:${employee.id}` });
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
          passwordChangedAt: passwordChangedAt ? new Date(passwordChangedAt).toISOString() : null,
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
      const pca = employee.passwordChangedAt || employee.createdAt;
      done(null, {
        id: employee.id,
        username: employee.username,
        email: employee.email,
        fullName: employee.fullName,
        role: employee.role as Role,
        permissions: perms,
        isActive: employee.isActive,
        passwordChangedAt: pca ? new Date(pca).toISOString() : null,
      });
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        if (info?.message?.startsWith("PASSWORD_EXPIRED:")) {
          const employeeId = parseInt(info.message.split(":")[1]);
          const challengeToken = createExpiryToken(employeeId);
          return res.status(200).json({ passwordExpired: true, challengeToken, message: "Your password has expired. Please set a new password." });
        }
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

  app.post("/api/auth/force-change-password", async (req: Request, res: Response) => {
    const { challengeToken, newPassword } = req.body;
    if (!challengeToken || !newPassword) {
      return res.status(400).json({ message: "Invalid request" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    const employeeId = consumeExpiryToken(challengeToken);
    if (employeeId === null) {
      return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
    }
    const employee = await storage.getEmployeeById(employeeId);
    if (!employee || !employee.isActive) {
      return res.status(401).json({ message: "Invalid or expired token. Please log in again." });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await storage.updateEmployeePassword(employee.id, hashed);
    await storage.createAuditLog({
      employeeId: employee.id,
      action: "password_change",
      entity: "auth",
      details: "Password changed (expired password reset)",
      ipAddress: req.ip || req.socket.remoteAddress || null,
    });
    return res.json({ message: "Password changed successfully. You can now log in." });
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

  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    try {
      const employee = await storage.getEmployeeById(req.user!.id);
      if (!employee) {
        return res.status(404).json({ message: "User not found" });
      }
      const isValid = await bcrypt.compare(currentPassword, employee.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateEmployee(employee.id, { password: hashed });
      await storage.createAuditLog({
        employeeId: req.user!.id,
        action: "change_password",
        entity: "auth",
        details: "User changed their own password",
        ipAddress: req.ip || req.socket.remoteAddress || null,
      });
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to change password" });
    }
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

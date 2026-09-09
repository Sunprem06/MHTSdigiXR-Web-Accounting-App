import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { ATTACHMENT_ENTITY_TYPES, type AttachmentEntityType, type Permission } from "@shared/schema";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "attachments");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Browsers report inconsistent mimetypes for the same extension (e.g. .csv as
// text/csv or application/vnd.ms-excel depending on OS/app), so the extension
// on the original filename is the primary gate here, not the reported mimetype.
const ALLOWED_EXTENSIONS = new Set([".doc", ".docx", ".xls", ".xlsx", ".pdf", ".csv", ".png", ".jpg", ".jpeg"]);

interface EntityConfig {
  viewPermission: Permission;
  uploadPermission: Permission;
  managePermission: Permission;
  entityExists: (id: number) => Promise<boolean>;
}

const ENTITY_CONFIG: Record<AttachmentEntityType, EntityConfig> = {
  voucher: {
    viewPermission: "vouchers.view",
    uploadPermission: "vouchers.create",
    managePermission: "vouchers.approve",
    entityExists: async (id) => !!(await storage.getVoucher(id)),
  },
  expense_claim: {
    viewPermission: "expenses.view",
    uploadPermission: "expenses.create",
    managePermission: "expenses.approve",
    entityExists: async (id) => !!(await storage.getExpenseClaim(id)),
  },
  quotation: {
    viewPermission: "quotations.view",
    uploadPermission: "quotations.create",
    managePermission: "quotations.approve",
    entityExists: async (id) => !!(await storage.getQuotation(id)),
  },
  party: {
    viewPermission: "parties.view",
    uploadPermission: "parties.create",
    managePermission: "parties.delete",
    entityExists: async (id) => !!(await storage.getParty(id)),
  },
};

function isValidEntityType(value: string): value is AttachmentEntityType {
  return (ATTACHMENT_ENTITY_TYPES as readonly string[]).includes(value);
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("Unsupported file type. Allowed: doc, docx, xls, xlsx, pdf, csv, png, jpg, jpeg."));
    }
    cb(null, true);
  },
});

export function registerAttachmentRoutes(app: Express) {
  app.get("/api/accounting/attachments/:entityType/:entityId", requireAuth, async (req, res) => {
    const { entityType, entityId } = req.params as { entityType: string; entityId: string };
    if (!isValidEntityType(entityType)) return res.status(400).json({ message: "Invalid entity type" });
    const config = ENTITY_CONFIG[entityType];
    if (!req.user!.permissions?.includes(config.viewPermission)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    const id = parseInt(entityId);
    if (isNaN(id) || !(await config.entityExists(id))) {
      return res.status(404).json({ message: "Record not found" });
    }
    const list = await storage.getAttachmentsByEntity(entityType, id);
    res.json(list);
  });

  app.post(
    "/api/accounting/attachments/:entityType/:entityId",
    requireAuth,
    (req, res, next) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err) return res.status(400).json({ message: err instanceof Error ? err.message : "Upload failed" });
        next();
      });
    },
    async (req, res) => {
      const { entityType, entityId } = req.params as { entityType: string; entityId: string };
      const cleanup = () => { if (req.file) fs.unlink(req.file.path, () => {}); };

      if (!isValidEntityType(entityType)) {
        cleanup();
        return res.status(400).json({ message: "Invalid entity type" });
      }
      const config = ENTITY_CONFIG[entityType];
      if (!req.user!.permissions?.includes(config.uploadPermission)) {
        cleanup();
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      const id = parseInt(entityId);
      if (isNaN(id) || !(await config.entityExists(id))) {
        cleanup();
        return res.status(404).json({ message: "Record not found" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const attachment = await storage.createAttachment({
        entityType,
        entityId: id,
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
        uploadedBy: req.user!.id,
      });

      await storage.createAuditLog({
        employeeId: req.user!.id, action: "create", entity: "attachment",
        entityId: attachment.id, details: `Uploaded "${req.file.originalname}" to ${entityType} #${id}`,
        ipAddress: req.ip || null,
      });

      res.status(201).json(attachment);
    }
  );

  app.get("/api/accounting/attachments/file/:id/download", requireAuth, async (req, res) => {
    const attachment = await storage.getAttachment(parseInt(req.params.id as string));
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });
    if (!isValidEntityType(attachment.entityType)) return res.status(400).json({ message: "Invalid attachment" });

    const config = ENTITY_CONFIG[attachment.entityType];
    if (!req.user!.permissions?.includes(config.viewPermission)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ message: "File missing on disk" });
    }
    res.download(attachment.filePath, attachment.originalFileName);
  });

  app.delete("/api/accounting/attachments/:id", requireAuth, async (req, res) => {
    const attachment = await storage.getAttachment(parseInt(req.params.id as string));
    if (!attachment) return res.status(404).json({ message: "Attachment not found" });
    if (!isValidEntityType(attachment.entityType)) return res.status(400).json({ message: "Invalid attachment" });

    const config = ENTITY_CONFIG[attachment.entityType];
    const canManage = req.user!.permissions?.includes(config.managePermission);
    const isOwner = attachment.uploadedBy === req.user!.id;
    if (!canManage && !isOwner) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    await storage.deleteAttachment(attachment.id);
    fs.unlink(attachment.filePath, () => {});

    await storage.createAuditLog({
      employeeId: req.user!.id, action: "delete", entity: "attachment",
      entityId: attachment.id, details: `Deleted attachment "${attachment.originalFileName}" from ${attachment.entityType} #${attachment.entityId}`,
      ipAddress: req.ip || null,
    });

    res.json({ message: "Attachment deleted" });
  });
}

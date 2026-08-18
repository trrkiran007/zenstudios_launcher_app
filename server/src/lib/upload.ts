import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { BRANDING_DIR, UPLOAD_DIR } from '../config.js';

function diskStorage(dest: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 12).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });
}

/** Attachments: screenshots, site photos, bills, signed copies. */
export const upload = multer({
  storage: diskStorage(UPLOAD_DIR),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const uploadLogo = multer({
  storage: diskStorage(BRANDING_DIR),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(png|jpeg|jpg|webp|svg\+xml)$/.test(file.mimetype));
  },
});

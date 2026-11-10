import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Avatar upload — local disk storage (no S3 required)
//
// NOTE: For uploaded files to be publicly accessible, index.js must serve the
// uploads directory as static files. Add this line in index.js after the other
// middleware (before route mounting):
//
//   import { fileURLToPath } from 'url';
//   const __dirname = path.dirname(fileURLToPath(import.meta.url));
//   app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
//
// ---------------------------------------------------------------------------

const AVATAR_DIR = path.resolve('uploads/avatars');

// Ensure the upload directory exists at startup
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'), { status: 400 }));
    }
  },
});

const router = Router();
router.use(authenticate);

// GET /api/users/me
router.get('/me', async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, deleted_at: null }).select('-password_hash').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/users/me
router.patch('/me', async (req, res) => {
  const forbidden = ['password_hash', 'email_verified', 'subscription_tier', 'deleted_at'];
  forbidden.forEach((f) => delete req.body[f]);
  const user = await User.findByIdAndUpdate(req.user._id, { $set: req.body }, { new: true })
    .select('-password_hash');
  res.json(user);
});

// GET /api/users/me/settings
router.get('/me/settings', async (req, res) => {
  const user = await User.findOne({ _id: req.user._id, deleted_at: null }).select('settings').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user.settings);
});

// PATCH /api/users/me/settings
router.patch('/me/settings', async (req, res) => {
  const update = {};
  Object.entries(req.body).forEach(([k, v]) => { update[`settings.${k}`] = v; });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true })
    .select('settings');
  res.json(user.settings);
});

// DELETE /api/users/me (soft delete)
router.delete('/me', async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { deleted_at: new Date() });
  res.json({ message: 'Account scheduled for deletion' });
});

// POST /api/users/me/avatar
// Accepts: multipart/form-data with field name "avatar"
// Returns: { avatarUrl: "/uploads/avatars/{filename}" }
router.post('/me/avatar', avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send the image as form-data field "avatar".' });
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatarUrl } },
    { new: true },
  ).select('-password_hash');

  res.json({ avatarUrl, user });
});

export default router;

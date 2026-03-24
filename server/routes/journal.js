const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { ensureDir, getJournalUploadDir } = require('../app-data');

// Ensure upload directory exists
const uploadDir = ensureDir(getJournalUploadDir());

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    // Validate both MIME type and file extension
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (/^image\//.test(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件 (jpg/png/gif/webp)'));
    }
  },
});

// Helper: get or create entry for a date
function getOrCreateEntry(date) {
  let entry = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date);
  if (!entry) {
    const info = db.prepare('INSERT INTO journal_entries (date) VALUES (?)').run(date);
    entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(info.lastInsertRowid);
  }
  return entry;
}

// GET /api/journal?date=2026-03-14
router.get('/', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const entry = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date);
  if (!entry) {
    return res.json({ entry: null, elements: [] });
  }

  const elements = db.prepare(
    'SELECT * FROM journal_elements WHERE entry_id = ? ORDER BY z_index ASC, id ASC'
  ).all(entry.id);

  res.json({ entry, elements });
});

// GET /api/journal/recent?limit=30
router.get('/recent', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);

  const entries = db.prepare(`
    SELECT e.*, COUNT(el.id) as element_count
    FROM journal_entries e
    LEFT JOIN journal_elements el ON el.entry_id = e.id
    GROUP BY e.id
    HAVING element_count > 0
    ORDER BY e.date DESC
    LIMIT ?
  `).all(limit);

  res.json(entries);
});

// POST /api/journal/element  (multipart — optional photo)
router.post('/element', upload.single('photo'), (req, res) => {
  try {
    const { date, author, element_type, content, pos_x, pos_y, width, height, rotation, style_data } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    if (!author || !['潘潘', '蒲蒲'].includes(author)) {
      return res.status(400).json({ error: 'invalid author' });
    }

    const entry = getOrCreateEntry(date);
    const photoPath = req.file ? req.file.filename : null;
    const type = element_type || (photoPath ? 'photo' : 'text');

    // z_index = max + 1
    const maxZ = db.prepare(
      'SELECT MAX(z_index) as mz FROM journal_elements WHERE entry_id = ?'
    ).get(entry.id);
    const zIndex = (maxZ?.mz ?? -1) + 1;

    const info = db.prepare(`
      INSERT INTO journal_elements (entry_id, author, element_type, content, photo_path, pos_x, pos_y, width, height, rotation, z_index, style_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, author, type,
      content || '', photoPath,
      parseFloat(pos_x) || 50, parseFloat(pos_y) || 50,
      parseFloat(width) || (type === 'photo' ? 240 : 200),
      parseFloat(height) || (type === 'photo' ? 180 : 80),
      parseFloat(rotation) || 0,
      zIndex,
      style_data || null
    );

    db.prepare("UPDATE journal_entries SET updated_at = datetime('now','localtime') WHERE id = ?")
      .run(entry.id);

    const element = db.prepare('SELECT * FROM journal_elements WHERE id = ?').get(info.lastInsertRowid);
    res.json({ ok: true, element, entry });
  } catch (err) {
    console.error('Journal element create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/journal/element/:id  — update position, size, rotation, content, crop
router.put('/element/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM journal_elements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'element not found' });

  const { pos_x, pos_y, width, height, rotation, content, z_index, crop_data, style_data } = req.body;

  db.prepare(`
    UPDATE journal_elements SET
      pos_x = ?, pos_y = ?, width = ?, height = ?,
      rotation = ?, content = ?, z_index = ?, crop_data = ?, style_data = ?
    WHERE id = ?
  `).run(
    pos_x !== undefined ? parseFloat(pos_x) : existing.pos_x,
    pos_y !== undefined ? parseFloat(pos_y) : existing.pos_y,
    width !== undefined ? parseFloat(width) : existing.width,
    height !== undefined ? parseFloat(height) : existing.height,
    rotation !== undefined ? parseFloat(rotation) : existing.rotation,
    content !== undefined ? content : existing.content,
    z_index !== undefined ? parseInt(z_index) : existing.z_index,
    crop_data !== undefined ? crop_data : existing.crop_data,
    style_data !== undefined ? style_data : existing.style_data,
    id
  );

  db.prepare("UPDATE journal_entries SET updated_at = datetime('now','localtime') WHERE id = ?")
    .run(existing.entry_id);

  const updated = db.prepare('SELECT * FROM journal_elements WHERE id = ?').get(id);
  res.json({ ok: true, element: updated });
});

// DELETE /api/journal/element/:id
router.delete('/element/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM journal_elements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'element not found' });

  // Delete photo file if exists
  if (existing.photo_path) {
    const filePath = path.join(uploadDir, existing.photo_path);
    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
  }

  db.prepare('DELETE FROM journal_elements WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.uploadDir = uploadDir;

module.exports = router;

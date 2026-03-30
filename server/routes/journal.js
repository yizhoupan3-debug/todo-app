const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { ensureDir, getJournalUploadDir } = require('../app-data');
const {
  isValidAssignee,
  isValidDateString,
  isOneOf,
  parseInteger,
} = require('../validation');

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

function parseOptionalFiniteNumber(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return { value: defaultValue };
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { error: `${fieldName} must be a finite number` };
  }
  return { value: parsed };
}

function parseOptionalInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return { value: defaultValue };
  }
  const parsed = parseInteger(value);
  if (parsed === null) {
    return { error: `${fieldName} must be an integer` };
  }
  return { value: parsed };
}

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
  if (!isValidDateString(date)) return res.status(400).json({ error: 'date must use YYYY-MM-DD' });

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
  const requestedLimit = req.query.limit;
  if (requestedLimit !== undefined && requestedLimit !== null && requestedLimit !== '') {
    const parsedLimit = parseInteger(requestedLimit);
    if (parsedLimit === null || parsedLimit <= 0) {
      return res.status(400).json({ error: 'limit must be a positive integer' });
    }
  }
  const limit = Math.min(parseInteger(requestedLimit) || 30, 100);

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
    if (!isValidDateString(date)) return res.status(400).json({ error: 'date must use YYYY-MM-DD' });
    if (!author || !isValidAssignee(author)) {
      return res.status(400).json({ error: 'invalid author' });
    }

    const entry = getOrCreateEntry(date);
    const photoPath = req.file ? req.file.filename : null;
    const type = element_type || (photoPath ? 'photo' : 'text');
    if (!isOneOf(type, ['text', 'photo'])) {
      return res.status(400).json({ error: 'element_type must be one of: text, photo' });
    }
    if (content !== undefined && content !== null && typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    const parsedPosX = parseOptionalFiniteNumber(pos_x, 'pos_x', 50);
    const parsedPosY = parseOptionalFiniteNumber(pos_y, 'pos_y', 50);
    const parsedWidth = parseOptionalFiniteNumber(width, 'width', type === 'photo' ? 240 : 200);
    const parsedHeight = parseOptionalFiniteNumber(height, 'height', type === 'photo' ? 180 : 80);
    const parsedRotation = parseOptionalFiniteNumber(rotation, 'rotation', 0);

    for (const parsed of [parsedPosX, parsedPosY, parsedWidth, parsedHeight, parsedRotation]) {
      if (parsed.error) return res.status(400).json({ error: parsed.error });
    }

    const tx = db.transaction(() => {
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
        parsedPosX.value, parsedPosY.value,
        parsedWidth.value,
        parsedHeight.value,
        parsedRotation.value,
        zIndex,
        style_data || null
      );

      db.prepare("UPDATE journal_entries SET updated_at = datetime('now','localtime') WHERE id = ?")
        .run(entry.id);

      return db.prepare('SELECT * FROM journal_elements WHERE id = ?').get(info.lastInsertRowid);
    });

    const element = tx();
    res.json({ ok: true, element, entry });
  } catch (err) {
    console.error('Journal element create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/journal/element/:id  — update position, size, rotation, content, crop
router.put('/element/:id', (req, res) => {
  const id = parseInteger(req.params.id);
  if (id === null || id <= 0) return res.status(400).json({ error: 'id must be a positive integer' });
  const existing = db.prepare('SELECT * FROM journal_elements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'element not found' });

  const { pos_x, pos_y, width, height, rotation, content, z_index, crop_data, style_data } = req.body;

  if (content !== undefined && content !== null && typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' });
  }

  const parsedPosX = parseOptionalFiniteNumber(pos_x, 'pos_x', existing.pos_x);
  const parsedPosY = parseOptionalFiniteNumber(pos_y, 'pos_y', existing.pos_y);
  const parsedWidth = parseOptionalFiniteNumber(width, 'width', existing.width);
  const parsedHeight = parseOptionalFiniteNumber(height, 'height', existing.height);
  const parsedRotation = parseOptionalFiniteNumber(rotation, 'rotation', existing.rotation);
  const parsedZIndex = parseOptionalInteger(z_index, 'z_index', existing.z_index);
  for (const parsed of [parsedPosX, parsedPosY, parsedWidth, parsedHeight, parsedRotation, parsedZIndex]) {
    if (parsed.error) return res.status(400).json({ error: parsed.error });
  }

  db.prepare(`
    UPDATE journal_elements SET
      pos_x = ?, pos_y = ?, width = ?, height = ?,
      rotation = ?, content = ?, z_index = ?, crop_data = ?, style_data = ?
    WHERE id = ?
  `).run(
    parsedPosX.value,
    parsedPosY.value,
    parsedWidth.value,
    parsedHeight.value,
    parsedRotation.value,
    content !== undefined ? content : existing.content,
    parsedZIndex.value,
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
  const id = parseInteger(req.params.id);
  if (id === null || id <= 0) return res.status(400).json({ error: 'id must be a positive integer' });
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

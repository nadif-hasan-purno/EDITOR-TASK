import express from 'express';
import mongoose from 'mongoose';
import Editor, { DEFAULT_EDITORS } from '../models/Editor.js';

const router = express.Router();
const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

function normalizeEditor(body, { partial = false } = {}) {
  const payload = {};

  if (body.name !== undefined) payload.name = String(body.name).trim();
  if (body.color !== undefined) payload.color = String(body.color).trim();
  if (body.active !== undefined) payload.active = Boolean(body.active);
  if (body.sortOrder !== undefined) payload.sortOrder = Number(body.sortOrder);

  if (!partial) {
    if (!payload.name) {
      const error = new Error('Editor name is required.');
      error.status = 400;
      throw error;
    }
    if (!payload.color) payload.color = '#4f6fe8';
  }

  if (payload.name !== undefined && !payload.name) {
    const error = new Error('Editor name cannot be empty.');
    error.status = 400;
    throw error;
  }

  if (payload.color !== undefined && !HEX_COLOR.test(payload.color)) {
    const error = new Error('Color must be a hex value like #4f6fe8.');
    error.status = 400;
    throw error;
  }

  if (payload.sortOrder !== undefined && !Number.isFinite(payload.sortOrder)) {
    const error = new Error('sortOrder must be a number.');
    error.status = 400;
    throw error;
  }

  return payload;
}

async function ensureDefaultEditors() {
  const count = await Editor.countDocuments();
  if (count > 0) return;

  await Editor.insertMany(
    DEFAULT_EDITORS.map((editor, index) => ({
      ...editor,
      sortOrder: index,
      active: true,
    })),
  );
}

router.get('/', async (req, res) => {
  await ensureDefaultEditors();
  const includeInactive = req.query.all === 'true' || req.query.all === '1';
  const filter = includeInactive ? {} : { active: true };
  const editors = await Editor.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  res.json(editors);
});

router.post('/', async (req, res) => {
  const payload = normalizeEditor(req.body);
  const existing = await Editor.findOne({
    name: new RegExp(`^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).lean();

  if (existing) {
    return res.status(409).json({ message: `Editor “${payload.name}” already exists.` });
  }

  if (payload.sortOrder === undefined) {
    const last = await Editor.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    payload.sortOrder = (last?.sortOrder ?? -1) + 1;
  }

  const editor = await Editor.create(payload);
  res.status(201).json(editor);
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid editor id.' });
  }
  const editor = await Editor.findById(req.params.id).lean();
  if (!editor) return res.status(404).json({ message: 'Editor not found.' });
  res.json(editor);
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid editor id.' });
  }

  const editor = await Editor.findById(req.params.id);
  if (!editor) return res.status(404).json({ message: 'Editor not found.' });

  const payload = normalizeEditor(req.body, { partial: true });

  if (payload.name && payload.name.toLowerCase() !== editor.name.toLowerCase()) {
    const clash = await Editor.findOne({
      _id: { $ne: editor._id },
      name: new RegExp(`^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    }).lean();
    if (clash) {
      return res.status(409).json({ message: `Editor “${payload.name}” already exists.` });
    }
  }

  editor.set(payload);
  await editor.save();
  res.json(editor);
});

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid editor id.' });
  }

  const editor = await Editor.findById(req.params.id);
  if (!editor) return res.status(404).json({ message: 'Editor not found.' });

  const payload = normalizeEditor(req.body);
  const clash = await Editor.findOne({
    _id: { $ne: editor._id },
    name: new RegExp(`^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  }).lean();
  if (clash) {
    return res.status(409).json({ message: `Editor “${payload.name}” already exists.` });
  }

  editor.set({
    name: payload.name,
    color: payload.color,
    active: payload.active ?? true,
    sortOrder: payload.sortOrder ?? editor.sortOrder,
  });
  await editor.save();
  res.json(editor);
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid editor id.' });
  }

  // Soft-delete so historical task names stay meaningful; manager can re-activate later.
  const editor = await Editor.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true },
  );
  if (!editor) return res.status(404).json({ message: 'Editor not found.' });
  res.json(editor);
});

export default router;

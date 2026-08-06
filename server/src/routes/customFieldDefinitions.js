import express from 'express';
import mongoose from 'mongoose';
import CustomFieldDefinition from '../models/CustomFieldDefinition.js';
import { CUSTOM_FIELD_TYPES } from '../models/Task.js';

const router = express.Router();

function normalizeDefinition(body, { partial = false } = {}) {
  const payload = {};

  if (body.name !== undefined) payload.name = String(body.name).trim();
  if (body.type !== undefined) payload.type = String(body.type).trim();
  if (body.options !== undefined) {
    payload.options = [...new Set((Array.isArray(body.options) ? body.options : [])
      .map((option) => String(option).trim())
      .filter(Boolean))];
  }

  if (!partial && (!payload.name || !payload.type)) {
    const error = new Error('name and type are required.');
    error.status = 400;
    throw error;
  }
  if (payload.name !== undefined && !payload.name) {
    const error = new Error('name cannot be empty.');
    error.status = 400;
    throw error;
  }
  if (payload.type !== undefined && !CUSTOM_FIELD_TYPES.includes(payload.type)) {
    const error = new Error(`Invalid type. Use one of: ${CUSTOM_FIELD_TYPES.join(', ')}`);
    error.status = 400;
    throw error;
  }
  if (payload.type && payload.type !== 'dropdown') payload.options = [];

  return payload;
}

function validateDefinitionState(definition) {
  if (definition.type === 'dropdown' && (!definition.options || definition.options.length === 0)) {
    const error = new Error('Dropdown fields require at least one option.');
    error.status = 400;
    throw error;
  }
  if (definition.type !== 'dropdown') definition.options = [];
}

router.get('/', async (req, res) => {
  const definitions = await CustomFieldDefinition.find().sort({ name: 1 }).lean();
  res.json(definitions);
});

router.post('/', async (req, res) => {
  const payload = normalizeDefinition(req.body);
  validateDefinitionState(payload);
  const definition = await CustomFieldDefinition.create(payload);
  res.status(201).json(definition);
});

router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid custom field definition id.' });
  }
  const definition = await CustomFieldDefinition.findById(req.params.id).lean();
  if (!definition) return res.status(404).json({ message: 'Custom field definition not found.' });
  res.json(definition);
});

router.patch('/:id', async (req, res) => {
  const definition = await CustomFieldDefinition.findById(req.params.id);
  if (!definition) return res.status(404).json({ message: 'Custom field definition not found.' });

  definition.set(normalizeDefinition(req.body, { partial: true }));
  validateDefinitionState(definition);
  await definition.save();
  res.json(definition);
});

router.put('/:id', async (req, res) => {
  const definition = await CustomFieldDefinition.findById(req.params.id);
  if (!definition) return res.status(404).json({ message: 'Custom field definition not found.' });

  const payload = normalizeDefinition(req.body);
  definition.set({ ...payload, options: payload.options ?? [] });
  validateDefinitionState(definition);
  await definition.save();
  res.json(definition);
});

router.delete('/:id', async (req, res) => {
  const definition = await CustomFieldDefinition.findByIdAndDelete(req.params.id);
  if (!definition) return res.status(404).json({ message: 'Custom field definition not found.' });
  res.status(204).send();
});

export default router;

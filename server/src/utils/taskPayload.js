import mongoose from 'mongoose';
import { CUSTOM_FIELD_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';

const FIXED_FIELDS = [
  'clientName',
  'editorName',
  'editorNames',
  'projectName',
  'googleDocLink',
  'deadlineDays',
  'duration',
  'status',
  'priority',
  'pinned',
  'notes',
  'frameIoLink',
  'description',
];

function normalizeEditorNames(body) {
  let names = [];

  if (Array.isArray(body.editorNames)) {
    names = body.editorNames;
  } else if (typeof body.editorNames === 'string' && body.editorNames.trim()) {
    names = body.editorNames.split(/[,;|]/);
  } else if (body.editorName !== undefined) {
    names = [body.editorName];
  }

  return [...new Set(
    names
      .map((name) => String(name ?? '').trim())
      .filter(Boolean),
  )];
}

function cleanOptions(options) {
  if (!Array.isArray(options)) return [];
  return [...new Set(options.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeValue(type, value) {
  if (value === null || value === undefined) return '';
  if (type === 'number' && value !== '') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      const error = new Error('Custom number field values must be valid numbers.');
      error.status = 400;
      throw error;
    }
    return numberValue;
  }
  return String(value);
}

export function normalizeCustomFields(customFields) {
  if (customFields === undefined) return undefined;
  if (!Array.isArray(customFields)) {
    const error = new Error('customFields must be an array.');
    error.status = 400;
    throw error;
  }

  const names = new Set();

  return customFields.map((field) => {
    const name = String(field.name || '').trim();
    const type = String(field.type || '').trim();
    const normalizedName = name.toLowerCase();

    if (!name) {
      const error = new Error('Every custom field needs a name.');
      error.status = 400;
      throw error;
    }
    if (!CUSTOM_FIELD_TYPES.includes(type)) {
      const error = new Error(`Invalid custom field type for "${name}".`);
      error.status = 400;
      throw error;
    }
    if (names.has(normalizedName)) {
      const error = new Error(`Duplicate custom field name: ${name}`);
      error.status = 400;
      throw error;
    }
    names.add(normalizedName);

    const options = cleanOptions(field.options);
    if (type === 'dropdown' && options.length === 0) {
      const error = new Error(`Dropdown custom field "${name}" needs at least one option.`);
      error.status = 400;
      throw error;
    }

    const normalized = {
      name,
      type,
      value: normalizeValue(type, field.value),
      options: type === 'dropdown' ? options : [],
    };

    if (field.definitionId) {
      if (!mongoose.isValidObjectId(field.definitionId)) {
        const error = new Error(`Invalid definitionId for custom field "${name}".`);
        error.status = 400;
        throw error;
      }
      normalized.definitionId = field.definitionId;
    }

    return normalized;
  });
}

export function buildTaskPayload(body = {}, { partial = false } = {}) {
  const payload = {};

  for (const field of FIXED_FIELDS) {
    if (body[field] !== undefined && field !== 'editorNames' && field !== 'editorName') {
      payload[field] = body[field];
    }
  }

  if (body.customFields !== undefined) {
    payload.customFields = normalizeCustomFields(body.customFields);
  }

  const editorsProvided = body.editorNames !== undefined || body.editorName !== undefined;
  if (editorsProvided) {
    const editorNames = normalizeEditorNames(body);
    if (!partial && editorNames.length === 0) {
      const error = new Error('Select at least one editor.');
      error.status = 400;
      throw error;
    }
    if (editorNames.length > 0 || !partial) {
      payload.editorNames = editorNames;
      payload.editorName = editorNames[0] || '';
    }
  }

  for (const field of ['clientName', 'projectName']) {
    if (payload[field] !== undefined) payload[field] = String(payload[field]).trim();
  }
  for (const field of ['googleDocLink', 'frameIoLink', 'description']) {
    if (payload[field] !== undefined) payload[field] = String(payload[field] ?? '').trim();
  }
  for (const field of ['deadlineDays', 'duration']) {
    if (payload[field] !== undefined && payload[field] !== '') {
      payload[field] = Number(payload[field]);
    }
  }

  if (payload.status !== undefined && !TASK_STATUSES.includes(payload.status)) {
    const error = new Error(`Invalid status. Use one of: ${TASK_STATUSES.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (payload.priority !== undefined) {
    payload.priority = String(payload.priority).trim().toLowerCase();
    if (!TASK_PRIORITIES.includes(payload.priority)) {
      const error = new Error(`Invalid priority. Use one of: ${TASK_PRIORITIES.join(', ')}`);
      error.status = 400;
      throw error;
    }
  }

  if (payload.pinned !== undefined) {
    payload.pinned = Boolean(payload.pinned);
  }

  if (payload.notes !== undefined) {
    payload.notes = String(payload.notes ?? '').trim();
  }

  if (!partial) {
    const requiredFields = ['clientName', 'projectName', 'deadlineDays', 'duration'];
    const missing = requiredFields.filter(
      (field) => payload[field] === undefined || payload[field] === '' || Number.isNaN(payload[field]),
    );
    if (!payload.editorName || !payload.editorNames?.length) {
      missing.push('editorNames');
    }
    if (missing.length) {
      const error = new Error(`Missing required fields: ${missing.join(', ')}`);
      error.status = 400;
      throw error;
    }
  }

  return payload;
}

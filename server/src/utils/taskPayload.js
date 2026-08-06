import mongoose from 'mongoose';
import { CUSTOM_FIELD_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';

const FIXED_FIELDS = [
  'clientName',
  'editorName',
  'editorNames',
  'projectName',
  'googleDocLink',
  'dueDate',
  'deadlineDays',
  'duration',
  'status',
  'priority',
  'pinned',
  'notes',
  'frameIoLink',
  'description',
];

/** End of local calendar day for a given Date (server local TZ). */
function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Whole days remaining until due (ceil). Past due → 0.
 * Used for legacy filters / insights that still read deadlineDays.
 */
export function daysRemainingUntil(dueDate, from = new Date()) {
  if (!dueDate) return 0;
  const due = new Date(dueDate).getTime();
  const now = new Date(from).getTime();
  if (!Number.isFinite(due) || !Number.isFinite(now)) return 0;
  const ms = due - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function parseDueDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('dueDate must be a valid date/time.');
    error.status = 400;
    throw error;
  }
  return date;
}

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
    // dueDate / deadlineDays are normalized together below
    if (
      body[field] !== undefined
      && field !== 'editorNames'
      && field !== 'editorName'
      && field !== 'dueDate'
      && field !== 'deadlineDays'
    ) {
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
  if (payload.duration !== undefined && payload.duration !== '') {
    payload.duration = Number(payload.duration);
  }

  // dueDate is the absolute deadline (Notion-style). deadlineDays is derived / shortcut.
  const dueDateProvided = body.dueDate !== undefined;
  const deadlineDaysProvided = body.deadlineDays !== undefined && body.deadlineDays !== '';

  if (dueDateProvided) {
    const due = parseDueDate(body.dueDate);
    payload.dueDate = due;
    if (due) {
      payload.deadlineDays = daysRemainingUntil(due);
    } else if (deadlineDaysProvided) {
      const days = Number(body.deadlineDays);
      if (!Number.isFinite(days) || days < 0) {
        const error = new Error('deadlineDays must be a non-negative number.');
        error.status = 400;
        throw error;
      }
      payload.deadlineDays = days;
    } else if (!partial) {
      payload.deadlineDays = 0;
    }
  } else if (deadlineDaysProvided) {
    const days = Number(body.deadlineDays);
    if (!Number.isFinite(days) || days < 0) {
      const error = new Error('deadlineDays must be a non-negative number.');
      error.status = 400;
      throw error;
    }
    payload.deadlineDays = days;
    const base = endOfDay(new Date());
    base.setDate(base.getDate() + days);
    payload.dueDate = base;
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
    const requiredFields = ['clientName', 'projectName', 'duration'];
    const missing = requiredFields.filter(
      (field) => payload[field] === undefined || payload[field] === '' || Number.isNaN(payload[field]),
    );
    if (!payload.editorName || !payload.editorNames?.length) {
      missing.push('editorNames');
    }
    // Need an absolute due date or a days shortcut to materialize one
    if (payload.dueDate === undefined && payload.deadlineDays === undefined) {
      missing.push('dueDate');
    }
    if (payload.deadlineDays === undefined && payload.dueDate) {
      payload.deadlineDays = daysRemainingUntil(payload.dueDate);
    }
    if (payload.dueDate === undefined && Number.isFinite(payload.deadlineDays)) {
      const base = endOfDay(new Date());
      base.setDate(base.getDate() + payload.deadlineDays);
      payload.dueDate = base;
    }
    if (missing.length) {
      const error = new Error(`Missing required fields: ${missing.join(', ')}`);
      error.status = 400;
      throw error;
    }
  }

  return payload;
}

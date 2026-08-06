import { TASK_PRIORITIES, TASK_STATUSES } from '../models/Task.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTaskFilter(query = {}) {
  const filter = {};

  if (query.status) {
    if (!TASK_STATUSES.includes(query.status)) {
      const error = new Error(`Invalid status. Use one of: ${TASK_STATUSES.join(', ')}`);
      error.status = 400;
      throw error;
    }
    filter.status = query.status;
  }

  if (query.client) {
    filter.clientName = new RegExp(`^${escapeRegex(String(query.client).trim())}$`, 'i');
  }

  if (query.editor) {
    const editor = String(query.editor).trim();
    const exact = new RegExp(`^${escapeRegex(editor)}$`, 'i');
    // Match primary name or any collaborator on multi-editor tasks
    filter.$or = [{ editorName: exact }, { editorNames: exact }];
  }

  if (query.multiEditors === 'true' || query.multiEditors === true || query.multiEditors === '1') {
    filter['editorNames.1'] = { $exists: true };
  }

  if (query.priority) {
    const priority = String(query.priority).trim().toLowerCase();
    if (!TASK_PRIORITIES.includes(priority)) {
      const error = new Error(`Invalid priority. Use one of: ${TASK_PRIORITIES.join(', ')}`);
      error.status = 400;
      throw error;
    }
    filter.priority = priority;
  }

  if (query.pinned === 'true' || query.pinned === true) {
    filter.pinned = true;
  }

  return filter;
}

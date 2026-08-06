/** Normalize task editor fields for single + multi-editor support. */

export function getTaskEditors(task) {
  if (!task) return [];
  if (Array.isArray(task.editorNames) && task.editorNames.length > 0) {
    return [...new Set(task.editorNames.map((name) => String(name).trim()).filter(Boolean))];
  }
  if (task.editorName) return [String(task.editorName).trim()].filter(Boolean);
  return [];
}

export function isMultiEditorTask(task) {
  return getTaskEditors(task).length > 1;
}

export function formatEditorsLabel(task, separator = ' · ') {
  return getTaskEditors(task).join(separator) || '—';
}

export function taskHasEditor(task, editorName) {
  if (!editorName) return true;
  const needle = String(editorName).trim().toLowerCase();
  return getTaskEditors(task).some((name) => name.toLowerCase() === needle);
}

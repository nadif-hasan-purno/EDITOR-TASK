import { isDoneStatus, priorityRank } from './taskMeta.js';
import { formatEditorsLabel, getTaskEditors, isMultiEditorTask } from './editors.js';
import { getDueDate, getRemainingDays, dueSortKey, dayjs } from './dates.js';

export function matchesSearch(task, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    task.projectName,
    task.clientName,
    task.editorName,
    formatEditorsLabel(task, ' '),
    task.description,
    task.notes,
    task.status,
    task.priority,
    ...(task.customFields || []).flatMap((field) => [field.name, field.value]),
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

export function matchesSmartFilter(task, smart) {
  if (!smart) return true;

  const remaining = getRemainingDays(task);
  const due = getDueDate(task);
  const open = !isDoneStatus(task.status);
  const overdue = open && due && dayjs(due).isBefore(dayjs());

  switch (smart) {
    case 'overdue':
      return Boolean(overdue) || (open && remaining <= 0 && due);
    case 'due-week':
      return open && !overdue && remaining > 0 && remaining <= 7;
    case 'high':
      return open && (task.priority || 'medium') === 'high';
    case 'revision':
      return task.status === 'In Revision';
    case 'pinned':
      return Boolean(task.pinned);
    case 'missing-links':
      return open && !task.googleDocLink && !task.frameIoLink;
    case 'multi-editors':
      return isMultiEditorTask(task);
    case 'open':
      return open;
    default:
      return true;
  }
}

export function applyLocalFilters(tasks, { search = '', smart = '', hideDone = false } = {}) {
  return tasks.filter((task) => {
    if (hideDone && isDoneStatus(task.status)) return false;
    if (!matchesSearch(task, search)) return false;
    if (!matchesSmartFilter(task, smart)) return false;
    return true;
  });
}

function isTaskOverdue(task) {
  if (isDoneStatus(task.status)) return false;
  const due = getDueDate(task);
  if (!due) return false;
  return dayjs(due).isBefore(dayjs());
}

export function buildInsights(tasks) {
  const open = tasks.filter((task) => !isDoneStatus(task.status));
  const approved = tasks.filter((task) => task.status === 'Approved');
  const revision = tasks.filter((task) => task.status === 'In Revision');
  const overdue = open.filter((task) => isTaskOverdue(task));
  const dueWeek = open.filter((task) => {
    if (isTaskOverdue(task)) return false;
    const days = getRemainingDays(task);
    return days > 0 && days <= 7;
  });
  const high = open.filter((task) => (task.priority || 'medium') === 'high');
  const pinned = tasks.filter((task) => task.pinned);
  const missingLinks = open.filter((task) => !task.googleDocLink && !task.frameIoLink);
  const multiEditors = tasks.filter((task) => isMultiEditorTask(task));
  const totalDuration = open.reduce((sum, task) => sum + (Number(task.duration) || 0), 0);
  const completionRate = tasks.length
    ? Math.round((approved.length / tasks.length) * 100)
    : 0;

  return {
    total: tasks.length,
    open: open.length,
    overdue: overdue.length,
    dueWeek: dueWeek.length,
    high: high.length,
    revision: revision.length,
    pinned: pinned.length,
    missingLinks: missingLinks.length,
    multiEditors: multiEditors.length,
    approved: approved.length,
    completionRate,
    totalDuration,
  };
}

export function buildEditorWorkload(tasks) {
  const map = new Map();

  for (const task of tasks) {
    if (isDoneStatus(task.status)) continue;
    const names = getTaskEditors(task);
    const assigned = names.length ? names : ['Unassigned'];
    for (const name of assigned) {
      if (!map.has(name)) {
        map.set(name, { editor: name, open: 0, high: 0, overdue: 0, duration: 0, collab: 0 });
      }
      const row = map.get(name);
      row.open += 1;
      row.duration += Number(task.duration) || 0;
      if ((task.priority || 'medium') === 'high') row.high += 1;
      if (isTaskOverdue(task)) row.overdue += 1;
      if (assigned.length > 1) row.collab += 1;
    }
  }

  return [...map.values()].sort((a, b) => b.open - a.open || a.editor.localeCompare(b.editor));
}

export function buildClientWorkload(tasks) {
  const map = new Map();

  for (const task of tasks) {
    if (isDoneStatus(task.status)) continue;
    const name = task.clientName || 'Unknown client';
    if (!map.has(name)) {
      map.set(name, { client: name, open: 0, high: 0, overdue: 0 });
    }
    const row = map.get(name);
    row.open += 1;
    if ((task.priority || 'medium') === 'high') row.high += 1;
    if (isTaskOverdue(task)) row.overdue += 1;
  }

  return [...map.values()].sort((a, b) => b.open - a.open || a.client.localeCompare(b.client));
}

export function recentActivity(tasks, limit = 6) {
  return [...tasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, limit);
}

export function sortForManagement(tasks) {
  return [...tasks].sort((a, b) => {
    if (Boolean(b.pinned) - Boolean(a.pinned)) return Boolean(b.pinned) - Boolean(a.pinned);
    const openA = isDoneStatus(a.status) ? 1 : 0;
    const openB = isDoneStatus(b.status) ? 1 : 0;
    if (openA !== openB) return openA - openB;
    if (priorityRank(a.priority) !== priorityRank(b.priority)) {
      return priorityRank(a.priority) - priorityRank(b.priority);
    }
    return dueSortKey(a) - dueSortKey(b);
  });
}

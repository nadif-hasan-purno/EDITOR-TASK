/** Shared helpers for deadline grouping and display — no API changes required. */

const DONE_STATUSES = new Set(['Approved', 'Cancelled']);

export function isDoneStatus(status) {
  return DONE_STATUSES.has(status);
}

/** Treat deadlineDays as remaining days from today (matches “days left” UX). */
export function getDueDate(task) {
  const days = Number(task.deadlineDays);
  const safeDays = Number.isFinite(days) ? Math.max(0, days) : 0;
  const due = new Date();
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() + safeDays);
  return due;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatAgendaDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Build TickTick-style sections:
 * Overdue (0 days, still active) → Today → Tomorrow → dated buckets → Later → Done.
 */
export function groupTasksForAgenda(tasks) {
  const sections = {
    overdue: [],
    tomorrow: [],
    later: [],
    done: [],
  };

  const dated = new Map();

  for (const task of tasks) {
    if (isDoneStatus(task.status)) {
      sections.done.push(task);
      continue;
    }

    const days = Number(task.deadlineDays);
    const remaining = Number.isFinite(days) ? days : 0;

    if (remaining <= 0) {
      // 0 days left — still open work is due-now / overdue pressure
      sections.overdue.push(task);
    } else if (remaining === 1) {
      sections.tomorrow.push(task);
    } else if (remaining <= 7) {
      const due = getDueDate(task);
      const key = due.toISOString().slice(0, 10);
      if (!dated.has(key)) dated.set(key, { date: due, tasks: [] });
      dated.get(key).tasks.push(task);
    } else {
      sections.later.push(task);
    }
  }

  const sortByDays = (a, b) => Number(a.deadlineDays) - Number(b.deadlineDays)
    || a.projectName.localeCompare(b.projectName);

  for (const key of Object.keys(sections)) {
    sections[key].sort(sortByDays);
  }

  const thisWeekGroups = [...dated.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => ({
      id: `day-${group.date.toISOString().slice(0, 10)}`,
      title: formatAgendaDate(group.date),
      count: group.tasks.length,
      tasks: group.tasks.sort(sortByDays),
      tone: 'default',
    }));

  const result = [];

  if (sections.overdue.length) {
    result.push({
      id: 'overdue',
      title: 'Overdue / Due today',
      count: sections.overdue.length,
      tasks: sections.overdue,
      tone: 'danger',
    });
  }
  if (sections.tomorrow.length) {
    result.push({
      id: 'tomorrow',
      title: 'Tomorrow',
      count: sections.tomorrow.length,
      tasks: sections.tomorrow,
      tone: 'warn',
    });
  }
  result.push(...thisWeekGroups);
  if (sections.later.length) {
    result.push({
      id: 'later',
      title: 'Later',
      count: sections.later.length,
      tasks: sections.later,
      tone: 'muted',
    });
  }
  if (sections.done.length) {
    result.push({
      id: 'done',
      title: 'Done',
      count: sections.done.length,
      tasks: sections.done,
      tone: 'success',
    });
  }

  return result;
}

export function priorityRank(priority) {
  if (priority === 'high') return 0;
  if (priority === 'low') return 2;
  return 1;
}

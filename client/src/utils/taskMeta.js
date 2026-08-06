/** Shared helpers for deadline grouping and display. */
import {
  formatAgendaDate,
  formatShortDate,
  getDueDate,
  getRemainingDays,
  isDoneStatus,
  startOfDay,
  dueSortKey,
  dayjs,
} from './dates.js';

export {
  formatAgendaDate,
  formatShortDate,
  getDueDate,
  getRemainingDays,
  isDoneStatus,
  startOfDay,
};

/**
 * Build sections from absolute due dates:
 * Overdue → Today → Tomorrow → this week days → Later → Done.
 */
export function groupTasksForAgenda(tasks) {
  const sections = {
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
    done: [],
  };

  const dated = new Map();
  const now = dayjs();
  const todayStart = now.startOf('day');
  const tomorrowStart = todayStart.add(1, 'day');
  const weekEnd = todayStart.add(8, 'day');

  for (const task of tasks) {
    if (isDoneStatus(task.status)) {
      sections.done.push(task);
      continue;
    }

    const due = getDueDate(task);
    if (!due) {
      sections.later.push(task);
      continue;
    }

    const dueMoment = dayjs(due);
    const dueDay = dueMoment.startOf('day');

    if (dueMoment.isBefore(now)) {
      sections.overdue.push(task);
    } else if (dueDay.isSame(todayStart, 'day')) {
      sections.today.push(task);
    } else if (dueDay.isSame(tomorrowStart, 'day')) {
      sections.tomorrow.push(task);
    } else if (dueDay.isAfter(tomorrowStart) && dueDay.isBefore(weekEnd)) {
      const key = dueDay.format('YYYY-MM-DD');
      if (!dated.has(key)) dated.set(key, { date: dueDay.toDate(), tasks: [] });
      dated.get(key).tasks.push(task);
    } else {
      sections.later.push(task);
    }
  }

  const sortByDue = (a, b) => dueSortKey(a) - dueSortKey(b)
    || a.projectName.localeCompare(b.projectName);

  for (const key of Object.keys(sections)) {
    sections[key].sort(sortByDue);
  }

  const thisWeekGroups = [...dated.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, group]) => ({
      id: `day-${dayjs(group.date).format('YYYY-MM-DD')}`,
      title: formatAgendaDate(group.date),
      count: group.tasks.length,
      tasks: group.tasks.sort(sortByDue),
      tone: 'default',
    }));

  const result = [];

  if (sections.overdue.length) {
    result.push({
      id: 'overdue',
      title: 'Overdue',
      count: sections.overdue.length,
      tasks: sections.overdue,
      tone: 'danger',
    });
  }
  if (sections.today.length) {
    result.push({
      id: 'today',
      title: 'Today',
      count: sections.today.length,
      tasks: sections.today,
      tone: 'warn',
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

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(advancedFormat);

export { dayjs };

/** Done / closed statuses — countdown is less urgent. */
const DONE_STATUSES = new Set(['Approved', 'Cancelled']);

export function isDoneStatus(status) {
  return DONE_STATUSES.has(status);
}

/**
 * Resolve absolute due moment for a task.
 * Prefer stored dueDate; fall back to createdAt + deadlineDays (legacy rows).
 */
export function getDueDate(task) {
  if (!task) return null;

  if (task.dueDate) {
    const due = dayjs(task.dueDate);
    return due.isValid() ? due.toDate() : null;
  }

  const days = Number(task.deadlineDays);
  if (!Number.isFinite(days)) return null;

  const base = task.createdAt ? dayjs(task.createdAt) : dayjs();
  if (!base.isValid()) return null;

  // Legacy: treat deadlineDays as calendar days after creation, end of day.
  return base.add(Math.max(0, days), 'day').endOf('day').toDate();
}

export function getCreatedAt(task) {
  if (!task?.createdAt) return null;
  const d = dayjs(task.createdAt);
  return d.isValid() ? d.toDate() : null;
}

export function startOfDay(date = new Date()) {
  return dayjs(date).startOf('day').toDate();
}

export function endOfDay(date = new Date()) {
  return dayjs(date).endOf('day').toDate();
}

/** Human short date: Mar 12 */
export function formatShortDate(date) {
  if (!date) return '—';
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  return d.format('MMM D');
}

/** Agenda header: Wed, Mar 12 */
export function formatAgendaDate(date) {
  if (!date) return '—';
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  return d.format('ddd, MMM D');
}

/** Full datetime: Mar 12, 2026 · 5:30 PM */
export function formatDateTime(date) {
  if (!date) return '—';
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  return d.format('MMM D, YYYY · h:mm A');
}

/** Created system field: Mar 12, 2026 */
export function formatCreatedDate(date) {
  if (!date) return '—';
  const d = dayjs(date);
  if (!d.isValid()) return '—';
  if (d.isToday()) return `Today · ${d.format('h:mm A')}`;
  if (d.isYesterday()) return `Yesterday · ${d.format('h:mm A')}`;
  return d.format('MMM D, YYYY · h:mm A');
}

/** Due label with smart relative prefix when close */
export function formatDueLabel(date) {
  if (!date) return 'No due date';
  const d = dayjs(date);
  if (!d.isValid()) return 'No due date';
  if (d.isToday()) return `Today · ${d.format('h:mm A')}`;
  if (d.isTomorrow()) return `Tomorrow · ${d.format('h:mm A')}`;
  if (d.isYesterday()) return `Yesterday · ${d.format('h:mm A')}`;
  if (d.year() === dayjs().year()) return d.format('MMM D · h:mm A');
  return d.format('MMM D, YYYY · h:mm A');
}

/**
 * Live remaining breakdown from now → dueDate.
 * Returns structured parts for UI + compact string.
 */
export function getCountdown(dueDate, now = new Date()) {
  if (!dueDate) {
    return {
      overdue: false,
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: 'No deadline',
      compact: '—',
      urgency: 'none',
    };
  }

  const due = dayjs(dueDate);
  const current = dayjs(now);
  if (!due.isValid()) {
    return {
      overdue: false,
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      label: 'Invalid date',
      compact: '—',
      urgency: 'none',
    };
  }

  const diffMs = due.diff(current);
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const dur = dayjs.duration(abs);

  const days = Math.floor(dur.asDays());
  const hours = dur.hours();
  const minutes = dur.minutes();
  const seconds = dur.seconds();

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (days === 0) parts.push(`${minutes}m`);
  if (days === 0 && hours === 0) parts.push(`${seconds}s`);

  const compact = parts.join(' ') || '0s';
  const label = overdue ? `Overdue by ${compact}` : `${compact} left`;

  let urgency = 'ok';
  if (overdue) urgency = 'overdue';
  else if (diffMs <= 2 * 60 * 60 * 1000) urgency = 'critical'; // ≤ 2h
  else if (diffMs <= 24 * 60 * 60 * 1000) urgency = 'soon'; // ≤ 24h
  else if (diffMs <= 3 * 24 * 60 * 60 * 1000) urgency = 'near'; // ≤ 3d
  else urgency = 'ok';

  return {
    overdue,
    totalMs: diffMs,
    days,
    hours,
    minutes,
    seconds,
    label,
    compact,
    urgency,
  };
}

/** Whole calendar days remaining (for smart filters / sorting). Past → 0 or negative. */
export function getRemainingDays(task, now = new Date()) {
  const due = getDueDate(task);
  if (!due) {
    const days = Number(task?.deadlineDays);
    return Number.isFinite(days) ? days : 0;
  }
  const ms = dayjs(due).diff(dayjs(now));
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** For sorting: earlier due first; missing due last. */
export function dueSortKey(task) {
  const due = getDueDate(task);
  return due ? due.getTime() : Number.POSITIVE_INFINITY;
}

/** Value for <input type="datetime-local" /> */
export function toDatetimeLocalValue(date) {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return d.format('YYYY-MM-DDTHH:mm');
}

/** Parse datetime-local string → ISO for API */
export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.toISOString() : null;
}

/** Notion-style quick due presets */
export function duePresets(from = new Date()) {
  const base = dayjs(from);
  return [
    { id: 'today-eod', label: 'Today', date: base.endOf('day').toDate() },
    { id: 'tomorrow', label: 'Tomorrow', date: base.add(1, 'day').hour(18).minute(0).second(0).millisecond(0).toDate() },
    { id: 'in-3d', label: 'In 3 days', date: base.add(3, 'day').hour(18).minute(0).second(0).millisecond(0).toDate() },
    { id: 'in-1w', label: 'In 1 week', date: base.add(7, 'day').hour(18).minute(0).second(0).millisecond(0).toDate() },
    { id: 'in-2w', label: 'In 2 weeks', date: base.add(14, 'day').hour(18).minute(0).second(0).millisecond(0).toDate() },
  ];
}

/**
 * Tick interval for live countdown:
 * under 1h → 1s, under 1d → 15s, else 60s (keeps UI smooth without thrashing).
 */
export function countdownTickMs(dueDate, now = new Date()) {
  if (!dueDate) return 60_000;
  const ms = Math.abs(dayjs(dueDate).diff(dayjs(now)));
  if (ms <= 60 * 60 * 1000) return 1000;
  if (ms <= 24 * 60 * 60 * 1000) return 15_000;
  return 60_000;
}

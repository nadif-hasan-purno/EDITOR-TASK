import React, { useMemo } from 'react';
import {
  countdownTickMs,
  formatDueLabel,
  getCountdown,
  getDueDate,
  isDoneStatus,
} from '../utils/dates.js';
import { useNow } from '../hooks/useNow.js';

/**
 * Live remaining-time chip for a task deadline.
 * size: 'sm' | 'md' | 'lg'
 * showDue: also show absolute due date under/next to countdown
 */
export default function DeadlineCountdown({
  task,
  size = 'sm',
  showDue = false,
  className = '',
  paused = false,
}) {
  const due = useMemo(() => getDueDate(task), [task]);
  const done = isDoneStatus(task?.status);
  const tickMs = due && !done && !paused ? countdownTickMs(due) : 60_000;
  const now = useNow(tickMs, Boolean(due) && !done && !paused);
  const cd = useMemo(() => getCountdown(due, now), [due, now]);

  if (!due) {
    return (
      <span className={`countdown-chip urgency-none size-${size} ${className}`.trim()} title="No due date set">
        <span className="countdown-icon" aria-hidden="true">○</span>
        <span className="countdown-label">No deadline</span>
      </span>
    );
  }

  if (done) {
    return (
      <span
        className={`countdown-chip urgency-done size-${size} ${className}`.trim()}
        title={formatDueLabel(due)}
      >
        <span className="countdown-icon" aria-hidden="true">✓</span>
        <span className="countdown-main">
          <span className="countdown-label">Closed</span>
          {showDue && <span className="countdown-due">{formatDueLabel(due)}</span>}
        </span>
      </span>
    );
  }

  const title = `${cd.label} · due ${formatDueLabel(due)}`;

  return (
    <span
      className={`countdown-chip urgency-${cd.urgency} size-${size} ${className}`.trim()}
      title={title}
      aria-live="polite"
      aria-label={title}
    >
      <span className="countdown-icon" aria-hidden="true">
        {cd.overdue ? '!' : '⏱'}
      </span>
      <span className="countdown-main">
        <span className="countdown-label">
          {cd.overdue ? (
            <>
              <em>Overdue</em> {cd.compact}
            </>
          ) : (
            <>
              <strong>{cd.compact}</strong>
              <span className="countdown-suffix"> left</span>
            </>
          )}
        </span>
        {showDue && <span className="countdown-due">{formatDueLabel(due)}</span>}
      </span>
    </span>
  );
}

/** Compact system property row: Created + Due + live remaining */
export function TaskDateSystem({ task, className = '' }) {
  if (!task) return null;

  const created = task.createdAt;
  const due = getDueDate(task);

  return (
    <div className={`task-date-system ${className}`.trim()}>
      <div className="date-system-row">
        <span className="date-system-key">Created</span>
        <span className="date-system-val">
          {created
            ? new Date(created).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : '—'}
        </span>
      </div>
      <div className="date-system-row">
        <span className="date-system-key">Due</span>
        <span className="date-system-val">{due ? formatDueLabel(due) : 'Not set'}</span>
      </div>
      <div className="date-system-row date-system-countdown">
        <span className="date-system-key">Remaining</span>
        <DeadlineCountdown task={task} size="md" showDue={false} />
      </div>
    </div>
  );
}

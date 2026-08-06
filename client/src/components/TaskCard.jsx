import React from 'react';
import { formatShortDate, getDueDate } from '../utils/taskMeta.js';
import { EditorBadges } from './EditorBadge.jsx';
import { getTaskEditors } from '../utils/editors.js';

function CustomFieldValue({ field }) {
  if (field.type === 'url' && field.value) {
    return <a href={field.value} target="_blank" rel="noreferrer">Open link</a>;
  }
  return <span>{field.value === '' || field.value === null || field.value === undefined ? '—' : String(field.value)}</span>;
}

function statusSlug(status) {
  return status.toLowerCase().replaceAll(' ', '-');
}

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onTogglePin,
  editors = [],
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  compact = true,
  expanded = false,
  onToggleExpand,
}) {
  const slug = statusSlug(task.status);
  const priority = task.priority || 'medium';
  const dueLabel = formatShortDate(getDueDate(task));
  const isCompact = compact && !expanded;
  const taskEditors = getTaskEditors(task);

  function handleDragStart(event) {
    if (event.target.closest('button, a, .card-actions, .card-expand-btn')) {
      event.preventDefault();
      return;
    }
    onDragStart?.(event, task);
  }

  return (
    <article
      className={[
        'task-card',
        `card-accent-${slug}`,
        `priority-${priority}`,
        task.pinned ? 'is-pinned' : '',
        isDragging ? 'is-dragging' : '',
        draggable ? 'is-draggable' : '',
        isCompact ? 'is-compact' : '',
        expanded ? 'is-expanded' : '',
      ].filter(Boolean).join(' ')}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
    >
      <div className="task-card-topline">
        <div className="card-topline-left">
          {compact && onToggleExpand && (
            <button
              type="button"
              className="card-expand-btn"
              aria-expanded={!isCompact}
              aria-label={isCompact ? 'Expand card' : 'Collapse card'}
              onClick={() => onToggleExpand(task._id)}
            >
              {isCompact ? '▸' : '▾'}
            </button>
          )}
          <span className={`status-badge status-${slug}`}>{task.status}</span>
          {priority !== 'medium' && (
            <span className={`priority-chip priority-chip-${priority}`}>{priority}</span>
          )}
        </div>
        <div className="card-topline-right">
          {onTogglePin && (
            <button
              type="button"
              className={`pin-btn${task.pinned ? ' is-on' : ''}`}
              aria-label={task.pinned ? 'Unpin task' : 'Pin task'}
              title={task.pinned ? 'Unpin' : 'Pin'}
              onClick={() => onTogglePin(task)}
            >
              {task.pinned ? '★' : '☆'}
            </button>
          )}
          <span className="task-id">#{task._id.slice(-6)}</span>
        </div>
      </div>

      <h3>{task.projectName}</h3>
      <p className="muted card-meta-line">
        <span>{task.clientName}</span>
        <EditorBadges names={taskEditors} editors={editors} size="sm" />
        <span className="due-chip">{task.deadlineDays}d · {dueLabel}</span>
      </p>

      {!isCompact && (
        <>
          <div className="task-metrics">
            <span><strong>{task.deadlineDays}</strong> days left</span>
            <span><strong>{task.duration}</strong> duration</span>
          </div>
          {task.description && <p className="description-preview">{task.description}</p>}
          {task.notes && <p className="notes-preview"><span>Note</span>{task.notes}</p>}
          {(task.googleDocLink || task.frameIoLink) && (
            <div className="link-row">
              {task.googleDocLink && <a href={task.googleDocLink} target="_blank" rel="noreferrer">Google Doc</a>}
              {task.frameIoLink && <a href={task.frameIoLink} target="_blank" rel="noreferrer">Frame.io</a>}
            </div>
          )}
          {task.customFields?.length > 0 && (
            <dl className="custom-summary">
              {task.customFields.slice(0, 3).map((field) => (
                <div key={field._id || field.name}>
                  <dt>{field.name}</dt>
                  <dd><CustomFieldValue field={field} /></dd>
                </div>
              ))}
              {task.customFields.length > 3 && <p className="muted tiny">+{task.customFields.length - 3} more fields</p>}
            </dl>
          )}
          <div className="card-actions">
            <button className="button ghost compact" type="button" onClick={() => onEdit(task)}>Edit</button>
            <button className="button danger compact" type="button" onClick={() => onDelete(task)}>Delete</button>
          </div>
        </>
      )}

      {isCompact && (
        <div className="card-actions card-actions-compact">
          <button className="button ghost compact" type="button" onClick={() => onEdit(task)}>Edit</button>
          <button className="button danger compact" type="button" onClick={() => onDelete(task)}>Del</button>
        </div>
      )}
    </article>
  );
}

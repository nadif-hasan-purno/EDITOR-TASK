import React from 'react';
import { EditorBadges } from './EditorBadge.jsx';
import { getTaskEditors } from '../utils/editors.js';
import DeadlineCountdown from './DeadlineCountdown.jsx';
import { formatCreatedDate } from '../utils/dates.js';

export default function ListView({
  tasks,
  onOpen,
  onEdit,
  onDelete,
  onTogglePin,
  editors = [],
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) {
  const allSelected = tasks.length > 0 && tasks.every((task) => selectedIds.has(task._id));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                aria-label="Select all tasks"
              />
            </th>
            <th>Project</th>
            <th>Client</th>
            <th>Editor</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Created</th>
            <th>Deadline</th>
            <th>Duration</th>
            <th>Links</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task._id} className={selectedIds.has(task._id) ? 'is-selected' : ''}>
              <td className="col-check">
                <input
                  type="checkbox"
                  checked={selectedIds.has(task._id)}
                  onChange={() => onToggleSelect(task._id)}
                  aria-label={`Select ${task.projectName}`}
                />
              </td>
              <td>
                <div className="table-project">
                  {task.pinned && <span className="pin-mark" title="Pinned">★</span>}
                  {onOpen ? (
                    <button type="button" className="table-project-open" onClick={() => onOpen(task)}>
                      <strong>{task.projectName}</strong>
                    </button>
                  ) : (
                    <strong>{task.projectName}</strong>
                  )}
                </div>
                {task.description && <span className="table-description">{task.description}</span>}
                {task.notes && <span className="table-notes">Note: {task.notes}</span>}
              </td>
              <td>{task.clientName}</td>
              <td>
                <EditorBadges names={getTaskEditors(task)} editors={editors} size="sm" />
              </td>
              <td><span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span></td>
              <td>
                <span className={`priority-chip priority-chip-${task.priority || 'medium'}`}>
                  {task.priority || 'medium'}
                </span>
              </td>
              <td className="col-created">
                <span className="table-created" title={task.createdAt || ''}>
                  {formatCreatedDate(task.createdAt)}
                </span>
              </td>
              <td className="col-deadline">
                <DeadlineCountdown task={task} size="sm" showDue />
              </td>
              <td>{task.duration}</td>
              <td>
                <div className="link-row">
                  {task.googleDocLink && <a href={task.googleDocLink} target="_blank" rel="noreferrer">Doc</a>}
                  {task.frameIoLink && <a href={task.frameIoLink} target="_blank" rel="noreferrer">Frame.io</a>}
                  {!task.googleDocLink && !task.frameIoLink && '—'}
                </div>
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className={`pin-btn${task.pinned ? ' is-on' : ''}`}
                    type="button"
                    onClick={() => onTogglePin(task)}
                    aria-label={task.pinned ? 'Unpin' : 'Pin'}
                  >
                    {task.pinned ? '★' : '☆'}
                  </button>
                  <button className="button ghost compact" type="button" onClick={() => onEdit(task)}>Edit</button>
                  <button className="button danger compact" type="button" onClick={() => onDelete(task)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

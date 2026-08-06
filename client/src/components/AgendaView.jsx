import React, { useMemo, useState } from 'react';
import { STATUSES } from '../constants.js';
import { formatShortDate, getDueDate, groupTasksForAgenda } from '../utils/taskMeta.js';
import { EditorBadges } from './EditorBadge.jsx';
import { getTaskEditors } from '../utils/editors.js';

function statusSlug(status) {
  return status.toLowerCase().replaceAll(' ', '-');
}

export default function AgendaView({ tasks, onEdit, onDelete, onStatusChange, editors = [] }) {
  const sections = useMemo(() => groupTasksForAgenda(tasks), [tasks]);
  const [collapsed, setCollapsed] = useState(() => new Set());

  function toggleSection(id) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <section className="agenda" aria-label="Agenda by deadline">
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.id);
        return (
          <div className={`agenda-section tone-${section.tone || 'default'}`} key={section.id}>
            <button
              type="button"
              className="agenda-section-header"
              onClick={() => toggleSection(section.id)}
              aria-expanded={!isCollapsed}
            >
              <span className="agenda-chevron">{isCollapsed ? '▸' : '▾'}</span>
              <h3>{section.title}</h3>
              <span className="agenda-count">{section.count}</span>
            </button>

            {!isCollapsed && (
              <ul className="agenda-list">
                {section.tasks.map((task) => {
                  const priority = task.priority || 'medium';
                  const slug = statusSlug(task.status);
                  return (
                    <li className={`agenda-row priority-${priority}`} key={task._id}>
                      <div className="agenda-main">
                        <span className={`priority-dot priority-dot-${priority}`} title={priority} aria-hidden="true" />
                        <div className="agenda-copy">
                          <button type="button" className="agenda-title" onClick={() => onEdit(task)}>
                            {task.projectName}
                          </button>
                          <p className="muted tiny agenda-meta">
                            <span>{task.clientName}</span>
                            <EditorBadges names={getTaskEditors(task)} editors={editors} size="sm" />
                            {task.description ? (
                              <span>
                                — {task.description.slice(0, 60)}
                                {task.description.length > 60 ? '…' : ''}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="agenda-side">
                        <span className={`status-badge status-${slug}`}>{task.status}</span>
                        <select
                          className="agenda-status-select"
                          aria-label={`Status for ${task.projectName}`}
                          value={task.status}
                          onChange={(event) => onStatusChange?.(task, event.target.value)}
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <span className="agenda-date">{formatShortDate(getDueDate(task))}</span>
                        <div className="row-actions">
                          <button className="button ghost compact" type="button" onClick={() => onEdit(task)}>Edit</button>
                          <button className="button danger compact" type="button" onClick={() => onDelete(task)}>Delete</button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

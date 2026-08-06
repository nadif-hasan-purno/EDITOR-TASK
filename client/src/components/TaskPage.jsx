import React, { useCallback, useEffect, useRef, useState } from 'react';
import { STATUSES, PRIORITIES } from '../constants.js';
import { EditorBadges } from './EditorBadge.jsx';
import { getTaskEditors } from '../utils/editors.js';
import DeadlineCountdown from './DeadlineCountdown.jsx';
import {
  formatCreatedDate,
  formatDateTime,
  formatDueLabel,
  getDueDate,
} from '../utils/dates.js';

function statusSlug(status) {
  return String(status || '').toLowerCase().replaceAll(' ', '-');
}

function CustomFieldValue({ field }) {
  if (field.type === 'url' && field.value) {
    return (
      <a href={field.value} target="_blank" rel="noreferrer" className="task-page-link">
        {String(field.value)}
      </a>
    );
  }
  if (field.value === '' || field.value === null || field.value === undefined) {
    return <span className="muted">Empty</span>;
  }
  return <span>{String(field.value)}</span>;
}

function PropertyRow({ label, children, hint }) {
  return (
    <div className="task-page-prop">
      <div className="task-page-prop-key">
        <span>{label}</span>
        {hint ? <small className="muted">{hint}</small> : null}
      </div>
      <div className="task-page-prop-val">{children}</div>
    </div>
  );
}

/**
 * Notion-style full-page task view.
 * Clicking a board card opens this; Edit still uses the existing form.
 * Description document writes to the same `description` field as the edit form.
 */
export default function TaskPage({
  task,
  editors = [],
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onTogglePin,
  onDescriptionChange,
}) {
  const due = getDueDate(task);
  const taskEditors = getTaskEditors(task);
  const slug = statusSlug(task.status);
  const priority = task.priority || 'medium';

  const savedDescription = task.description || '';
  const [docText, setDocText] = useState(savedDescription);
  const [docDirty, setDocDirty] = useState(false);
  const [docStatus, setDocStatus] = useState('idle'); // idle | saving | saved | error
  const [docError, setDocError] = useState('');
  const saveTimerRef = useRef(null);
  const docTextRef = useRef(docText);
  const taskIdRef = useRef(task._id);

  docTextRef.current = docText;
  taskIdRef.current = task._id;

  // Sync from server/edit-form when task changes and local doc isn't mid-edit dirty
  useEffect(() => {
    if (!docDirty) {
      setDocText(task.description || '');
      setDocStatus('idle');
      setDocError('');
    }
  }, [task._id, task.description, task.updatedAt, docDirty]);

  // If user switches to another task while open, always reset
  useEffect(() => {
    setDocText(task.description || '');
    setDocDirty(false);
    setDocStatus('idle');
    setDocError('');
  }, [task._id]);

  const flushDescription = useCallback(async (value) => {
    if (!onDescriptionChange) return;
    const next = String(value ?? '');
    const current = String(task.description || '');
    if (next === current) {
      setDocDirty(false);
      setDocStatus('idle');
      return;
    }
    setDocStatus('saving');
    setDocError('');
    try {
      await onDescriptionChange(task, next);
      // Only clear dirty if this is still the same task and text matches what we saved
      if (taskIdRef.current === task._id && docTextRef.current === next) {
        setDocDirty(false);
        setDocStatus('saved');
      }
    } catch (error) {
      setDocStatus('error');
      setDocError(error?.message || 'Could not save description.');
    }
  }, [onDescriptionChange, task]);

  function scheduleSave(value) {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      flushDescription(value);
    }, 650);
  }

  function handleDocChange(event) {
    const value = event.target.value;
    setDocText(value);
    setDocDirty(true);
    setDocStatus('idle');
    scheduleSave(value);
  }

  function handleDocBlur() {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (docDirty) flushDescription(docText);
  }

  // Flush pending text on unmount / close
  useEffect(() => () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key !== 'Escape') return;
      // Don’t close while typing in the document — blur first (second Esc closes)
      if (event.target.closest('textarea, input, select, [contenteditable="true"]')) {
        event.target.blur?.();
        return;
      }
      // Save pending doc before leave
      if (docDirty) flushDescription(docTextRef.current);
      onClose?.();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, docDirty, flushDescription]);

  return (
    <div
      className="task-page-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <article
        className={`task-page card-accent-${slug} priority-${priority}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-page-title"
      >
        <header className="task-page-chrome">
          <div className="task-page-crumbs">
            <button type="button" className="task-page-crumb" onClick={onClose}>
              Board
            </button>
            <span className="task-page-crumb-sep" aria-hidden="true">/</span>
            <span className="task-page-crumb is-current">Task</span>
            <span className="task-page-id">#{task._id.slice(-6)}</span>
          </div>
          <div className="task-page-chrome-actions">
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
            <button
              type="button"
              className="button secondary compact"
              onClick={() => onEdit?.(task)}
            >
              Edit
            </button>
            <button
              type="button"
              className="button danger compact"
              onClick={() => onDelete?.(task)}
            >
              Delete
            </button>
            <button
              type="button"
              className="icon-button task-page-close"
              onClick={onClose}
              aria-label="Close task page"
            >
              ×
            </button>
          </div>
        </header>

        <div className="task-page-body">
          <div className="task-page-hero">
            <div className="task-page-badges">
              <span className={`status-badge status-${slug}`}>{task.status}</span>
              <span className={`priority-chip priority-chip-${priority}`}>{priority}</span>
              {task.pinned ? <span className="task-page-pinned-tag">Pinned</span> : null}
            </div>
            <h1 id="task-page-title">{task.projectName}</h1>
            <p className="task-page-subtitle">
              <span>{task.clientName}</span>
              {taskEditors.length > 0 && (
                <>
                  <span className="task-page-dot" aria-hidden="true">·</span>
                  <EditorBadges names={taskEditors} editors={editors} size="md" />
                </>
              )}
            </p>
            <div className="task-page-countdown-row">
              <DeadlineCountdown task={task} size="lg" showDue />
            </div>
          </div>

          <section className="task-page-section" aria-label="Properties">
            <p className="eyebrow">Properties</p>
            <div className="task-page-props">
              <PropertyRow label="Status">
                <select
                  className="task-page-select"
                  value={task.status}
                  aria-label="Task status"
                  onChange={(event) => onStatusChange?.(task, event.target.value)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </PropertyRow>

              <PropertyRow label="Priority">
                <select
                  className="task-page-select"
                  value={priority}
                  aria-label="Task priority"
                  onChange={(event) => onPriorityChange?.(task, event.target.value)}
                >
                  {PRIORITIES.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </select>
              </PropertyRow>

              <PropertyRow label="Client">
                <span className="task-page-text">{task.clientName || '—'}</span>
              </PropertyRow>

              <PropertyRow label="Editors">
                {taskEditors.length ? (
                  <EditorBadges names={taskEditors} editors={editors} size="md" />
                ) : (
                  <span className="muted">Unassigned</span>
                )}
              </PropertyRow>

              <PropertyRow label="Created" hint="System">
                <span className="task-page-text" title={task.createdAt || ''}>
                  {formatCreatedDate(task.createdAt)}
                </span>
              </PropertyRow>

              <PropertyRow label="Due" hint="End of project">
                <span className="task-page-text">
                  {due ? formatDueLabel(due) : 'Not set'}
                </span>
              </PropertyRow>

              <PropertyRow label="Remaining" hint="Live">
                <DeadlineCountdown task={task} size="md" />
              </PropertyRow>

              <PropertyRow label="Duration">
                <span className="task-page-text">{task.duration ?? '—'}</span>
              </PropertyRow>

              {(task.customFields || []).map((field) => (
                <PropertyRow key={field._id || field.name} label={field.name} hint={field.type}>
                  <CustomFieldValue field={field} />
                </PropertyRow>
              ))}
            </div>
          </section>

          <section className="task-page-section task-page-document" aria-label="Description document">
            <div className="task-page-doc-head">
              <div>
                <p className="eyebrow">Document</p>
                <h2 className="task-page-doc-title">Description</h2>
              </div>
              <span
                className={`task-page-doc-status status-${docStatus}`}
                aria-live="polite"
              >
                {docStatus === 'saving' && 'Saving…'}
                {docStatus === 'saved' && !docDirty && 'Saved'}
                {docStatus === 'error' && (docError || 'Save failed')}
                {docStatus === 'idle' && docDirty && 'Unsaved'}
                {docStatus === 'idle' && !docDirty && 'Same as Edit → Description'}
              </span>
            </div>
            <textarea
              className="task-page-doc-editor"
              value={docText}
              onChange={handleDocChange}
              onBlur={handleDocBlur}
              placeholder="Start writing… This is the same description field as in Edit. Changes sync both ways."
              rows={12}
              spellCheck
              aria-label="Task description document"
            />
            <p className="task-page-doc-hint muted tiny">
              Auto-saves to the task description. Edit form and this page always share one field.
            </p>
          </section>

          <section className="task-page-section">
            <p className="eyebrow">Manager notes</p>
            {task.notes ? (
              <div className="task-page-notes">{task.notes}</div>
            ) : (
              <p className="task-page-empty">No internal notes.</p>
            )}
          </section>

          {(task.googleDocLink || task.frameIoLink) && (
            <section className="task-page-section">
              <p className="eyebrow">Links</p>
              <div className="task-page-links">
                {task.googleDocLink && (
                  <a
                    className="task-page-link-card"
                    href={task.googleDocLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="task-page-link-kind">Google Doc</span>
                    <span className="task-page-link-url">{task.googleDocLink}</span>
                  </a>
                )}
                {task.frameIoLink && (
                  <a
                    className="task-page-link-card"
                    href={task.frameIoLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="task-page-link-kind">Frame.io</span>
                    <span className="task-page-link-url">{task.frameIoLink}</span>
                  </a>
                )}
              </div>
            </section>
          )}

          <footer className="task-page-meta-foot">
            <span>
              Created {task.createdAt ? formatDateTime(task.createdAt) : '—'}
            </span>
            {task.updatedAt && (
              <span>
                Updated {formatDateTime(task.updatedAt)}
              </span>
            )}
          </footer>
        </div>

        <div className="task-page-bottom-bar">
          <button type="button" className="button ghost" onClick={onClose}>
            Close
          </button>
          <div className="row-actions">
            <button type="button" className="button secondary" onClick={() => onEdit?.(task)}>
              Edit task
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

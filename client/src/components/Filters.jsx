import React from 'react';
import { PRIORITIES, STATUSES } from '../constants.js';

const SMART_CHIPS = [
  { id: '', label: 'All' },
  { id: 'overdue', label: 'Due today' },
  { id: 'due-week', label: 'This week' },
  { id: 'high', label: 'High priority' },
  { id: 'revision', label: 'In revision' },
  { id: 'multi-editors', label: 'Multi-editor' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'missing-links', label: 'Missing links' },
];

export default function Filters({
  filters,
  onChange,
  clients,
  editors = [],
  onExport,
  exporting,
  hideDone,
  onHideDoneChange,
}) {
  const editorNames = editors.map((editor) =>
    typeof editor === 'string' ? editor : editor.name,
  );
  const update = (key) => (event) => onChange({ ...filters, [key]: event.target.value });

  const hasFilters = Boolean(
    filters.status
    || filters.client
    || filters.editor
    || filters.priority
    || filters.search
    || filters.smart
    || hideDone,
  );

  function clearAll() {
    onChange({ status: '', client: '', editor: '', priority: '', search: '', smart: '' });
    onHideDoneChange(false);
  }

  return (
    <section className="toolbar management-toolbar" aria-label="Task filters">
      <div className="filters-stack">
        <div className="filters">
          <label className="search-field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Project, client, editor, notes…"
              value={filters.search}
              onChange={update('search')}
            />
          </label>
          <label>
            <span>Status</span>
            <select value={filters.status} onChange={update('status')}>
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select value={filters.priority} onChange={update('priority')}>
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Client</span>
            <select value={filters.client} onChange={update('client')}>
              <option value="">All clients</option>
              {clients.map((client) => <option key={client}>{client}</option>)}
            </select>
          </label>
          <label>
            <span>Editor</span>
            <select value={filters.editor} onChange={update('editor')}>
              <option value="">All editors</option>
              {editorNames.map((editor) => (
                <option key={editor} value={editor}>{editor}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="smart-row">
          <div className="smart-chips" role="group" aria-label="Smart filters">
            {SMART_CHIPS.map((chip) => (
              <button
                key={chip.id || 'all'}
                type="button"
                className={`chip${filters.smart === chip.id ? ' active' : ''}`}
                onClick={() => onChange({ ...filters, smart: chip.id })}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <label className="checkbox hide-done">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(event) => onHideDoneChange(event.target.checked)}
            />
            <span>Hide done</span>
          </label>
          {hasFilters && (
            <button className="button ghost compact" type="button" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <button className="button secondary" type="button" onClick={onExport} disabled={exporting}>
        {exporting ? 'Exporting…' : 'Export to CSV'}
      </button>
    </section>
  );
}

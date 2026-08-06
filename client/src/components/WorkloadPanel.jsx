import React from 'react';

export default function WorkloadPanel({ editors, clients, recent, onFilterEditor, onFilterClient, onOpenTask }) {
  const maxOpen = Math.max(1, ...editors.map((row) => row.open));

  return (
    <aside className="workload-panel" aria-label="Team and client workload">
      <div className="workload-block">
        <div className="workload-head">
          <p className="eyebrow">Capacity</p>
          <h3>Editor load</h3>
        </div>
        {editors.length === 0 ? (
          <p className="muted tiny">No open assignments.</p>
        ) : (
          <ul className="workload-list">
            {editors.slice(0, 6).map((row) => (
              <li key={row.editor}>
                <button type="button" className="workload-row" onClick={() => onFilterEditor(row.editor)}>
                  <div className="workload-row-top">
                    <span>{row.editor}</span>
                    <strong>{row.open}</strong>
                  </div>
                  <div className="workload-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((row.open / maxOpen) * 100)}%` }} />
                  </div>
                  <div className="workload-meta muted tiny">
                    {row.high ? <span className="hot-text">{row.high} high</span> : <span>0 high</span>}
                    {row.overdue ? <span className="danger-text"> · {row.overdue} due now</span> : null}
                    {row.collab ? <span> · {row.collab} collab</span> : null}
                    <span> · {row.duration} dur</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="workload-block">
        <div className="workload-head">
          <p className="eyebrow">Accounts</p>
          <h3>Client heat</h3>
        </div>
        {clients.length === 0 ? (
          <p className="muted tiny">No open client work.</p>
        ) : (
          <ul className="workload-list compact">
            {clients.slice(0, 5).map((row) => (
              <li key={row.client}>
                <button type="button" className="workload-row flat" onClick={() => onFilterClient(row.client)}>
                  <span className="workload-name">{row.client}</span>
                  <span className="workload-pills">
                    <span className="mini-pill">{row.open}</span>
                    {row.high > 0 && <span className="mini-pill hot">{row.high}H</span>}
                    {row.overdue > 0 && <span className="mini-pill danger">{row.overdue}!</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="workload-block">
        <div className="workload-head">
          <p className="eyebrow">Pulse</p>
          <h3>Recent updates</h3>
        </div>
        {recent.length === 0 ? (
          <p className="muted tiny">No recent activity.</p>
        ) : (
          <ul className="activity-list">
            {recent.map((task) => (
              <li key={task._id}>
                <button type="button" className="activity-item" onClick={() => onOpenTask(task)}>
                  <strong>{task.projectName}</strong>
                  <span className="muted tiny">
                    {task.status} · {(Array.isArray(task.editorNames) && task.editorNames.length
                      ? task.editorNames
                      : task.editorName
                        ? [task.editorName]
                        : []
                    ).join(', ') || '—'}
                    {task.updatedAt
                      ? ` · ${new Date(task.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                      : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

import React from 'react';
import { STATUSES } from '../constants.js';

export default function BulkBar({ count, onClear, onStatus, onPriority, onDelete, busy }) {
  if (count === 0) return null;

  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <strong>{count} selected</strong>
      <select
        aria-label="Set status for selected"
        defaultValue=""
        disabled={busy}
        onChange={(event) => {
          if (event.target.value) {
            onStatus(event.target.value);
            event.target.value = '';
          }
        }}
      >
        <option value="">Set status…</option>
        {STATUSES.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <select
        aria-label="Set priority for selected"
        defaultValue=""
        disabled={busy}
        onChange={(event) => {
          if (event.target.value) {
            onPriority(event.target.value);
            event.target.value = '';
          }
        }}
      >
        <option value="">Set priority…</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button className="button danger compact" type="button" disabled={busy} onClick={onDelete}>
        Delete
      </button>
      <button className="button ghost compact" type="button" disabled={busy} onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

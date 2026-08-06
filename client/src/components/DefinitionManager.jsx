import React, { useState } from 'react';
import { CUSTOM_FIELD_TYPES } from '../constants.js';

export default function DefinitionManager({ definitions, onCreate, onUpdate, onDelete, onClose }) {
  const [draft, setDraft] = useState({ name: '', type: 'text', options: '' });
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function beginEdit(definition) {
    setEditingId(definition._id);
    setDraft({
      name: definition.name,
      type: definition.type,
      options: (definition.options || []).join(', '),
    });
  }

  function reset() {
    setEditingId('');
    setDraft({ name: '', type: 'text', options: '' });
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      name: draft.name.trim(),
      type: draft.type,
      options: draft.type === 'dropdown'
        ? [...new Set(draft.options.split(',').map((option) => option.trim()).filter(Boolean))]
        : [],
    };
    try {
      if (editingId) await onUpdate(editingId, payload);
      else await onCreate(payload);
      reset();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal narrow" role="dialog" aria-modal="true" aria-labelledby="definition-title">
        <header className="modal-header">
          <div><p className="eyebrow">Workspace settings</p><h2 id="definition-title">Reusable custom fields</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>
        {error && <div className="alert error">{error}</div>}
        <form className="definition-form" onSubmit={submit}>
          <label><span>Name *</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label><span>Type *</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{CUSTOM_FIELD_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          {draft.type === 'dropdown' && <label><span>Options (comma separated) *</span><input required value={draft.options} onChange={(event) => setDraft({ ...draft, options: event.target.value })} /></label>}
          <div className="inline-controls end">
            {editingId && <button className="button ghost compact" type="button" onClick={reset}>Cancel edit</button>}
            <button className="button primary compact" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Update definition' : 'Add definition'}</button>
          </div>
        </form>
        <div className="definition-list">
          {definitions.map((definition) => (
            <div className="definition-item" key={definition._id}>
              <div><strong>{definition.name}</strong><span>{definition.type}{definition.type === 'dropdown' ? ` · ${(definition.options || []).join(', ')}` : ''}</span></div>
              <div className="row-actions">
                <button className="button ghost compact" type="button" onClick={() => beginEdit(definition)}>Edit</button>
                <button className="button danger compact" type="button" onClick={() => onDelete(definition)}>Delete</button>
              </div>
            </div>
          ))}
          {definitions.length === 0 && <p className="empty-state small">No reusable definitions yet.</p>}
        </div>
      </section>
    </div>
  );
}

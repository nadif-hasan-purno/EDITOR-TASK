import React, { useState } from 'react';

const EMPTY = { name: '', color: '#4f6fe8' };

export default function EditorManager({ editors, onCreate, onUpdate, onDelete, onClose }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function beginEdit(editor) {
    setEditingId(editor._id);
    setDraft({
      name: editor.name,
      color: editor.color || '#4f6fe8',
    });
    setError('');
  }

  function reset() {
    setEditingId('');
    setDraft(EMPTY);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      name: draft.name.trim(),
      color: draft.color,
      active: true,
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
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="modal narrow" role="dialog" aria-modal="true" aria-labelledby="editor-manager-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">Team roster</p>
            <h2 id="editor-manager-title">Editors</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        {error && <div className="alert error">{error}</div>}

        <form className="definition-form" onSubmit={submit}>
          <label>
            <span>Name *</span>
            <input
              required
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="e.g. Ashik"
            />
          </label>
          <label>
            <span>Color *</span>
            <div className="editor-color-row">
              <input
                type="color"
                value={draft.color}
                onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                aria-label="Editor color"
              />
              <input
                required
                pattern="^#[0-9A-Fa-f]{6}$"
                value={draft.color}
                onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                placeholder="#4f6fe8"
              />
            </div>
          </label>
          <div className="inline-controls end">
            {editingId && (
              <button className="button ghost compact" type="button" onClick={reset}>
                Cancel edit
              </button>
            )}
            <button className="button primary compact" type="submit" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Update editor' : 'Add editor'}
            </button>
          </div>
        </form>

        <div className="definition-list">
          {editors.map((editor) => (
            <div className="definition-item editor-roster-item" key={editor._id}>
              <div className="editor-roster-main">
                <span
                  className="editor-swatch"
                  style={{ backgroundColor: editor.color }}
                  aria-hidden="true"
                />
                <div>
                  <strong>{editor.name}</strong>
                  <span>{editor.color}</span>
                </div>
              </div>
              <div className="row-actions">
                <button className="button ghost compact" type="button" onClick={() => beginEdit(editor)}>
                  Edit
                </button>
                <button className="button danger compact" type="button" onClick={() => onDelete(editor)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {editors.length === 0 && (
            <p className="empty-state small">No editors yet. Add your first team member.</p>
          )}
        </div>
      </section>
    </div>
  );
}

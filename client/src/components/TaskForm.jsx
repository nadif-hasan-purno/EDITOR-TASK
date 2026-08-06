import React, { useMemo, useState } from 'react';
import { CUSTOM_FIELD_TYPES, PRIORITIES, STATUSES } from '../constants.js';
import CustomFieldInput from './CustomFieldInput.jsx';
import { getTaskEditors } from '../utils/editors.js';
import EditorBadge, { colorForEditor } from './EditorBadge.jsx';

const emptyTask = {
  clientName: '',
  editorNames: [],
  projectName: '',
  googleDocLink: '',
  deadlineDays: 0,
  duration: 0,
  status: 'Todo',
  priority: 'medium',
  pinned: false,
  notes: '',
  frameIoLink: '',
  description: '',
  customFields: [],
};

function prepareInitial(task) {
  if (!task) return emptyTask;
  const editorNames = getTaskEditors(task);
  return {
    ...emptyTask,
    ...task,
    editorNames,
    priority: task.priority || 'medium',
    pinned: Boolean(task.pinned),
    notes: task.notes || '',
    customFields: (task.customFields || []).map((field) => ({
      ...field,
      localId: field._id || crypto.randomUUID(),
    })),
  };
}

const QUICK_COLORS = ['#4f6fe8', '#0d9488', '#7c3aed', '#ea580c', '#db2777', '#059669', '#0891b2', '#ca8a04'];

export default function TaskForm({
  task,
  definitions,
  editors = [],
  onSave,
  onCancel,
  onCreateDefinition,
  onCreateEditor,
}) {
  const [form, setForm] = useState(() => prepareInitial(task));
  const [selectedDefinition, setSelectedDefinition] = useState('');
  const [newField, setNewField] = useState({ name: '', type: 'text', options: '', reusable: false });
  const [newEditor, setNewEditor] = useState({ name: '', color: '#4f6fe8' });
  const [showAddEditor, setShowAddEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldBusy, setFieldBusy] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [error, setError] = useState('');

  const availableDefinitions = useMemo(() => {
    const usedNames = new Set(form.customFields.map((field) => field.name.toLowerCase()));
    return definitions.filter((definition) => !usedNames.has(definition.name.toLowerCase()));
  }, [definitions, form.customFields]);

  const selectedEditors = form.editorNames || [];

  const editorOptions = useMemo(() => {
    const active = editors.filter((editor) => editor.active !== false);
    const extras = selectedEditors
      .filter((name) => !active.some((editor) => editor.name.toLowerCase() === name.toLowerCase()))
      .map((name) => ({ _id: `legacy-${name}`, name, color: '#6b7280', legacy: true }));
    return [...extras, ...active];
  }, [editors, selectedEditors]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  function toggleEditor(name) {
    setForm((current) => {
      const existing = current.editorNames || [];
      const has = existing.some((item) => item.toLowerCase() === name.toLowerCase());
      const editorNames = has
        ? existing.filter((item) => item.toLowerCase() !== name.toLowerCase())
        : [...existing, name];
      return { ...current, editorNames };
    });
  }

  async function addNewEditor(event) {
    event.preventDefault();
    event.stopPropagation();
    setError('');

    const name = newEditor.name.trim();
    const color = newEditor.color || '#4f6fe8';
    if (!name) {
      setError('Enter a name for the new editor.');
      return;
    }
    if (!onCreateEditor) {
      setError('Adding editors is not available right now.');
      return;
    }
    if (editorOptions.some((editor) => editor.name.toLowerCase() === name.toLowerCase())) {
      // Already in list — just select them
      setForm((current) => {
        const existing = current.editorNames || [];
        if (existing.some((item) => item.toLowerCase() === name.toLowerCase())) return current;
        return { ...current, editorNames: [...existing, name] };
      });
      setNewEditor({ name: '', color });
      setShowAddEditor(false);
      return;
    }

    try {
      setEditorBusy(true);
      const created = await onCreateEditor({ name, color, active: true });
      setForm((current) => {
        const existing = current.editorNames || [];
        if (existing.some((item) => item.toLowerCase() === created.name.toLowerCase())) {
          return current;
        }
        return { ...current, editorNames: [...existing, created.name] };
      });
      setNewEditor({ name: '', color: QUICK_COLORS[Math.floor(Math.random() * QUICK_COLORS.length)] });
      setShowAddEditor(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setEditorBusy(false);
    }
  }

  function addDefinitionField() {
    const definition = definitions.find((item) => item._id === selectedDefinition);
    if (!definition) return;
    setForm((current) => ({
      ...current,
      customFields: [
        ...current.customFields,
        {
          localId: crypto.randomUUID(),
          definitionId: definition._id,
          name: definition.name,
          type: definition.type,
          options: definition.options || [],
          value: '',
        },
      ],
    }));
    setSelectedDefinition('');
  }

  async function addNewField() {
    setError('');
    const name = newField.name.trim();
    const options = newField.type === 'dropdown'
      ? [...new Set(newField.options.split(',').map((option) => option.trim()).filter(Boolean))]
      : [];

    if (!name) return setError('Enter a name for the custom field.');
    if (form.customFields.some((field) => field.name.toLowerCase() === name.toLowerCase())) {
      return setError('That custom field is already on this task.');
    }
    if (newField.type === 'dropdown' && options.length === 0) {
      return setError('Dropdown fields need at least one comma-separated option.');
    }

    try {
      setFieldBusy(true);
      let definitionId;
      if (newField.reusable) {
        const created = await onCreateDefinition({ name, type: newField.type, options });
        definitionId = created._id;
      }
      setForm((current) => ({
        ...current,
        customFields: [
          ...current.customFields,
          {
            localId: crypto.randomUUID(),
            ...(definitionId ? { definitionId } : {}),
            name,
            type: newField.type,
            options,
            value: '',
          },
        ],
      }));
      setNewField({ name: '', type: 'text', options: '', reusable: false });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setFieldBusy(false);
    }
  }

  function updateCustomField(index, value) {
    setForm((current) => ({
      ...current,
      customFields: current.customFields.map((field, fieldIndex) => fieldIndex === index ? value : field),
    }));
  }

  function removeCustomField(index) {
    setForm((current) => ({
      ...current,
      customFields: current.customFields.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const editorNames = form.editorNames || [];
    if (editorNames.length === 0) {
      setError('Select at least one editor.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        editorNames,
        editorName: editorNames[0],
        deadlineDays: Number(form.deadlineDays),
        duration: Number(form.duration),
        customFields: form.customFields.map(({ localId, _id, ...field }) => field),
      });
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="task-form-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">{task ? 'Update assignment' : 'New assignment'}</p>
            <h2 id="task-form-title">{task ? 'Edit task' : 'Create task'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close">×</button>
        </header>

        <form onSubmit={submit}>
          {error && <div className="alert error">{error}</div>}
          <div className="form-grid">
            <label><span>Client Name *</span><input required value={form.clientName} onChange={update('clientName')} /></label>
            <label className="wide"><span>Project Name *</span><input required value={form.projectName} onChange={update('projectName')} /></label>
            <div className="wide editor-multi-field">
              <div className="editor-multi-head">
                <span>Editors *</span>
                <small className="muted tiny">
                  {selectedEditors.length === 0
                    ? 'Select one or more'
                    : selectedEditors.length === 1
                      ? '1 editor'
                      : `${selectedEditors.length} editors (collab)`}
                </small>
              </div>
              {selectedEditors.length > 0 && (
                <div className="editor-multi-selected">
                  {selectedEditors.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="editor-chip-remove"
                      onClick={() => toggleEditor(name)}
                      title={`Remove ${name}`}
                    >
                      <EditorBadge name={name} color={colorForEditor(name, editors)} size="sm" />
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="editor-multi-grid" role="group" aria-label="Select editors">
                {editorOptions.map((editor) => {
                  const checked = selectedEditors.some(
                    (name) => name.toLowerCase() === editor.name.toLowerCase(),
                  );
                  return (
                    <label
                      key={editor._id || editor.name}
                      className={`editor-multi-option${checked ? ' is-selected' : ''}`}
                      style={{
                        borderColor: checked ? editor.color || '#4f6fe8' : undefined,
                        background: checked
                          ? `color-mix(in oklab, ${editor.color || '#4f6fe8'} 14%, transparent)`
                          : undefined,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEditor(editor.name)}
                      />
                      <span
                        className="editor-swatch"
                        style={{ backgroundColor: editor.color || '#6b7280' }}
                        aria-hidden="true"
                      />
                      <span>
                        {editor.name}
                        {editor.legacy ? ' (legacy)' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>

              {!showAddEditor ? (
                <button
                  type="button"
                  className="button secondary compact editor-add-toggle"
                  onClick={() => {
                    setShowAddEditor(true);
                    setError('');
                  }}
                >
                  + Add new editor
                </button>
              ) : (
                <div className="editor-quick-add">
                  <div className="editor-quick-add-head">
                    <strong>New team member</strong>
                    <button
                      type="button"
                      className="button ghost compact"
                      onClick={() => {
                        setShowAddEditor(false);
                        setNewEditor({ name: '', color: '#4f6fe8' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="editor-quick-add-grid">
                    <label>
                      <span>Name *</span>
                      <input
                        value={newEditor.name}
                        onChange={(event) => setNewEditor((current) => ({ ...current, name: event.target.value }))}
                        placeholder="e.g. Sakib"
                        autoFocus
                      />
                    </label>
                    <label>
                      <span>Color</span>
                      <div className="editor-color-row">
                        <input
                          type="color"
                          value={newEditor.color}
                          onChange={(event) => setNewEditor((current) => ({ ...current, color: event.target.value }))}
                          aria-label="Editor color"
                        />
                        <input
                          value={newEditor.color}
                          onChange={(event) => setNewEditor((current) => ({ ...current, color: event.target.value }))}
                          pattern="^#[0-9A-Fa-f]{6}$"
                        />
                      </div>
                    </label>
                  </div>
                  <div className="quick-color-picks" role="group" aria-label="Quick colors">
                    {QUICK_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`quick-color-swatch${newEditor.color === color ? ' is-active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewEditor((current) => ({ ...current, color }))}
                        aria-label={`Use color ${color}`}
                      />
                    ))}
                  </div>
                  <div className="inline-controls end">
                    <button
                      type="button"
                      className="button primary compact"
                      disabled={editorBusy || !newEditor.name.trim()}
                      onClick={addNewEditor}
                    >
                      {editorBusy ? 'Adding…' : 'Add & select'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <label><span>Status *</span><select value={form.status} onChange={update('status')}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>
              <span>Priority</span>
              <select value={form.priority || 'medium'} onChange={update('priority')}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label><span>Deadline (days) *</span><input required min="0" type="number" value={form.deadlineDays} onChange={update('deadlineDays')} /></label>
            <label><span>Duration *</span><input required min="0" step="any" type="number" value={form.duration} onChange={update('duration')} /></label>
            <label className="wide"><span>Google Doc Link</span><input type="url" placeholder="https://docs.google.com/..." value={form.googleDocLink} onChange={update('googleDocLink')} /></label>
            <label className="wide"><span>Frame.io Link</span><input type="url" placeholder="https://frame.io/..." value={form.frameIoLink} onChange={update('frameIoLink')} /></label>
            <label className="wide"><span>Description</span><textarea rows="3" value={form.description} onChange={update('description')} /></label>
            <label className="wide">
              <span>Manager notes</span>
              <textarea
                rows="2"
                placeholder="Internal follow-ups, blockers, handoff notes…"
                value={form.notes || ''}
                onChange={update('notes')}
              />
            </label>
            <label className="checkbox wide pin-check">
              <input
                type="checkbox"
                checked={Boolean(form.pinned)}
                onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
              />
              <span>Pin this task to the top of management views</span>
            </label>
          </div>

          <section className="custom-fields-section">
            <div className="section-heading">
              <div><p className="eyebrow">Flexible metadata</p><h3>Custom fields</h3></div>
              <span>{form.customFields.length} added</span>
            </div>

            {form.customFields.map((field, index) => (
              <CustomFieldInput
                key={field.localId || field._id || `${field.name}-${index}`}
                field={field}
                onChange={(value) => updateCustomField(index, value)}
                onRemove={() => removeCustomField(index)}
              />
            ))}

            <div className="field-adder">
              <h4>Add a reusable field</h4>
              <div className="inline-controls">
                <select value={selectedDefinition} onChange={(event) => setSelectedDefinition(event.target.value)}>
                  <option value="">Choose a saved definition</option>
                  {availableDefinitions.map((definition) => (
                    <option value={definition._id} key={definition._id}>{definition.name} ({definition.type})</option>
                  ))}
                </select>
                <button className="button secondary compact" type="button" disabled={!selectedDefinition} onClick={addDefinitionField}>Add</button>
              </div>
              {availableDefinitions.length === 0 && definitions.length > 0 && <p className="muted tiny">All saved definitions are already on this task.</p>}
            </div>

            <div className="field-adder">
              <h4>Define a field on the fly</h4>
              <div className="new-field-grid">
                <label><span>Name</span><input value={newField.name} onChange={(event) => setNewField({ ...newField, name: event.target.value })} /></label>
                <label><span>Type</span><select value={newField.type} onChange={(event) => setNewField({ ...newField, type: event.target.value })}>{CUSTOM_FIELD_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                {newField.type === 'dropdown' && <label className="wide"><span>Options (comma separated)</span><input value={newField.options} onChange={(event) => setNewField({ ...newField, options: event.target.value })} /></label>}
              </div>
              <div className="inline-controls split">
                <label className="checkbox"><input type="checkbox" checked={newField.reusable} onChange={(event) => setNewField({ ...newField, reusable: event.target.checked })} /><span>Save as reusable definition</span></label>
                <button className="button secondary compact" type="button" onClick={addNewField} disabled={fieldBusy}>{fieldBusy ? 'Adding…' : 'Add field'}</button>
              </div>
            </div>
          </section>

          <footer className="modal-actions">
            <button className="button ghost" type="button" onClick={onCancel}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

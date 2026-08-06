import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanelRightClose, PanelRightOpen, Plus, Settings2, Users } from 'lucide-react';
import { api } from './api.js';
import Filters from './components/Filters.jsx';
import DashboardStrip from './components/DashboardStrip.jsx';
import WorkloadPanel from './components/WorkloadPanel.jsx';
import BulkBar from './components/BulkBar.jsx';
import BoardView from './components/BoardView.jsx';
import AgendaView from './components/AgendaView.jsx';
import ListView from './components/ListView.jsx';
import TaskForm from './components/TaskForm.jsx';
import DefinitionManager from './components/DefinitionManager.jsx';
import EditorManager from './components/EditorManager.jsx';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  applyLocalFilters,
  buildClientWorkload,
  buildEditorWorkload,
  buildInsights,
  recentActivity,
  sortForManagement,
} from './utils/insights.js';

const emptyFilters = {
  status: '',
  client: '',
  editor: '',
  priority: '',
  search: '',
  smart: '',
};

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [editorRoster, setEditorRoster] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [hideDone, setHideDone] = useState(() => readStored('ct-hide-done', '0') === '1');
  const [knownClients, setKnownClients] = useState(new Set());
  const [view, setView] = useState(() => readStored('ct-view', 'board'));
  const [compactCards, setCompactCards] = useState(() => readStored('ct-compact', '1') !== '0');
  const [showSidePanel, setShowSidePanel] = useState(() => readStored('ct-side', '1') !== '0');
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [showEditors, setShowEditors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('ct-view', view);
      localStorage.setItem('ct-compact', compactCards ? '1' : '0');
      localStorage.setItem('ct-side', showSidePanel ? '1' : '0');
      localStorage.setItem('ct-hide-done', hideDone ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [view, compactCards, showSidePanel, hideDone]);

  const rememberNames = useCallback((items) => {
    setKnownClients((current) => new Set([...current, ...items.map((task) => task.clientName).filter(Boolean)]));
  }, []);

  const serverFilters = useMemo(
    () => ({
      status: filters.status,
      client: filters.client,
      editor: filters.editor,
      priority: filters.priority,
    }),
    [filters.status, filters.client, filters.editor, filters.priority],
  );

  const loadTasks = useCallback(async (activeFilters, showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const data = await api.listTasks(activeFilters);
      setTasks(data);
      rememberNames(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [rememberNames]);

  const loadDefinitions = useCallback(async () => {
    try {
      setDefinitions(await api.listDefinitions());
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  const loadEditors = useCallback(async () => {
    try {
      setEditorRoster(await api.listEditors(true));
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => {
    api.listTasks({}).then(rememberNames).catch(() => {});
    loadDefinitions();
    loadEditors();
  }, [loadDefinitions, loadEditors, rememberNames]);

  useEffect(() => {
    loadTasks(serverFilters);
  }, [serverFilters.status, serverFilters.client, serverFilters.editor, serverFilters.priority, loadTasks]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, hideDone, view]);

  const clients = useMemo(() => [...knownClients].sort((a, b) => a.localeCompare(b)), [knownClients]);
  const activeEditors = useMemo(
    () => editorRoster.filter((editor) => editor.active !== false),
    [editorRoster],
  );
  const filterEditors = useMemo(() => {
    const names = new Set(editorRoster.map((editor) => editor.name));
    for (const task of tasks) {
      if (Array.isArray(task.editorNames)) {
        for (const name of task.editorNames) if (name) names.add(name);
      } else if (task.editorName) {
        names.add(task.editorName);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b)).map((name) => {
      const found = editorRoster.find((editor) => editor.name === name);
      return found || { name, color: '#6b7280' };
    });
  }, [editorRoster, tasks]);

  const visibleTasks = useMemo(() => {
    const filtered = applyLocalFilters(tasks, {
      search: filters.search,
      smart: filters.smart,
      hideDone,
    });
    return sortForManagement(filtered);
  }, [tasks, filters.search, filters.smart, hideDone]);

  const insights = useMemo(() => buildInsights(tasks), [tasks]);
  const editorLoad = useMemo(() => buildEditorWorkload(tasks), [tasks]);
  const clientLoad = useMemo(() => buildClientWorkload(tasks), [tasks]);
  const recent = useMemo(() => recentActivity(tasks), [tasks]);

  function openCreate() {
    setEditingTask(null);
    setShowTaskForm(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setShowTaskForm(true);
  }

  async function saveTask(payload) {
    const saved = editingTask
      ? await api.updateTask(editingTask._id, payload)
      : await api.createTask(payload);
    rememberNames([saved]);
    setShowTaskForm(false);
    setEditingTask(null);
    await loadTasks(serverFilters, false);
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.projectName}”? This cannot be undone.`)) return;
    try {
      await api.deleteTask(task._id);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(task._id);
        return next;
      });
      await loadTasks(serverFilters, false);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function changeTaskStatus(task, nextStatus) {
    if (!task || task.status === nextStatus) return;

    const previousStatus = task.status;
    setTasks((current) =>
      current.map((item) =>
        item._id === task._id ? { ...item, status: nextStatus } : item,
      ),
    );
    setError('');

    try {
      await api.updateTaskStatus(task._id, nextStatus);
    } catch (requestError) {
      setTasks((current) =>
        current.map((item) =>
          item._id === task._id ? { ...item, status: previousStatus } : item,
        ),
      );
      setError(requestError.message);
    }
  }

  async function togglePin(task) {
    const nextPinned = !task.pinned;
    setTasks((current) =>
      current.map((item) =>
        item._id === task._id ? { ...item, pinned: nextPinned } : item,
      ),
    );
    try {
      await api.patchTask(task._id, { pinned: nextPinned });
    } catch (requestError) {
      setTasks((current) =>
        current.map((item) =>
          item._id === task._id ? { ...item, pinned: task.pinned } : item,
        ),
      );
      setError(requestError.message);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (visibleTasks.length > 0 && visibleTasks.every((task) => current.has(task._id))) {
        return new Set();
      }
      return new Set(visibleTasks.map((task) => task._id));
    });
  }

  async function bulkPatch(fields) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBulkBusy(true);
    setError('');
    try {
      await Promise.all(ids.map((id) => api.patchTask(id, fields)));
      await loadTasks(serverFilters, false);
      setSelectedIds(new Set());
    } catch (requestError) {
      setError(requestError.message);
      await loadTasks(serverFilters, false);
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected task${ids.length === 1 ? '' : 's'}?`)) return;
    setBulkBusy(true);
    setError('');
    try {
      await Promise.all(ids.map((id) => api.deleteTask(id)));
      setSelectedIds(new Set());
      await loadTasks(serverFilters, false);
    } catch (requestError) {
      setError(requestError.message);
      await loadTasks(serverFilters, false);
    } finally {
      setBulkBusy(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      await api.downloadCsv(serverFilters);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
    }
  }

  async function createDefinition(payload) {
    const definition = await api.createDefinition(payload);
    setDefinitions((current) => [...current, definition].sort((a, b) => a.name.localeCompare(b.name)));
    return definition;
  }

  async function updateDefinition(id, payload) {
    const updated = await api.updateDefinition(id, payload);
    setDefinitions((current) => current.map((item) => item._id === id ? updated : item).sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function deleteDefinition(definition) {
    if (!window.confirm(`Delete reusable definition “${definition.name}”? Existing task values will remain.`)) return;
    try {
      await api.deleteDefinition(definition._id);
      setDefinitions((current) => current.filter((item) => item._id !== definition._id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createEditor(payload) {
    const editor = await api.createEditor(payload);
    setEditorRoster((current) =>
      [...current, editor].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    );
    return editor;
  }

  async function updateEditor(id, payload) {
    const updated = await api.updateEditor(id, payload);
    setEditorRoster((current) =>
      current
        .map((item) => (item._id === id ? updated : item))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    );
  }

  async function deleteEditor(editor) {
    if (!window.confirm(`Deactivate editor “${editor.name}”? Existing tasks keep the name.`)) return;
    try {
      const updated = await api.deleteEditor(editor._id);
      setEditorRoster((current) =>
        current.map((item) => (item._id === editor._id ? updated : item)),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div>
            <p className="eyebrow">Video agency workspace</p>
            <h1>Cutline Task Tracker</h1>
          </div>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSidePanel((current) => !current)}
          >
            {showSidePanel ? <PanelRightClose /> : <PanelRightOpen />}
            <span className="hidden sm:inline">{showSidePanel ? 'Hide insights' : 'Insights'}</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowEditors(true)}>
            <Users />
            <span className="hidden sm:inline">Editors</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowDefinitions(true)}>
            <Settings2 />
            <span className="hidden sm:inline">Custom fields</span>
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus />
            New task
          </Button>
        </div>
      </header>

      <main>
        <section className="overview">
          <div>
            <p className="eyebrow">Command center</p>
            <h2>Run production with clarity</h2>
            <p>
              Focused management surface with day/night theme, smart filters, workload heat,
              pins, and bulk actions.
            </p>
          </div>
          <div className="view-toggle" aria-label="Choose view">
            <button className={view === 'board' ? 'active' : ''} type="button" onClick={() => setView('board')}>Board</button>
            <button className={view === 'agenda' ? 'active' : ''} type="button" onClick={() => setView('agenda')}>Agenda</button>
            <button className={view === 'list' ? 'active' : ''} type="button" onClick={() => setView('list')}>Table</button>
          </div>
        </section>

        <DashboardStrip
          insights={insights}
          activeSmart={filters.smart}
          onSmartChange={(smart) => setFilters((current) => ({ ...current, smart }))}
        />

        <Filters
          filters={filters}
          onChange={setFilters}
          clients={clients}
          editors={filterEditors}
          onExport={exportCsv}
          exporting={exporting}
          hideDone={hideDone}
          onHideDoneChange={setHideDone}
        />

        {filters.smart === 'multi-editors' && (
          <section className="segment-banner multi-editor-segment" aria-label="Multi-editor projects">
            <div>
              <p className="eyebrow">Collab segment</p>
              <h3>Multi-editor projects</h3>
              <p>
                Showing only tasks assigned to <strong>2+ editors</strong>.
                Use the editor filter above to narrow to a person who is part of a collab.
              </p>
            </div>
            <div className="segment-banner-stats">
              <strong>{visibleTasks.length}</strong>
              <span>collab task{visibleTasks.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                className="button ghost compact"
                onClick={() => setFilters((current) => ({ ...current, smart: '' }))}
              >
                Exit segment
              </button>
            </div>
          </section>
        )}

        {error && <div className="alert error">{error}<button type="button" onClick={() => setError('')}>×</button></div>}

        <div className="results-heading">
          <p>
            <strong>{visibleTasks.length}</strong> task{visibleTasks.length === 1 ? '' : 's'}
            {visibleTasks.length !== tasks.length ? ` of ${tasks.length}` : ''} in this view
            {filters.smart === 'multi-editors' ? ' · multi-editor segment' : ''}
          </p>
          <div className="results-tools">
            {view === 'board' && (
              <button
                className="button ghost compact"
                type="button"
                onClick={() => setCompactCards((current) => !current)}
              >
                {compactCards ? 'Expand cards' : 'Compact cards'}
              </button>
            )}
            {(filters.status || filters.client || filters.editor || filters.priority) && (
              <span>CSV export uses status / client / editor / priority filters</span>
            )}
          </div>
        </div>

        <BulkBar
          count={selectedIds.size}
          busy={bulkBusy}
          onClear={() => setSelectedIds(new Set())}
          onStatus={(status) => bulkPatch({ status })}
          onPriority={(priority) => bulkPatch({ priority })}
          onDelete={bulkDelete}
        />

        <div className={`workspace${showSidePanel ? ' with-side' : ''}`}>
          <div className="workspace-main">
            {loading ? (
              <div className="loading-state"><div className="spinner" /><p>Loading tasks…</p></div>
            ) : visibleTasks.length === 0 ? (
              <section className="empty-state">
                <div>✓</div>
                <h2>No matching tasks</h2>
                <p>Create a task or clear search / smart filters to see more work.</p>
                <button className="button primary" type="button" onClick={openCreate}>Create task</button>
              </section>
            ) : view === 'board' ? (
              <BoardView
                tasks={visibleTasks}
                onEdit={openEdit}
                onDelete={deleteTask}
                onTogglePin={togglePin}
                onStatusChange={changeTaskStatus}
                editors={editorRoster}
                compactCards={compactCards}
              />
            ) : view === 'agenda' ? (
              <AgendaView
                tasks={visibleTasks}
                onEdit={openEdit}
                onDelete={deleteTask}
                onStatusChange={changeTaskStatus}
                editors={editorRoster}
              />
            ) : (
              <ListView
                tasks={visibleTasks}
                onEdit={openEdit}
                onDelete={deleteTask}
                onTogglePin={togglePin}
                editors={editorRoster}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
              />
            )}
          </div>

          {showSidePanel && (
            <WorkloadPanel
              editors={editorLoad}
              clients={clientLoad}
              recent={recent}
              onFilterEditor={(editor) => setFilters((current) => ({ ...current, editor }))}
              onFilterClient={(client) => setFilters((current) => ({ ...current, client }))}
              onOpenTask={openEdit}
            />
          )}
        </div>
      </main>

      {showTaskForm && (
        <TaskForm
          key={editingTask?._id || 'new'}
          task={editingTask}
          definitions={definitions}
          editors={activeEditors}
          onSave={saveTask}
          onCancel={() => { setShowTaskForm(false); setEditingTask(null); }}
          onCreateDefinition={createDefinition}
          onCreateEditor={createEditor}
        />
      )}
      {showDefinitions && (
        <DefinitionManager
          definitions={definitions}
          onCreate={createDefinition}
          onUpdate={updateDefinition}
          onDelete={deleteDefinition}
          onClose={() => setShowDefinitions(false)}
        />
      )}
      {showEditors && (
        <EditorManager
          editors={editorRoster}
          onCreate={createEditor}
          onUpdate={updateEditor}
          onDelete={deleteEditor}
          onClose={() => setShowEditors(false)}
        />
      )}
    </div>
  );
}

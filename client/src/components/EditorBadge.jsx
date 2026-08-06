import React from 'react';

function pickTextColor(hex) {
  const value = String(hex || '#4f6fe8').replace('#', '');
  if (value.length !== 6) return '#ffffff';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#18212f' : '#ffffff';
}

export default function EditorBadge({ name, color, className = '', size = 'md' }) {
  if (!name) return <span className={`muted ${className}`}>—</span>;

  const bg = color || '#6b7280';
  const fg = pickTextColor(bg);

  return (
    <span
      className={`editor-badge editor-badge-${size} ${className}`.trim()}
      style={{
        backgroundColor: bg,
        color: fg,
        borderColor: color ? 'transparent' : undefined,
      }}
      title={name}
    >
      <span className="editor-badge-dot" style={{ backgroundColor: fg }} aria-hidden="true" />
      {name}
    </span>
  );
}

export function editorColorMap(editors = []) {
  const map = new Map();
  for (const editor of editors) {
    if (editor?.name) map.set(editor.name.toLowerCase(), editor.color || '#6b7280');
  }
  return map;
}

export function colorForEditor(name, editorsOrMap) {
  if (!name) return '#6b7280';
  if (editorsOrMap instanceof Map) {
    return editorsOrMap.get(String(name).toLowerCase()) || '#6b7280';
  }
  const found = (editorsOrMap || []).find(
    (editor) => editor.name.toLowerCase() === String(name).toLowerCase(),
  );
  return found?.color || '#6b7280';
}

/** Renders one or many editor badges for a task. */
export function EditorBadges({ names = [], editors = [], size = 'sm', className = '' }) {
  const list = Array.isArray(names) ? names.filter(Boolean) : names ? [names] : [];
  if (list.length === 0) return <span className={`muted ${className}`}>—</span>;

  return (
    <span className={`editor-badges ${className}`.trim()}>
      {list.map((name) => (
        <EditorBadge
          key={name}
          name={name}
          color={colorForEditor(name, editors)}
          size={size}
        />
      ))}
      {list.length > 1 && (
        <span className="multi-editor-flag" title="Multiple editors">
          ×{list.length}
        </span>
      )}
    </span>
  );
}

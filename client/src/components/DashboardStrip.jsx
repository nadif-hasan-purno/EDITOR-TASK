import React from 'react';

const CARDS = [
  { key: 'open', label: 'Open', smart: 'open', tone: 'neutral' },
  { key: 'overdue', label: 'Due today', smart: 'overdue', tone: 'danger' },
  { key: 'dueWeek', label: 'This week', smart: 'due-week', tone: 'warn' },
  { key: 'high', label: 'High priority', smart: 'high', tone: 'hot' },
  { key: 'revision', label: 'In revision', smart: 'revision', tone: 'purple' },
  { key: 'multiEditors', label: 'Multi-editor', smart: 'multi-editors', tone: 'team' },
  { key: 'pinned', label: 'Pinned', smart: 'pinned', tone: 'pin' },
  { key: 'completionRate', label: 'Approved %', smart: '', tone: 'success', suffix: '%' },
];

export default function DashboardStrip({ insights, activeSmart, onSmartChange }) {
  return (
    <section className="dashboard-strip" aria-label="Command center">
      {CARDS.map((card) => {
        const value = insights[card.key] ?? 0;
        const active = card.smart && activeSmart === card.smart;
        const clickable = Boolean(card.smart);

        return (
          <button
            key={card.key}
            type="button"
            className={`dash-card tone-${card.tone}${active ? ' is-active' : ''}${clickable ? '' : ' is-static'}`}
            onClick={() => {
              if (!clickable) return;
              onSmartChange(active ? '' : card.smart);
            }}
            disabled={!clickable}
            title={clickable ? `Filter: ${card.label}` : card.label}
          >
            <span className="dash-label">{card.label}</span>
            <strong className="dash-value">
              {value}{card.suffix || ''}
            </strong>
          </button>
        );
      })}
    </section>
  );
}

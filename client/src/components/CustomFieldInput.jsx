import React from 'react';

export default function CustomFieldInput({ field, onChange, onRemove }) {
  const inputId = `custom-${field._id || field.localId}`;
  const common = {
    id: inputId,
    value: field.value ?? '',
    onChange: (event) => onChange({ ...field, value: event.target.value }),
  };

  let control;
  if (field.type === 'dropdown') {
    control = (
      <select {...common}>
        <option value="">Select an option</option>
        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  } else {
    const type = field.type === 'text' ? 'text' : field.type;
    control = <input {...common} type={type} step={field.type === 'number' ? 'any' : undefined} />;
  }

  return (
    <div className="custom-value-row">
      <label>
        <span>{field.name} <small>({field.type})</small></span>
        {control}
      </label>
      <button className="icon-button" type="button" onClick={onRemove} aria-label={`Remove ${field.name}`}>×</button>
    </div>
  );
}

'use client';

import { useState } from 'react';

export function Text({ label, help, value, onChange, type = 'text', min, max, placeholder }) {
  return <label>{label}{help && <span>{help}</span>}<input type={type} value={value ?? ''} min={min} max={max} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>;
}

export function Area({ label, help, value, onChange, placeholder }) {
  return <label>{label}{help && <span>{help}</span>}<textarea value={value ?? ''} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>;
}

export function Select({ id, label, help, value, onChange, children }) {
  return <label htmlFor={id}>{label}{help && <span>{help}</span>}<select id={id} value={value ?? ''} onChange={event => onChange(event.target.value)}>{children}</select></label>;
}

export function Multi({ label, help, values = [], onChange, options = [] }) {
  const [query, setQuery] = useState('');
  const selected = new Set(values.map(String));
  const search = query.trim().toLowerCase();
  const visibleOptions = options.filter(option => option.name.toLowerCase().includes(search));

  function toggle(id) {
    const key = String(id);
    onChange(selected.has(key)
      ? values.filter(value => String(value) !== key)
      : [...values.map(String), key]);
  }

  function selectVisible() {
    onChange([...new Set([...values.map(String), ...visibleOptions.map(option => String(option.id))])]);
  }

  return (
    <fieldset className="multi-field">
      <legend>{label}{help && <span>{help}</span>}</legend>
      <div className="multi-toolbar">
        <input
          type="search"
          value={query}
          aria-label={`Search ${label}`}
          placeholder={`Search ${label.toLowerCase()}…`}
          onChange={event => setQuery(event.target.value)}
        />
        <span>{selected.size} selected</span>
      </div>
      <div className="multi-actions">
        <button type="button" onClick={selectVisible} disabled={!visibleOptions.length}>Select visible</button>
        <button type="button" onClick={() => onChange([])} disabled={!selected.size}>Clear</button>
      </div>
      <div className="multi-options">
        {visibleOptions.map(option => {
          const id = String(option.id);
          const isSelected = selected.has(id);
          return (
            <label className={`multi-option ${isSelected ? 'selected' : ''}`} key={id}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(id)} />
              {option.colour && option.colour !== '#000000' && <i style={{ background: option.colour }} aria-hidden="true" />}
              <span>{option.name}</span>
            </label>
          );
        })}
        {!visibleOptions.length && <div className="multi-empty">No matching options.</div>}
      </div>
    </fieldset>
  );
}

export function Check({ label, checked, onChange }) {
  return <label className="check"><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} /><span style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', margin: 0 }}>{label}</span></label>;
}

export function ModuleToggle({ label, detail = label, checked, onChange, disabled = false }) {
  const enabled = Boolean(checked);
  return (
    <label className={`module-toggle ${enabled ? 'enabled' : ''} ${disabled ? 'disabled' : ''}`}>
      <span className="module-toggle-copy"><small>Module status</small><strong>{enabled ? 'Enabled' : 'Disabled'}</strong></span>
      <input type="checkbox" checked={enabled} disabled={disabled} aria-label={label} onChange={event => onChange(event.target.checked)} />
      <span className="module-toggle-track" aria-hidden="true"><i /></span>
      <span className="module-toggle-label">{detail}</span>
    </label>
  );
}

export function ChannelSelect({ id, label, value, onChange, channels }) {
  return <Select id={id} label={label} value={value} onChange={onChange}><option value="">Not configured</option>{channels.map(channel => <option value={channel.id} key={channel.id}>#{channel.name}</option>)}</Select>;
}

export function RoleSelect({ label, value, onChange, roles }) {
  return <Select label={label} value={value} onChange={onChange}><option value="">Not configured</option>{roles.map(role => <option value={role.id} key={role.id}>{role.name}</option>)}</Select>;
}

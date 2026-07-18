'use client';

export function Text({ label, help, value, onChange, type = 'text', min, max, placeholder }) {
  return <label>{label}{help && <span>{help}</span>}<input type={type} value={value ?? ''} min={min} max={max} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>;
}

export function Area({ label, help, value, onChange, placeholder }) {
  return <label>{label}{help && <span>{help}</span>}<textarea value={value ?? ''} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>;
}

export function Select({ label, help, value, onChange, children }) {
  return <label>{label}{help && <span>{help}</span>}<select value={value ?? ''} onChange={event => onChange(event.target.value)}>{children}</select></label>;
}

export function Multi({ label, help, values = [], onChange, options }) {
  return <label>{label}{help && <span>{help}</span>}<select multiple value={values} onChange={event => onChange([...event.target.selectedOptions].map(option => option.value))}>{options.map(option => <option value={option.id} key={option.id}>{option.name}</option>)}</select></label>;
}

export function Check({ label, checked, onChange }) {
  return <label className="check"><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} /><span style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', margin: 0 }}>{label}</span></label>;
}

export function ChannelSelect({ label, value, onChange, channels }) {
  return <Select label={label} value={value} onChange={onChange}><option value="">Not configured</option>{channels.map(channel => <option value={channel.id} key={channel.id}>#{channel.name}</option>)}</Select>;
}

export function RoleSelect({ label, value, onChange, roles }) {
  return <Select label={label} value={value} onChange={onChange}><option value="">Not configured</option>{roles.map(role => <option value={role.id} key={role.id}>{role.name}</option>)}</Select>;
}

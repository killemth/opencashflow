import React from 'react';
export default function Select({ value, onChange, options, disabled, className }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={`w-full rounded-xl border px-3 py-2 ${className || ''}`}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

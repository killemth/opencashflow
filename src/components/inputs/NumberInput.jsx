import React from 'react';
export default function NumberInput({ value, onChange, step = 1, min, max, placeholder, className }) {
  return (
    <input type="number" value={value}
      onChange={e => onChange(e.target.value)}
      step={step} min={min} max={max}
      placeholder={placeholder}
      className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring ${className || ''}`} />
  );
}

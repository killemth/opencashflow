import React from 'react';
export default function TextInput({ value, onChange, placeholder }) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring" />
  );
}

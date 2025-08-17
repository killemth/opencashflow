import React from 'react';
export default function ToolbarTabs({ tabs, active, setActive }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(t => (
        <button key={t}
          onClick={() => setActive(t)}
          className={`px-3 py-2 rounded-xl border ${active === t ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

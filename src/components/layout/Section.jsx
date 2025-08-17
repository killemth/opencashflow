import React from 'react';
export default function Section({ title, right, children, className }) {
  return (
    <div className={`bg-white/80 rounded-2xl shadow p-4 sm:p-6 border border-gray-200 ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

import React from 'react';
export default function Table({ headers, rows, getRowClass, getRowProps }) {
  return (
    <div className="overflow-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>{headers.map((h, i) => <th key={i} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isFull = !Array.isArray(r) && r && r.full;
            if (isFull) {
              const cls = r.className || '';
              const extraProps = getRowProps ? (getRowProps(i, r) || {}) : {};
              return (
                <tr key={i} className={cls} {...extraProps}>
                  <td colSpan={headers.length} className="px-3 py-2">{r.content}</td>
                </tr>
              );
            }
            const base = i % 2 ? 'bg-white' : 'bg-gray-50/50';
            const rowClass = getRowClass ? getRowClass(i, r) : base;
            const extraProps = getRowProps ? (getRowProps(i, r) || {}) : {};
            return (
              <tr key={i} className={rowClass || base} {...extraProps}>
                {r.map((c, j) => <td key={j} className="px-3 py-2 align-top whitespace-nowrap">{c}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

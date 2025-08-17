import React from 'react'
export default function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border w-[min(96vw,560px)] max-h-[80vh] overflow-auto">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} title="Close" className="px-2 py-1 rounded hover:bg-gray-100">✖</button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t flex items-center justify-end gap-2 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

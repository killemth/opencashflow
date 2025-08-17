import React, { useEffect, useState } from 'react';
import Section from '../components/layout/Section';
import NumberInput from '../components/inputs/NumberInput';
import { fsSupported, saveHandle, getHandle, clearHandle, writeFile } from '../lib/fileAccess';

export default function SetupPage({ settings, state, setState, monthDays, fileRef, dlRef, exportUrl, exportName, handleImportFile, handleExport, resetAll }) {
  const [linked, setLinked] = useState(null); // FileSystemFileHandle | null
  const [autoSave, setAutoSave] = useState(localStorage.getItem('autoSaveLinkedFile') === 'true');
  const HANDLE_KEY = 'data-file';

  useEffect(() => { (async () => { if (fsSupported()) setLinked(await getHandle(HANDLE_KEY)); })(); }, []);

  useEffect(() => {
    if (!autoSave || !linked) return;
    const payload = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
    writeFile(linked, payload).catch(()=>{});
  }, [state, autoSave, linked]);

  const linkFile = async () => {
    if (!fsSupported()) { alert('File System Access API not supported in this browser.'); return; }
    const handle = await window.showSaveFilePicker({ suggestedName: 'budget-sim.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
    await saveHandle(HANDLE_KEY, handle);
    setLinked(handle);
  };

  const saveNow = async () => {
    if (!linked) { alert('No linked file. Click Link Data File first.'); return; }
    const payload = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
    await writeFile(linked, payload);
    alert('Saved to linked file.');
  };

  const unlink = async () => { await clearHandle(HANDLE_KEY); setLinked(null); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Section title="General Settings" right={<div className="flex gap-2">
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }} />
        <a ref={dlRef} href={exportUrl || "#"} download={exportName} hidden>download</a>
        <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl border">Import</button>
        <button onClick={handleExport} className="px-3 py-2 rounded-xl border">Export</button>
        {exportUrl && <a href={exportUrl} download={exportName} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl border">Download export</a>}
        <button onClick={resetAll} className="px-3 py-2 rounded-xl border">Reset</button>
      </div>}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Year</label>
            <NumberInput value={settings.year} onChange={v => setState(s => ({...s, settings:{...s.settings, year: Number(v)}}))} />
          </div>
          <div>
            <label className="text-sm text-gray-600">Month (1-12)</label>
            <NumberInput value={settings.month} onChange={v => setState(s => ({...s, settings:{...s.settings, month: Math.min(12, Math.max(1, Number(v)))}}))} />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-gray-600">Starting Bank Balance</label>
            <NumberInput value={settings.bankStart} onChange={v => setState(s => ({...s, settings:{...s.settings, bankStart: Number(v)}}))} />
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">Days in month: <span className="font-medium">{monthDays}</span></div>
      </Section>

      <Section title="Linked Data File">
        <div className="text-sm space-y-2">
          <div>Browser support: {fsSupported() ? <span className="text-emerald-700 font-medium">Available</span> : <span className="text-rose-700 font-medium">Unavailable</span>}</div>
          <div>Linked: {linked ? <span className="text-emerald-700 font-medium">Yes</span> : <span className="text-gray-600">No</span>}</div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={linkFile} className="px-3 py-2 rounded-xl border">Link Data File…</button>
            <button onClick={saveNow} className="px-3 py-2 rounded-xl border" disabled={!linked}>Save now</button>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border">
              <input type="checkbox" checked={autoSave} onChange={e=>{ const v=e.target.checked; setAutoSave(v); localStorage.setItem('autoSaveLinkedFile', String(v)); }} disabled={!linked} />
              <span>Auto-save</span>
            </label>
            <button onClick={unlink} className="px-3 py-2 rounded-xl border" disabled={!linked}>Unlink</button>
          </div>
          <div className="text-xs text-gray-600">Note: You will be prompted once to select and grant access to a local file (JSON). Changes will be written directly to that file when Auto-save is enabled or when you click Save now.</div>
        </div>
      </Section>

      <Section title="Tips">
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Use <b>Liabilities</b> to add recurring bills and choose whether they hit the bank or a credit card.</li>
          <li>Set <b>APR</b>, <b>Due Day</b>, and <b>Carry %</b> on each card to control payment size (paid on the due date).</li>
          <li><b>Dashboard</b> shows daily bank balance, cashflow, and card running balances.</li>
          <li>All data is saved to your browser (localStorage). Optionally link a local JSON file for on-disk saves.</li>
        </ul>
      </Section>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import Section from '../components/layout/Section';
import TextInput from '../components/inputs/TextInput';
import NumberInput from '../components/inputs/NumberInput';
import Select from '../components/inputs/Select';
import { LIABILITY_TYPES, LIABILITY_FREQUENCIES } from '../lib/constants';
import { clampDay, daysInMonth, dayLabel } from '../lib/dates';
import { curr } from '../lib/formatters';
import Modal from '../components/layout/Modal';

function resolveCardId(source, cards) {
  if (!source) return null;
  const s = String(source).toLowerCase();
  const byId = cards.find(c => String(c.id).toLowerCase() === s);
  if (byId) return byId.id;
  const byName = cards.find(c => String(c.name).toLowerCase() === s);
  if (byName) return byName.id;
  return null;
}

export default function LiabilitiesPage({ state, setState, settings, sim, dayOptions, addLiab }) {
  const { liabilities: liabs, cards } = state;
  const [liabSort, setLiabSort] = useState({ key: 'day', dir: 'asc' });
  const [loanModal, setLoanModal] = useState({ open: false, id: null });
  const [confirm, setConfirm] = useState({ open:false, onYes: null, text:'' });
  const sortIcon = (key) => liabSort.key !== key ? '' : (liabSort.dir === 'asc' ? '▲' : '▼');

  const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthOptions = monthShort.map((n,i)=>({ label:n, value:i+1 }));
  const freqOptionsShort = [
    { value:'exact', label:'Exact' },
    { value:'daily', label:'Daily' },
    { value:'everyOtherDay', label:'Every other' },
    { value:'weekly', label:'Weekly' },
    { value:'annual', label:'Annual' }
  ];

  const liabsSorted = useMemo(() => {
    const arr = [...(liabs || [])];
    const { key, dir } = liabSort;
    const m = dir === 'asc' ? 1 : -1;
    const freqOrder = { exact: 0, daily: 1, everyOtherDay: 2, weekly: 3 };
    arr.sort((a,b) => {
      const av = a[key];
      const bv = b[key];
      if (key === 'day' || key === 'amount') return ((Number(av)||0) - (Number(bv)||0)) * m;
      if (key === 'frequency') return ((freqOrder[av || 'exact'] || 0) - (freqOrder[bv || 'exact'] || 0)) * m;
      return String(av||'').localeCompare(String(bv||'')) * m;
    });
    return arr;
  }, [liabs, liabSort]);

  const ccDueRows = (cards || []).map(card => {
    const due = clampDay(settings.year, settings.month, card.dueDay);
    const dayEntry = (sim.days || []).find(d => d.day === due);
    const planned = dayEntry?.ccPaymentsPlanned?.[card.id] || 0;
    return { id: `ccDue-${card.id}`, readonly: true, name: `${card.name} — Due Payment (preview)`, typeLabel: 'Credit Card Payment', amount: planned, day: due, frequency: 'exact', sourceLabel: 'Bank Account' };
  });

  const displayRows = [...liabsSorted, ...ccDueRows].sort((a,b)=>{
    const key = liabSort.key;
    const dir = liabSort.dir === 'asc' ? 1 : -1;
    const freqOrder = { exact: 0, daily: 1, everyOtherDay: 2, weekly: 3 };
    const av = a[key];
    const bv = b[key];
    if (key === 'day' || key === 'amount') return ((Number(av)||0) - (Number(bv)||0)) * dir;
    if (key === 'frequency') return ((freqOrder[av || 'exact']||0) - (freqOrder[bv || 'exact']||0)) * dir;
    return String(av||a.name||'').localeCompare(String(bv||b.name||'')) * dir;
  });

  return (
    <Section title="Recurring Liabilities" right={<button onClick={addLiab} className="px-3 py-2 rounded-xl border" title="Add"><span aria-label="add">➕</span></button>}>
      <div className="overflow-auto">
        <table className="min-w-full text-sm border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => setLiabSort(s=>({ key:'name', dir: s.key==='name' && s.dir==='asc' ? 'desc' : 'asc' }))}>Name {sortIcon('name')}</th>
              <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => setLiabSort(s=>({ key:'type', dir: s.key==='type' && s.dir==='asc' ? 'desc' : 'asc' }))}>Type {sortIcon('type')}</th>
              <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => setLiabSort(s=>({ key:'amount', dir: s.key==='amount' && s.dir==='asc' ? 'desc' : 'asc' }))}>Amount {sortIcon('amount')}</th>
              <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => setLiabSort(s=>({ key:'frequency', dir: s.key==='frequency' && s.dir==='asc' ? 'desc' : 'asc' }))}>Frequency {sortIcon('frequency')}</th>
              <th className="text-left px-3 py-2 cursor-pointer select-none" onClick={() => setLiabSort(s=>({ key:'day', dir: s.key==='day' && s.dir==='asc' ? 'desc' : 'asc' }))}>Day {sortIcon('day')}</th>
              <th className="text-left px-3 py-2">Payment Source</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && (
              <tr className="bg-white">
                <td colSpan={7} className="px-3 py-4 text-gray-600">No liabilities yet. Click <b>Add</b> to create one.</td>
              </tr>
            )}
            {displayRows.map((row, idx) => {
              const isReadonly = !!row.readonly;
              if (isReadonly) {
                return (
                  <tr key={row.id} className="opacity-60 bg-gray-50">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.typeLabel}</td>
                    <td className="px-3 py-2">{curr(row.amount)}</td>
                    <td className="px-3 py-2">Exact day</td>
                    <td className="px-3 py-2">{dayLabel(row.day)}</td>
                    <td className="px-3 py-2">{row.sourceLabel}</td>
                    <td className="px-3 py-2 text-gray-400">—</td>
                  </tr>
                );
              }
              const liab = row;
              const paymentOptions = [ { label: 'Bank Account', value: 'Bank' }, ...cards.map(c => ({ label: `${c.name} (credit)`, value: c.id })) ];
              const srcVal = (String(liab.source || '').toLowerCase().startsWith('bank')) ? 'Bank' : (resolveCardId(liab.source, cards) || 'Bank');
              const realIdx = liabs.findIndex(x => x.id === liab.id);
              const isLoan = (liab.type||'').toLowerCase()==='loan';
              return (
                <tr key={liab.id} className={idx % 2 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 min-w-[12rem]"><TextInput value={liab.name} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, name:v}; return {...s, liabilities: ls}; })} /></td>
                  <td className="px-3 py-2 min-w-[12rem] flex items-center gap-2">
                    <Select value={liab.type || 'Living Expense'} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, type:v}; return {...s, liabilities: ls}; })} options={LIABILITY_TYPES.map(t=>({label:t,value:t}))} />
                    {isLoan && (
                      <button className="px-2 py-1 rounded border" title="Manage Loan" onClick={()=>setLoanModal({ open:true, id: liab.id })}>💼</button>
                    )}
                  </td>
                  <td className="px-3 py-2 min-w-[10rem]"><NumberInput value={liab.amount} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, amount:Number(v)}; return {...s, liabilities: ls}; })} /></td>
                  <td className="px-3 py-2 min-w-[10rem]"><Select value={liab.frequency || 'exact'} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, frequency:v}; return {...s, liabilities: ls}; })} options={freqOptionsShort} /></td>
                  <td className="px-3 py-2 min-w-[10rem] flex gap-2 items-center">
                    {liab.frequency === 'annual' && (
                      <Select value={liab.month || settings.month} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, month:Number(v)}; return {...s, liabilities: ls}; })} options={monthOptions} />
                    )}
                    <Select value={liab.day} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, day:Number(v)}; return {...s, liabilities: ls}; })} options={dayOptions} disabled={(liab.frequency||'exact')!=='exact' && (liab.frequency||'exact')!=='annual'} className={(liab.frequency||'exact')!=='exact' && (liab.frequency||'exact')!=='annual' ? 'bg-gray-50 text-gray-400' : ''} />
                  </td>
                  <td className="px-3 py-2 min-w-[14rem]"><Select value={srcVal} onChange={v => setState(s => { const ls=[...s.liabilities]; ls[realIdx] = {...liab, source: v}; return {...s, liabilities: ls}; })} options={paymentOptions} /></td>
                  <td className="px-3 py-2">
                    <button className="px-2 py-1 rounded border" title="Delete" onClick={()=> setConfirm({ open:true, text:`Delete ${liab.name||'item'}?`, onYes: ()=> setState(s => { const ls=[...s.liabilities]; ls.splice(realIdx,1); return {...s, liabilities: ls}; }) })}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Manage Loan Modal */}
      {loanModal.open && (() => {
        const l = liabs.find(x=>x.id===loanModal.id)
        if (!l) return null
        return (
          <Modal open={loanModal.open} title={`Manage Loan — ${l.name||'Loan'}`} onClose={()=>setLoanModal({ open:false, id:null })} footer={[
            <button key="close" onClick={()=>setLoanModal({ open:false, id:null })} className="px-3 py-2 rounded-xl border">Close</button>
          ]}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Origination Date</label>
                <input type="date" value={l.loan?.originationISO || ''} onChange={e=>setState(s=>{ const ls=[...s.liabilities]; const idx=ls.findIndex(x=>x.id===l.id); const loan={...(l.loan||{}), originationISO:e.target.value}; ls[idx]={...l, loan}; return {...s, liabilities:ls}; })} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Term (months)</label>
                <NumberInput value={l.loan?.termMonths || ''} onChange={v=>setState(s=>{ const ls=[...s.liabilities]; const idx=ls.findIndex(x=>x.id===l.id); const loan={...(l.loan||{}), termMonths:Number(v)}; ls[idx]={...l, loan}; return {...s, liabilities:ls}; })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Original Amount</label>
                <NumberInput value={l.loan?.originalAmount || ''} onChange={v=>setState(s=>{ const ls=[...s.liabilities]; const idx=ls.findIndex(x=>x.id===l.id); const loan={...(l.loan||{}), originalAmount:Number(v)}; ls[idx]={...l, loan}; return {...s, liabilities:ls}; })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Rate (APR)</label>
                <NumberInput step={0.0001} value={l.loan?.rate || ''} onChange={v=>setState(s=>{ const ls=[...s.liabilities]; const idx=ls.findIndex(x=>x.id===l.id); const loan={...(l.loan||{}), rate:Number(v)}; ls[idx]={...l, loan}; return {...s, liabilities:ls}; })} />
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* Confirm Modal */}
      <Modal open={confirm.open} title="Confirm Delete" onClose={()=>setConfirm({ open:false, onYes:null, text:'' })} footer={[
        <button key="no" onClick={()=>setConfirm({ open:false, onYes:null, text:'' })} className="px-3 py-2 rounded-xl border">Cancel</button>,
        <button key="yes" onClick={()=>{ confirm.onYes?.(); setConfirm({ open:false, onYes:null, text:'' }) }} className="px-3 py-2 rounded-xl border bg-rose-600 text-white">Delete</button>
      ]}>
        <div className="text-sm text-gray-700">{confirm.text}</div>
      </Modal>
    </Section>
  );
}

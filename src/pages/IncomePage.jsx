import React from 'react';
import Section from '../components/layout/Section';
import TextInput from '../components/inputs/TextInput';
import NumberInput from '../components/inputs/NumberInput';
import Select from '../components/inputs/Select';

export default function IncomePage({ incomes, setState, dayOptions, addIncome, state }) {
  return (
    <>
      <Section title="Recurring Income" right={<button onClick={addIncome} className="px-3 py-2 rounded-xl border">Add</button>}>
        <div className="overflow-auto">
          <table className="min-w-full text-sm border rounded-xl overflow-hidden">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Day</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={4} className="px-3 py-4 text-gray-600">No income entries. Click <b>Add</b> to create one.</td>
                </tr>
              )}
              {incomes.map((inc, idx) => (
                <tr key={inc.id} className={idx % 2 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 min-w-[16rem]"><TextInput value={inc.name} onChange={v => setState(s => { const ls=[...s.incomes]; ls[idx] = {...inc, name:v}; return {...s, incomes: ls}; })} /></td>
                  <td className="px-3 py-2 min-w-[10rem]"><NumberInput value={inc.amount} onChange={v => setState(s => { const ls=[...s.incomes]; ls[idx] = {...inc, amount:Number(v)}; return {...s, incomes: ls}; })} /></td>
                  <td className="px-3 py-2 min-w-[8rem]"><Select value={inc.day} onChange={v => setState(s => { const ls=[...s.incomes]; ls[idx] = {...inc, day:Number(v)}; return {...s, incomes: ls}; })} options={dayOptions} /></td>
                  <td className="px-3 py-2"><button className="px-3 py-2 rounded-xl border" onClick={()=> setState(s => { const ls=[...s.incomes]; ls.splice(idx,1); return {...s, incomes: ls}; })}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Income Modifiers (Raises)">
        <div className="text-sm text-gray-700 space-y-2">
          {(state.incomeModifiers||[]).map((m, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div>
                <label className="text-sm text-gray-600">Effective Date</label>
                <input type="date" value={m.effectiveISO||''} onChange={e=>setState(s=>{ const ms=[...(s.incomeModifiers||[])]; ms[idx]={...m, effectiveISO:e.target.value}; return {...s, incomeModifiers:ms}; })} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Raise %</label>
                <NumberInput step={0.1} value={m.percent||0} onChange={v=>setState(s=>{ const ms=[...(s.incomeModifiers||[])]; ms[idx]={...m, percent:Number(v)}; return {...s, incomeModifiers:ms}; })} />
              </div>
              <div className="md:col-span-2"></div>
              <div>
                <button className="px-3 py-2 rounded-xl border" onClick={()=>setState(s=>{ const ms=[...(s.incomeModifiers||[])]; ms.splice(idx,1); return {...s, incomeModifiers:ms}; })}>Delete</button>
              </div>
            </div>
          ))}
          <button className="px-3 py-2 rounded-xl border" onClick={()=>setState(s=>({ ...s, incomeModifiers:[...(s.incomeModifiers||[]), { effectiveISO:'', percent:0 }] }))}>Add Raise</button>
        </div>
      </Section>

      <Section title="One-time Incomes (Bonuses, Tax Refunds)">
        <div className="text-sm text-gray-700 space-y-2">
          {(state.oneTimeIncomes||[]).map((ot, idx) => (
            <div key={ot.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Name</label>
                <input type="text" value={ot.name||''} onChange={e=>setState(s=>{ const xs=[...(s.oneTimeIncomes||[])]; xs[idx]={...ot, name:e.target.value}; return {...s, oneTimeIncomes:xs}; })} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Type</label>
                <select value={ot.type||'Bonus'} onChange={e=>setState(s=>{ const xs=[...(s.oneTimeIncomes||[])]; xs[idx]={...ot, type:e.target.value}; return {...s, oneTimeIncomes:xs}; })} className="w-full rounded-xl border px-3 py-2">
                  <option>Bonus</option>
                  <option>Tax Refund</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Amount</label>
                <NumberInput value={ot.amount||0} onChange={v=>setState(s=>{ const xs=[...(s.oneTimeIncomes||[])]; xs[idx]={...ot, amount:Number(v)}; return {...s, oneTimeIncomes:xs}; })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Date</label>
                <input type="date" value={ot.dateISO||''} onChange={e=>setState(s=>{ const xs=[...(s.oneTimeIncomes||[])]; xs[idx]={...ot, dateISO:e.target.value}; return {...s, oneTimeIncomes:xs}; })} className="w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <button className="px-3 py-2 rounded-xl border" onClick={()=>setState(s=>{ const xs=[...(s.oneTimeIncomes||[])]; xs.splice(idx,1); return {...s, oneTimeIncomes:xs}; })}>Delete</button>
              </div>
            </div>
          ))}
          <button className="px-3 py-2 rounded-xl border" onClick={()=>setState(s=>({ ...s, oneTimeIncomes:[...(s.oneTimeIncomes||[]), { id: crypto.randomUUID(), name:'One-time Income', type:'Bonus', amount:0, dateISO:'' } ] }))}>Add One-time Income</button>
        </div>
      </Section>
    </>
  );
}

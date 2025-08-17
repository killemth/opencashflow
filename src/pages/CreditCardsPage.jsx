import React from 'react';
import Section from '../components/layout/Section';
import TextInput from '../components/inputs/TextInput';
import NumberInput from '../components/inputs/NumberInput';
import { pct, curr } from '../lib/formatters';

export default function CreditCardsPage({ cards, settings, sim, setState, addCard }) {
  return (
    <Section title="Credit Card Configuration" right={<button onClick={addCard} className="px-3 py-2 rounded-xl border">Add Card</button>}>
      <div className="overflow-auto">
        <table className="min-w-full text-sm border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">APR</th>
              <th className="text-left px-3 py-2">Due Day</th>
              <th className="text-left px-3 py-2">Carry %</th>
              <th className="text-left px-3 py-2">Start Balance</th>
              <th className="text-left px-3 py-2">Min %</th>
              <th className="text-left px-3 py-2">Credit Limit</th>
              <th className="text-left px-3 py-2">Over-limit %</th>
              <th className="text-left px-3 py-2">Min @%</th>
              <th className="text-left px-3 py-2">Planned Pay</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 && (
              <tr className="bg-white"><td colSpan={11} className="px-3 py-4 text-gray-600">No cards yet. Click <b>Add Card</b> to create one.</td></tr>
            )}
            {cards.map((c, idx) => {
              const dueDay = sim.days.find(d => d.day === Math.min(31, Math.max(1, Number(c.dueDay)||1)));
              const prePayBalance = dueDay ? ((dueDay.cardBalances?.[c.id] || 0) + (dueDay.ccPayments?.[c.id] || 0)) : c.startBalance;
              const minPaymentPreview = Math.max(25, (Number.isFinite(Number(c.minPct)) ? Number(c.minPct) : 0.03) * prePayBalance);
              const plannedPaymentPreview = dueDay ? (dueDay.ccPaymentsPlanned?.[c.id] || 0) : 0;
              return (
                <tr key={c.id} className={idx % 2 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 min-w-[12rem]"><TextInput value={c.name} onChange={v => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, name:v}; return {...s, cards: cs}; })} /></td>
                  <td className="px-3 py-2 min-w-[8rem]"><NumberInput step={0.0001} value={c.apr} onChange={v => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, apr:Number(v)}; return {...s, cards: cs}; })} /></td>
                  <td className="px-3 py-2 min-w-[6rem]"><NumberInput value={c.dueDay} onChange={v => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, dueDay:Number(v)}; return {...s, cards: cs}; })} /></td>
                  <td className="px-3 py-2 min-w-[12rem]"><div className="flex items-center gap-2"><input type="range" min={0} max={1} step={0.01} value={c.carryPct} onChange={e => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, carryPct:Number(e.target.value)}; return {...s, cards: cs}; })} className="w-full" /><span className="text-sm w-12 text-right">{pct(c.carryPct)}</span></div></td>
                  <td className="px-3 py-2 min-w-[10rem]"><NumberInput value={c.startBalance} onChange={v => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, startBalance:Number(v)}; return {...s, cards: cs}; })} /></td>
                  <td className="px-3 py-2 min-w-[12rem]"><div className="flex items-center gap-2"><input type="range" min={0} max={0.2} step={0.005} value={c.minPct ?? 0.03} onChange={e => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, minPct:Number(e.target.value)}; return {...s, cards: cs}; })} className="w-full" /><span className="text-sm w-12 text-right">{pct(c.minPct ?? 0.03)}</span></div></td>
                  <td className="px-3 py-2 min-w-[10rem]"><NumberInput value={c.creditLimit ?? 0} onChange={v => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, creditLimit:Number(v)}; return {...s, cards: cs}; })} /></td>
                  <td className="px-3 py-2 min-w-[12rem]"><div className="flex items-center gap-2"><input type="range" min={0} max={1} step={0.05} value={c.overLimitAdhocPct ?? 1.0} onChange={e => setState(s => { const cs=[...s.cards]; cs[idx] = {...c, overLimitAdhocPct:Number(e.target.value)}; return {...s, cards: cs}; })} className="w-full" /><span className="text-sm w-12 text-right">{pct(c.overLimitAdhocPct ?? 1.0)}</span></div></td>
                  <td className="px-3 py-2 min-w-[10rem]">{curr(minPaymentPreview)}</td>
                  <td className="px-3 py-2 min-w-[10rem]">{curr(plannedPaymentPreview)}</td>
                  <td className="px-3 py-2"><button className="px-3 py-2 rounded-xl border" onClick={()=> setState(s => { const cs=[...s.cards]; cs.splice(idx,1); return {...s, cards: cs}; })}>Delete</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

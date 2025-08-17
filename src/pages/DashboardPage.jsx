import React, { useMemo, useState } from 'react';
import Section from '../components/layout/Section';
import Table from '../components/tables/Table';
import { dayLabel } from '../lib/dates';
import { curr } from '../lib/formatters';
import { occursOn, resolveCardId } from '../lib/simulate';
import MonthlySankey from '../components/charts/MonthlySankey';

export default function DashboardPage({ state, settings, sim, horizon, activeYear, activeMonth, isCurrentMonth }) {
  const { cards } = state;
  const [openMap, setOpenMap] = useState(()=>{
    const m = {};
    (horizon?.months||[]).forEach(mon => { m[`${mon.year}-${mon.month}`] = (mon.year===activeYear && mon.month===activeMonth); });
    return m;
  });
  const [rowTooltip, setRowTooltip] = useState(null);
  // Global expand/collapse for all categories' item-level detail
  const [sankeyDetail, setSankeyDetail] = useState(()=>{
    const m = {};
    (horizon?.months||[]).forEach(mon => { m[`${mon.year}-${mon.month}`] = false; });
    return m;
  });
  // Per-category expansion state per month
  const [sankeyExpandedCats, setSankeyExpandedCats] = useState(()=>{
    const m = {};
    (horizon?.months||[]).forEach(mon => { m[`${mon.year}-${mon.month}`] = {}; });
    return m;
  });
  const toggle = (key) => setOpenMap(m => ({ ...m, [key]: !m[key] }));
  const toggleSankey = (key) => setSankeyDetail(m => ({ ...m, [key]: !m[key] }));
  const toggleSankeyCat = (key, type) => setSankeyExpandedCats(prev => {
    const cur = { ...(prev[key] || {}) };
    cur[type] = !cur[type];
    return { ...prev, [key]: cur };
  });
  const setAllCats = (key, on) => setSankeyExpandedCats(prev => {
    const cur = { ...(prev[key] || {}) };
    ['Utility','Subscription','Loan','Living Expense'].forEach(t => { cur[t] = !!on; });
    return { ...prev, [key]: cur };
  });

  const months = horizon?.months || [{ year: settings.year, month: settings.month, ...sim }];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {months.map((monthSim) => {
        const key = `${monthSim.year}-${monthSim.month}`;
        const anyCritical = monthSim.days.some(d => d.underfunded);
        const anyWarn = monthSim.days.some(d => (d.overLimitCards||[]).length>0);
        const dim = monthSim.days.length;
        // Precompute min required per-day for this month
        const plan = new Array(dim + 1).fill(0);
        monthSim.days.forEach(d => { plan[d.day] = Number(d.bankOutPlanned || 0); });
        const prefix = new Array(dim + 1).fill(0);
        for (let i = 1; i <= dim; i++) prefix[i] = prefix[i - 1] + plan[i];
        const incomeDays = Array.from(new Set((state.incomes || []).map(i => Number(i.day)).filter(v => Number.isFinite(v) && v >= 1 && v <= dim))).sort((a,b)=>a-b);
        const nextIncomeAfterDay = (day) => { for (const iday of incomeDays) if (iday > day) return iday; return dim + 1; };
        const minReqToNextIncome = new Array(dim + 1).fill(0);
        for (let d = 1; d <= dim; d++) {
          const nextIncome = nextIncomeAfterDay(d);
          const start = d; // include today
          const end = Math.min(nextIncome - 1, dim);
          minReqToNextIncome[d] = end >= start ? prefix[end] - prefix[start - 1] : 0;
        }

        return (
          <div key={key} className="xl:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">
                {new Date(monthSim.year, monthSim.month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                {anyCritical && <span className="ml-2 text-rose-700">⛔</span>}
                {!anyCritical && anyWarn && <span className="ml-2 text-amber-600">⚠️</span>}
              </h2>
              <button className="px-3 py-1 rounded-lg border" onClick={()=>toggle(key)}>{openMap[key] ? 'Collapse' : 'Expand'}</button>
            </div>
            {openMap[key] && (
              <>
                <Section title="Monthly Flow (Sankey)" right={<div className="flex gap-2"><button className="px-3 py-1 rounded-lg border" onClick={()=>{ const next=!sankeyDetail[key]; setAllCats(key,next); toggleSankey(key); }}>{sankeyDetail[key] ? 'Collapse all' : 'Expand all'}</button></div>} className="xl:col-span-3">
                  {(() => {
                    const expandedTypes = sankeyDetail[key] ? new Set(['Utility','Subscription','Loan','Living Expense']) : new Set(Object.entries(sankeyExpandedCats[key]||{}).filter(([,on])=>!!on).map(([t])=>t));
                    return (
                      <MonthlySankey state={state} monthSim={monthSim} expandedTypes={expandedTypes} onToggleCategory={(t)=>toggleSankeyCat(key,t)} />
                    );
                  })()}
                </Section>

                <Section title="Daily Detail" className="xl:col-span-3">
                  {(() => {
                    const rows = [];
                    const dayIndexByRow = [];
                    let prevUnderfunded = false;

                    monthSim.days.forEach((d, idx) => {
                      // Insert green maturity rows
                      if (Array.isArray(d.loanMaturities) && d.loanMaturities.length > 0) {
                        d.loanMaturities.forEach(m => {
                          rows.push({ full: true, className: 'bg-emerald-50 text-emerald-700 font-medium', content: `Good news: ${m.name} matured today. This saves ${curr(m.monthlyAmountSaved)} monthly going forward.` });
                          dayIndexByRow.push(null);
                        });
                      }

                      if (d.underfunded && !prevUnderfunded) {
                        const nextIncome = nextIncomeAfterDay(d.day);
                        const start = Math.max(d.day, 1);
                        const end = Math.min(nextIncome - 1, dim);
                        const remainingPlanned = end >= start ? prefix[end] - prefix[start - 1] : 0;
                        const startBalance = idx > 0 ? monthSim.days[idx - 1].bankBalance : (idx === 0 ? (idx === 0 ? (state.settings?.bankStart || 0) : 0) : 0);
                        const shortfall = Math.max(0, remainingPlanned - startBalance);
                        rows.push({ full: true, className: 'bg-rose-50 text-rose-700 font-medium', content: `Warning: Bank will go negative on day ${d.day}. You may need ${curr(shortfall)} (loan/transfer) to cover remaining expenses until next income.` });
                        dayIndexByRow.push(null);
                      }
                      prevUnderfunded = !!d.underfunded;

                      const bankInZero = (d.bankIn || 0) === 0;
                      const bankOutZero = (d.bankOut || 0) === 0;
                      const net = d.bankIn - d.bankOut;
                      const netZero = net === 0;
                      const minReq = minReqToNextIncome[d.day] || 0;
                      const minReqZero = minReq === 0;
                      const cardCells = cards.map(c => {
                        const delta = (d.ccNetChange?.[c.id] || 0);
                        const cls = delta === 0 ? 'text-gray-400' : delta < 0 ? 'text-emerald-700' : 'text-rose-700';
                        return <span className={cls}>{curr(delta)}</span>;
                      });
                      const warn2 = (d.overLimitCards || []).length > 0;
                      const critical2 = !!d.underfunded;
                      const dayCell = (
                        <span className={(warn2 || critical2) ? 'inline-flex items-center gap-1' : ''}>
                          {dayLabel(d.day)}
                          {critical2 && <span title="Bank balance goes negative" aria-label="underfunded" className="text-rose-600">⛔</span>}
                          {!critical2 && warn2 && <span title="Card over limit" aria-label="over limit" className="text-amber-600">⚠️</span>}
                        </span>
                      );
                      rows.push([
                        dayCell,
                        <span className={bankInZero ? 'text-gray-400' : ''}>{curr(d.bankIn)}</span>,
                        <span className={bankOutZero ? 'text-gray-400' : ''}>{curr(d.bankOut)}</span>,
                        <span className={netZero ? 'text-gray-400' : net >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{curr(net)}</span>,
                        <span className={minReqZero ? 'text-gray-400 font-medium' : 'font-medium'}>{curr(minReq)}</span>,
                        ...cardCells,
                        <span className={d.bankBalance < 0 ? 'text-rose-700 font-medium' : ''}>{curr(d.bankBalance)}</span>
                      ]);
                      dayIndexByRow.push(idx);
                    });

                    return (
                      <Table
                        headers={["Day","Bank In","Bank Out","Net Cash","Min Req. (to next income)", ...cards.map(c=>c.name), "Bank Balance"]}
                        rows={rows}
                        getRowClass={(i, r) => {
                          if (!Array.isArray(r) && r && r.full) return 'bg-rose-50';
                          const today = new Date();
                          const dayIdx = dayIndexByRow[i];
                          const isActiveMonth = monthSim.year === activeYear && monthSim.month === activeMonth;
                          const isToday = dayIdx != null && isActiveMonth && isCurrentMonth && monthSim.days[dayIdx].day === today.getDate();
                          if (isToday) return 'bg-yellow-50 ring-1 ring-yellow-200';
                          return (i % 2) ? 'bg-white' : 'bg-gray-50/50';
                        }}
                        getRowProps={(i, r) => ({
                          onMouseEnter: (e) => {
                            if (!Array.isArray(r)) return;
                            const dayIdx = dayIndexByRow[i];
                            const d = monthSim.days[dayIdx];
                            const bullets = buildDayBulletsWithContext(state, d, monthSim.year, monthSim.month);
                            const pos = computeTooltipPosition(e);
                            setRowTooltip({ x: pos.x, y: pos.y, bullets });
                          },
                          onMouseMove: (e) => {
                            const pos = computeTooltipPosition(e);
                            setRowTooltip(prev => prev ? { ...prev, x: pos.x, y: pos.y } : null)
                          },
                          onMouseLeave: () => setRowTooltip(null),
                        })}
                      />
                    );
                  })()}
                  {rowTooltip && (
                    <div style={{ position: 'fixed', left: rowTooltip.x, top: rowTooltip.y, zIndex: 50, maxWidth: 320, maxHeight: 240, overflowY: 'auto' }} className="bg-white shadow-xl border rounded-lg p-3 text-xs">
                      <ul className="list-disc pl-4 space-y-1">
                        {rowTooltip.bullets.map((b, idx) => <li key={idx}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                </Section>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function computeTooltipPosition(e) {
  const margin = 12;
  const maxW = 320;
  const estH = 220;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (x + maxW + margin > vw) x = Math.max(margin, vw - maxW - margin);
  if (y + estH + margin > vh) y = Math.max(margin, e.clientY - estH - margin);
  return { x, y };
}

function buildDayBulletsWithContext(state, d, y, m) {
  const bullets = buildDayBullets(state, d, y, m).map(txt => typeof txt === 'string' ? <span>{txt}</span> : txt);
  if ((d.overLimitCards || []).length > 0) {
    const names = (d.overLimitCards||[]).map(id=>state.cards.find(c=>c.id===id)?.name||id).join(', ');
    bullets.unshift(<span className="text-amber-600 font-semibold">Warning · Over limit: {names}</span>);
  }
  if (d.underfunded) {
    bullets.unshift(<span className="text-rose-700 font-semibold">Danger · Bank goes negative this day</span>);
  }
  return bullets;
}

function buildDayBullets(state, d, y, m) {
  const bullets = [];
  const dim = new Date(y, m, 0).getDate();
  // Incomes
  for (const inc of state.incomes || []) {
    if (Number(inc.day) === d.day) bullets.push(`Income · ${inc.name || 'Income'} · +${curr(Number(inc.amount)||0)}`);
  }
  // Liabilities (bank or card)
  for (const liab of state.liabilities || []) {
    if (occursOn(liab, d.day, dim)) {
      const amt = Number(liab.amount) || 0;
      const src = String(liab.source || 'Bank');
      const isBank = src.toLowerCase().startsWith('bank');
      if (isBank) {
        bullets.push(`Bill · ${liab.name || 'Liability'} · -${curr(amt)} (bank)`);
      } else {
        const cid = resolveCardId(src, state.cards || []);
        const cname = (state.cards || []).find(c=>c.id===cid)?.name || src;
        bullets.push(`Bill · ${liab.name || 'Liability'} · +${curr(amt)} → ${cname}`);
      }
    }
  }
  // Card interest and payments
  for (const [id, amt] of Object.entries(d.ccInterest || {})) {
    const cname = (state.cards || []).find(c=>c.id===id)?.name || id;
    bullets.push(`Interest · ${cname} · +${curr(amt||0)}`);
  }
  for (const [id, amt] of Object.entries(d.ccPayments || {})) {
    const cname = (state.cards || []).find(c=>c.id===id)?.name || id;
    bullets.push(`CC Payment · ${cname} · -${curr(amt||0)} (bank)`);
  }
  // Planned vs paid
  for (const [id, p] of Object.entries(d.ccPaymentsPlanned || {})) {
    const paid = (d.ccPayments || {})[id] || 0;
    if (p > 0 && p > paid + 0.005) {
      const cname = (state.cards || []).find(c=>c.id===id)?.name || id;
      bullets.push(`Planned CC Payment (unfunded) · ${cname} · ${curr(p)} planned, ${curr(paid)} paid`);
    }
  }
  return bullets;
}

import React, { useMemo } from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { curr } from '../../lib/formatters';
import { occursOn } from '../../lib/simulate';

export function computeMonthlySankeyData(state, monthSim, expanded) {
  const y = monthSim.year, m = monthSim.month;
  const dim = monthSim.days.length;
  const parseISODateOnly = (s) => { const re=/^\s*(\d{4})-(\d{2})-(\d{2})\s*$/; const mt=re.exec(String(s||'')); if(!mt) return null; return new Date(Number(mt[1]),Number(mt[2])-1,Number(mt[3])); };
  const addMonths = (date,n)=>{ const d=new Date(date); d.setMonth(d.getMonth()+(Number(n)||0)); return d; };
  const types = ['Utility','Subscription','Loan','Living Expense'];
  const expandedTypes = expanded?.expandedTypes instanceof Set ? expanded.expandedTypes : new Set();

  const oneTimeTotal = (state.oneTimeIncomes||[]).reduce((sum,ot)=>{ const d=parseISODateOnly(ot.dateISO); if(!d) return sum; return (d.getFullYear()===y && (d.getMonth()+1)===m) ? sum + (Number(ot.amount)||0) : sum; },0);
  const totalBankIn = monthSim.days.reduce((a,d)=>a+(Number(d.bankIn)||0),0);
  const totalBankOut = monthSim.days.reduce((a,d)=>a+(Number(d.bankOut)||0),0);
  const netSum = totalBankIn - totalBankOut;
  const startBank = (Number(monthSim.endBank)||0) - netSum; // inferred monthly starting bank
  const recurringIncome = Math.max(0, totalBankIn - oneTimeTotal);

  const maturityKeyFor = (liab)=>{ const L=liab.loan; if(!L||!L.originationISO||L.termMonths===undefined||L.termMonths===null) return null; const d=parseISODateOnly(L.originationISO); if(!d) return null; const mat=addMonths(d, Number(L.termMonths)||0); const day=Math.min(Number(liab.day)||1, new Date(mat.getFullYear(), mat.getMonth()+1, 0).getDate()); return mat.getFullYear()*10000 + (mat.getMonth()+1)*100 + day; };
  const keyForDay = (day)=> y*10000 + m*100 + day;

  const byTypeBank = Object.fromEntries(types.map(t=>[t,0]));
  const bankItemTotals = {}; const ccItemTotals = {}; const itemMeta = {}; const ccTypeTotals = Object.fromEntries(types.map(t=>[t,0]));

  for(let d=1; d<=dim; d++){
    for(const liab of (state.liabilities||[])){
      const matKey=maturityKeyFor(liab); const curKey=keyForDay(d); if(matKey&&curKey>matKey) continue;
      const t=types.includes(liab.type)?liab.type:'Living Expense';
      if(!occursOn(liab,d,dim,y,m)) continue; const amt=Number(liab.amount)||0; if(!amt) continue; const id=liab.id; itemMeta[id]=itemMeta[id]||{ name: liab.name||'Item', type:t };
      const isBank=String(liab.source||'').toLowerCase().startsWith('bank');
      if(isBank){ byTypeBank[t]+=amt; bankItemTotals[id]=(bankItemTotals[id]||0)+amt; }
      else { ccItemTotals[id]=(ccItemTotals[id]||0)+amt; ccTypeTotals[t]+=amt; }
    }
  }

  const ccPaymentsTotal = monthSim.days.reduce((a,d)=> a + Object.values(d.ccPayments||{}).reduce((x,v)=>x+(Number(v)||0),0), 0);
  const ccChargedTotal = Object.values(ccTypeTotals).reduce((a,v)=>a+v,0);

  // Color scheme: income greens, savings gray, unfunded deep red, expenses cool blues/purples; credit flows orange
  const colors = {
    recurring: '#16a34a', oneTime: '#22c55e', bank: '#64748b', credit: '#f97316',
    Utility: '#60a5fa', Subscription: '#818cf8', Loan: '#a78bfa', 'Living Expense': '#93c5fd',
    ccPaymentsCat: '#6366f1', deficitUnfunded: '#991b1b', deficitSavings: '#64748b', item: '#94a3b8'
  };

  // Shortfall of monthly outflows vs monthly inflows
  const shortfallAll = Math.max(0, totalBankOut - totalBankIn);
  const savingsAvailable = Math.max(0, startBank);
  const deficitFromSavings = Math.min(shortfallAll, savingsAvailable);
  const requiredStart = Math.max(0, Number(monthSim.requiredStartingBank)||0);
  const unfundedDeficit = Math.max(0, requiredStart - savingsAvailable);

  // Build nodes/links
  const nodes=[]; const idx=new Map(); const addNode=(name,color,extra={})=>{ const i=nodes.length; nodes.push({ name, color, ...extra }); idx.set(name,i); return i; };
  const iRecurring=addNode('Recurring Income',colors.recurring,{kind:'incomeRecurring'});
  const iOneTime=addNode('One-time Income',colors.oneTime,{kind:'incomeOneTime'});
  const iDeficitUnfunded=addNode('Unfunded Deficit',colors.deficitUnfunded,{kind:'deficitUnfunded'});
  const iDeficitSavings=addNode('Deficit from Savings',colors.deficitSavings,{kind:'deficitSavings'});
  const iBank=addNode('Bank',colors.bank,{kind:'bank'});
  const iCredit=addNode('Credit Cards',colors.credit,{kind:'credit'});
  // Invisible anchor so Credit Cards aligns with Bank column (center)
  const iCCAnchor = ccChargedTotal>0 ? addNode('', 'transparent', {kind:'anchor'}) : null;
  const categoryTypes=[...types, 'CC Payment'];
  const catIdx={}; categoryTypes.forEach(t=>{ const color = t==='CC Payment'? colors.ccPaymentsCat : colors[t]; catIdx[t]=addNode(`Cat: ${t}`, color, {kind:'category', categoryType:t}); });

  const links=[];
  // Sources -> bank
  if(recurringIncome>0) links.push({ source:iRecurring, target: iBank, value:recurringIncome, color:colors.recurring });
  if(oneTimeTotal>0) links.push({ source:iOneTime, target: iBank, value:oneTimeTotal, color:colors.oneTime });
  if(deficitFromSavings>0) links.push({ source:iDeficitSavings, target: iBank, value:deficitFromSavings, color:colors.deficitSavings });
  if(unfundedDeficit>0) links.push({ source:iDeficitUnfunded, target: iBank, value:unfundedDeficit, color:colors.deficitUnfunded });
  // Anchor -> Credit Cards (invisible) to push to same column as Bank
  if(iCCAnchor!=null) links.push({ source:iCCAnchor, target:iCredit, value:Math.max(1,ccChargedTotal||1), color:'transparent' });

  // Funding sources -> categories
  // Bank to core categories (bank-paid)
  types.forEach(t=>{ const v=byTypeBank[t]; if(v>0) links.push({ source:iBank, target:catIdx[t], value:v, color:colors[t] }); });
  // Bank to CC Payment category
  if(ccPaymentsTotal>0) links.push({ source:iBank, target:catIdx['CC Payment'], value:ccPaymentsTotal, color:colors.ccPaymentsCat });
  // Credit Cards to categories (card-charged)
  types.forEach(t=>{ const v=ccTypeTotals[t]; if(v>0) links.push({ source:iCredit, target:catIdx[t], value:v, color:colors.credit }); });

  // Category breakdowns for items when expanded
  const itemIdx={};
  const ensureItemNode=(id)=>{ if(!(id in itemIdx)){ const meta=itemMeta[id]; itemIdx[id]=addNode(`Bill: ${meta?.name||'Item'}`, colors.item,{kind:'item'}); } return itemIdx[id]; };

  types.forEach(t=>{
    const expandedT = expandedTypes.has(t);
    if(!expandedT) return;
    // Bank-paid items
    Object.entries(bankItemTotals).forEach(([id,v])=>{ if(itemMeta[id].type!==t || v<=0) return; links.push({ source:catIdx[t], target:ensureItemNode(id), value:v, color:colors[t] }); });
    // Card-charged items
    Object.entries(ccItemTotals).forEach(([id,v])=>{ if((itemMeta[id]?.type||'Living Expense')!==t || v<=0) return; links.push({ source:catIdx[t], target:ensureItemNode(id), value:v, color:colors.credit }); });
  });

  return { nodes, links };
}

function SankeyNode(props){
  const { x, y, width, height, payload, onToggleCategory } = props;
  if (payload?.kind === 'anchor') return null; // hide invisible anchor node
  const fill = payload.color || '#888';
  const pad = 6;
  const rightSide = x > 400;
  const textX = rightSide ? (x - pad) : (x + width + pad);
  const anchor = rightSide ? 'end' : 'start';
  const textY = y + Math.max(10, height/2);
  const handleClick = () => {
    if (payload.kind === 'category' && typeof onToggleCategory === 'function') {
      onToggleCategory(payload.categoryType);
    }
  };
  return (
    <g onClick={handleClick} style={{ cursor: payload.kind === 'category' ? 'pointer' : 'default' }}>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#111" strokeOpacity={0.2} rx={4} ry={4} />
      <text x={textX} y={textY} fill="#0f172a" dominantBaseline="middle" fontSize={12} textAnchor={anchor}>{payload.name}</text>
    </g>
  );
}

function SankeyLink(props){
  const { sourceX, sourceY, targetX, targetY, linkWidth, payload } = props;
  const path = `M${sourceX},${sourceY} C ${(sourceX+targetX)/2},${sourceY} ${(sourceX+targetX)/2},${targetY} ${targetX},${targetY}`;
  return <path d={path} stroke={payload.color || '#999'} strokeOpacity={0.4} fill="none" strokeWidth={Math.max(1, linkWidth)} />;
}

export default function MonthlySankey({ state, monthSim, expandedTypes, onToggleCategory }){
  const data = useMemo(() => computeMonthlySankeyData(state, monthSim, { expandedTypes }), [state, monthSim, expandedTypes]);
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey data={data} nodePadding={20} nodeWidth={18} node={<SankeyNode onToggleCategory={onToggleCategory} />} link={<SankeyLink />}>
          <Tooltip formatter={(v)=>curr(v)} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}

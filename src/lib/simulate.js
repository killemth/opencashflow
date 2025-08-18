import { clampDay, daysInMonth } from './dates';
import { CC_MIN_PAYMENT_DOLLARS, DEFAULT_CC_MIN_PCT, DEFAULT_CC_OVERLIMIT_PCT } from './constants';

// Helpers
const parseISO = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
};
const parseISODateOnly = (s) => {
  if (!s) return null;
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(s);
  if (!m) return parseISO(s);
  const y = Number(m[1]); const mo = Number(m[2]); const da = Number(m[3]);
  return new Date(y, mo - 1, da);
};
const addMonths = (date, n) => { const d = new Date(date); d.setMonth(d.getMonth() + (Number(n)||0)); return d; };
const dateKey = (y,m,d)=> y*10000 + m*100 + d;

export function occursOn(liab, d, dim, y, m) {
  const freq = liab.frequency || 'exact';
  const anchor = Math.min(dim, Math.max(1, Number(liab.day) || 1));
  if (freq === 'daily') return true;
  if (freq === 'everyOtherDay') return d >= anchor && ((d - anchor) % 2 === 0);
  if (freq === 'weekly') return d >= anchor && ((d - anchor) % 7 === 0);
  if (freq === 'annual') {
    const mo = Number(liab.month) || m; // default to evaluated month
    return m === mo && d === anchor;
  }
  return d === anchor;
}

function loanMaturityMap(liabilities) {
  const map = new Map();
  for (const liab of liabilities) {
    if ((liab.type || '').toLowerCase() !== 'loan') continue;
    const L = liab.loan;
    if (!L || !L.originationISO || L.termMonths === undefined || L.termMonths === null) continue;
    const od = parseISODateOnly(L.originationISO);
    if (!od) continue;
    const mat = addMonths(od, Number(L.termMonths)||0);
    const y = mat.getFullYear(); const m = mat.getMonth()+1;
    const d = Math.min(Number(liab.day)||1, daysInMonth(y, m));
    map.set(liab.id, { y, m, d, key: dateKey(y,m,d) });
  }
  return map;
}

export function simulate(state) {
  const { settings, liabilities, incomes, cards, incomeModifiers = [], oneTimeIncomes = [] } = state;
  const year = settings.year, month = settings.month; // 1..12
  const dim = daysInMonth(year, month);

  const maturityById = loanMaturityMap(liabilities);

  const effRaiseFactor = (day) => {
    const cur = new Date(year, month - 1, day).getTime();
    let f = 1;
    for (const m of incomeModifiers) {
      if (!m?.effectiveISO) continue;
      const t = parseISODateOnly(m.effectiveISO)?.getTime();
      if (!isNaN(t) && t <= cur) {
        const raw = Number(m.percent) || 0;
        const pct = raw > 1 ? raw / 100 : raw;
        const pctClamped = Math.max(-0.99, Math.min(10, pct));
        f *= (1 + pctClamped);
      }
    }
    return f;
  };

  const oneTimesByDay = {};
  for (const ot of oneTimeIncomes) {
    if (!ot?.dateISO) continue;
    const d = parseISODateOnly(ot.dateISO);
    if (d && d.getFullYear() === year && (d.getMonth()+1) === month) {
      const day = d.getDate();
      oneTimesByDay[day] = (oneTimesByDay[day] || 0) + (Number(ot.amount)||0);
    }
  }

  // Clone working balances
  let bank = Number(settings.bankStart) || 0;
  const cardMap = Object.fromEntries(cards.map(c => [c.id, { ...c, balance: Number(c.startBalance) || 0, lastPayment: 0, totalInterest: 0 }]));

  const days = [];
  let cumulativeNetBank = 0;
  let maxDrawdown = 0;

  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, month - 1, d);

    let bankIn = 0;
    let bankOut = 0;
    let bankOutPlanned = 0;
    let ccCharges = {};
    let ccPayments = {};
    let ccPaymentsPlanned = {};
    let ccInterest = {};
    let ccNetChange = {};
    let overLimitCards = [];
    let loanMaturities = [];
    let minBank = bank;

    // Recurring incomes with raises
    for (const inc of incomes) {
      if (Number(inc.day) === d) {
        const base = Number(inc.amount) || 0;
        const amt = base * effRaiseFactor(d);
        bank += amt; bankIn += amt;
        if (bank < minBank) minBank = bank;
      }
    }

    // One-time incomes
    if (oneTimesByDay[d]) {
      const amt = oneTimesByDay[d];
      bank += amt; bankIn += amt;
      if (bank < minBank) minBank = bank;
    }

    // Liabilities
    const curKey = dateKey(year, month, d);
    for (const liab of liabilities) {
      let loanActive = true;
      if (maturityById.has(liab.id)) {
        const { key: matKey } = maturityById.get(liab.id);
        if (curKey > matKey) loanActive = false;
        if (curKey === matKey) loanMaturities.push({ id: liab.id, name: liab.name || 'Loan', monthlyAmountSaved: Number(liab.amount)||0 });
      }
      if (loanActive && occursOn(liab, d, dim, year, month)) {
        const amt = Number(liab.amount) || 0;
        const src = liab.source || "Bank";
        if (String(src).toLowerCase().startsWith("bank")) {
          bankOutPlanned += amt;
          bank -= amt; bankOut += amt;
          if (bank < minBank) minBank = bank;
        } else {
          const cid = resolveCardId(src, cards);
          if (cid && cardMap[cid]) {
            cardMap[cid].balance += amt;
            ccCharges[cid] = (ccCharges[cid] || 0) + amt;
          }
        }
      }
    }

    // Over-limit adhoc
    for (const id of Object.keys(cardMap)) {
      const c = cardMap[id];
      const limit = Math.max(0, Number(c.creditLimit) || 0);
      if (limit > 0 && c.balance > limit) {
        overLimitCards.push(id);
        const over = c.balance - limit;
        const pct = Math.max(0, Math.min(1, Number(c.overLimitAdhocPct) ?? DEFAULT_CC_OVERLIMIT_PCT));
        const planned = Math.min(c.balance, over * pct);
        if (planned > 0) {
          bankOutPlanned += planned;
          ccPaymentsPlanned[id] = (ccPaymentsPlanned[id] || 0) + planned;
          const payment = planned;
          bank -= payment; bankOut += payment; c.balance -= payment; c.lastPayment = (c.lastPayment || 0) + payment;
          ccPayments[id] = (ccPayments[id] || 0) + payment;
          if (bank < minBank) minBank = bank;
        }
      }
    }

    // Due-day interest and payments
    for (const id of Object.keys(cardMap)) {
      const c = cardMap[id];
      const due = clampDay(year, month, Number(c.dueDay) || 1);
      if (d === due) {
        const mpr = (Number(c.apr) || 0) / 12;
        const monthInterest = c.balance * mpr;
        if (monthInterest > 0) {
          c.balance += monthInterest;
          c.totalInterest += monthInterest;
          ccInterest[id] = (ccInterest[id] || 0) + monthInterest;
        }
        const carry = Math.max(0, Math.min(1, Number(c.carryPct) || 0));
        const desiredCarryBalance = c.balance * carry;
        const paydownToCarry = Math.max(0, c.balance - desiredCarryBalance);
        const minPct = Number.isFinite(Number(c.minPct)) ? Math.max(0, Math.min(1, Number(c.minPct))) : DEFAULT_CC_MIN_PCT;
        const minPayment = Math.max(CC_MIN_PAYMENT_DOLLARS, minPct * c.balance);
        let planned = Math.min(Math.max(paydownToCarry, minPayment), c.balance);
        if (planned > 0) {
          bankOutPlanned += planned;
          ccPaymentsPlanned[id] = (ccPaymentsPlanned[id] || 0) + planned;
          const payment = planned;
          bank -= payment; bankOut += payment; c.balance -= payment; c.lastPayment = (c.lastPayment || 0) + payment;
          ccPayments[id] = (ccPayments[id] || 0) + payment;
          if (bank < minBank) minBank = bank;
        }
      }
    }

    for (const id of Object.keys(cardMap)) {
      const ch = ccCharges[id] || 0;
      const it = ccInterest[id] || 0;
      const py = ccPayments[id] || 0;
      ccNetChange[id] = ch + it - py;
    }

    cumulativeNetBank += (bankIn - bankOut);
    if (-cumulativeNetBank > maxDrawdown) maxDrawdown = -cumulativeNetBank;

    const underfunded = minBank < 0;

    days.push({
      date, day: d,
      bankIn, bankOut,
      bankBalance: bank,
      ccCharges,
      ccPayments,
      ccNetChange,
      bankOutPlanned,
      ccPaymentsPlanned,
      ccInterest,
      overLimitCards,
      loanMaturities,
      underfunded,
      cardBalances: Object.fromEntries(Object.entries(cardMap).map(([id, c]) => [id, c.balance]))
    });
  }

  const cardsSummary = Object.fromEntries(Object.entries(cardMap).map(([id, c]) => [id, {
    name: c.name,
    endBalance: c.balance,
    totalInterest: c.totalInterest,
    lastPayment: c.lastPayment,
    apr: c.apr,
    dueDay: c.dueDay,
    carryPct: c.carryPct
  }]));

  const endBank = bank;
  const requiredStartingBank = Math.max(0, maxDrawdown);
  return { days, cardsSummary, endBank, requiredStartingBank };
}

export function resolveCardId(source, cards) {
  if (!source) return null;
  const s = String(source);
  const sl = s.toLowerCase();
  const byId = cards.find(c => String(c.id).toLowerCase() === sl);
  if (byId) return byId.id;
  const byName = cards.find(c => String(c.name).toLowerCase() === sl);
  if (byName) return byName.id;
  return null;
}

export function simulateHorizon(state, months = 18) {
  const startYear = state.settings.year;
  const startMonth = state.settings.month;
  let bankStart = Number(state.settings.bankStart) || 0;
  let cardBalances = Object.fromEntries((state.cards || []).map(c => [c.id, Number(c.startBalance) || 0]));

  const monthsOut = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(startYear, startMonth - 1 + i, 1);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const monthState = JSON.parse(JSON.stringify(state));
    monthState.settings = { ...state.settings, year: y, month: m, bankStart };
    monthState.cards = (state.cards || []).map(c => ({ ...c, startBalance: cardBalances[c.id] || 0 }));
    const res = simulate(monthState);
    monthsOut.push({ year: y, month: m, ...res });
    bankStart = res.endBank;
    cardBalances = Object.fromEntries(Object.entries(res.cardsSummary).map(([id, v]) => [id, v.endBalance]));
  }
  return { months: monthsOut };
}

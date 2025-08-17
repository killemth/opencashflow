import React, { useEffect, useMemo, useRef, useState } from "react";
import ToolbarTabs from './components/layout/ToolbarTabs';
import { curr } from './lib/formatters';
import { daysInMonth, now } from './lib/dates';
import { key, SCHEMA_VERSION, LIABILITY_TYPES, DEFAULT_CC_MIN_PCT, DEFAULT_CC_CREDIT_LIMIT, DEFAULT_CC_OVERLIMIT_PCT } from './lib/constants';
import { simulate, simulateHorizon } from './lib/simulate';
import { usePersistentState } from './hooks/usePersistentState';
import DashboardPage from './pages/DashboardPage';
import LiabilitiesPage from './pages/LiabilitiesPage';
import IncomePage from './pages/IncomePage';
import CreditCardsPage from './pages/CreditCardsPage';
import SetupPage from './pages/SetupPage';
import { fsSupported, getHandle, writeFile } from './lib/fileAccess';

// --- Import/Export helpers ---
function normalizeImported(obj) {
  try {
    const payload = obj?.data ? obj.data : obj;
    if (!payload || typeof payload !== 'object') return null;
    const s = JSON.parse(JSON.stringify(payload));
    if (!s.settings || !s.cards || !s.liabilities || !s.incomes) return null;
    // Clamp and coerce
    s.settings.year = Number(s.settings.year) || new Date().getFullYear();
    s.settings.month = Math.min(12, Math.max(1, Number(s.settings.month) || (new Date().getMonth() + 1)));
    s.settings.bankStart = Number(s.settings.bankStart) || 0;
    const withId = (arr) => (arr || []).map(x => ({ id: x.id || crypto.randomUUID(), ...x }));
    const toFreq = (v) => {
      const t = String(v || '').toLowerCase();
      if (t === 'daily') return 'daily';
      if (t === 'weekly') return 'weekly';
      if (t.includes('every') && t.includes('other')) return 'everyOtherDay';
      return 'exact';
    };
    s.liabilities = withId(s.liabilities).map(x => ({
      ...x,
      amount: Number(x.amount) || 0,
      day: Number(x.day) || 1,
      type: LIABILITY_TYPES.includes(x.type) ? x.type : "Living Expense",
      frequency: toFreq(x.frequency),
    }));
    s.incomes = withId(s.incomes).map(x => ({ ...x, amount: Number(x.amount) || 0, day: Number(x.day) || 1 }));
    s.incomeModifiers = (s.incomeModifiers || []).map(x => ({ effectiveISO: x.effectiveISO || '', percent: Number(x.percent) || 0 }));
    s.oneTimeIncomes = withId(s.oneTimeIncomes || []).map(x => ({ id: x.id || crypto.randomUUID(), name: x.name || 'One-time Income', type: x.type || 'Bonus', amount: Number(x.amount)||0, dateISO: x.dateISO || '' }));
    s.cards = withId(s.cards).map(x => ({
      ...x,
      apr: Number(x.apr) || 0,
      dueDay: Number(x.dueDay) || 1,
      carryPct: Math.max(0, Math.min(1, Number(x.carryPct) ?? 0.1)),
      startBalance: Number(x.startBalance) || 0,
      minPct: Math.max(0, Math.min(1, Number(x.minPct) || DEFAULT_CC_MIN_PCT)),
      creditLimit: Math.max(0, Number(x.creditLimit) || DEFAULT_CC_CREDIT_LIMIT),
      overLimitAdhocPct: Math.max(0, Math.min(1, Number(x.overLimitAdhocPct) ?? DEFAULT_CC_OVERLIMIT_PCT)),
    }));
    return s;
  } catch { return null; }
}

function buildExportBlob(state) {
  const payload = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const m = state?.settings?.month, y = state?.settings?.year;
  const name = `budget-sim-${y}-${m}.json`;
  return { url, name };
}

// --- Default state ---
const DEFAULT_STATE = {
  settings: { bankStart: 0, month: now.getMonth() + 1, year: now.getFullYear() },
  liabilities: [],
  incomes: [],
  incomeModifiers: [],
  oneTimeIncomes: [],
  cards: [
    { id:"chase", name:"Chase United", apr: 0.2499, dueDay: 15, carryPct: 0.10, startBalance: 0, minPct: DEFAULT_CC_MIN_PCT, creditLimit: DEFAULT_CC_CREDIT_LIMIT, overLimitAdhocPct: DEFAULT_CC_OVERLIMIT_PCT },
    { id:"cap1",  name:"Capital One",  apr: 0.2499, dueDay: 12, carryPct: 0.10, startBalance: 0, minPct: DEFAULT_CC_MIN_PCT, creditLimit: DEFAULT_CC_CREDIT_LIMIT, overLimitAdhocPct: DEFAULT_CC_OVERLIMIT_PCT },
  ],
};

export default function BudgetApp() {
  const [state, setState] = usePersistentState(DEFAULT_STATE);
  const [tab, setTab] = useState("Dashboard");
  const fileRef = useRef(null);
  const dlRef = useRef(null);
  const [exportUrl, setExportUrl] = useState(null);
  const [exportName, setExportName] = useState("budget-sim.json");

  const { settings } = state;
  const sim = useMemo(() => simulate(state), [state]);
  const horizon = useMemo(() => simulateHorizon(state, 18), [state]);
  const activeYear = settings.year;
  const activeMonth = settings.month;

  const monthDays = daysInMonth(settings.year, settings.month);
  const dayOptions = new Array(monthDays).fill(0).map((_, i) => ({ label: i + 1, value: i + 1 }));

  const addLiab = () => setState(s => ({ ...s, liabilities: [...s.liabilities, { id: crypto.randomUUID(), name: "", type: "Living Expense", amount: 0, day: 1, source: "Bank", frequency: 'exact' }] }));
  const addIncome = () => setState(s => ({ ...s, incomes: [...s.incomes, { id: crypto.randomUUID(), name: "", amount: 0, day: 1 }] }));
  const addCard = () => setState(s => ({ ...s, cards: [...s.cards, { id: crypto.randomUUID(), name: "New Card", apr: 0.2499, dueDay: 15, carryPct: 0.1, startBalance: 0, minPct: DEFAULT_CC_MIN_PCT, creditLimit: DEFAULT_CC_CREDIT_LIMIT, overLimitAdhocPct: DEFAULT_CC_OVERLIMIT_PCT }] }));

  const resetAll = () => { if (confirm("Reset all data to defaults?")) setState(DEFAULT_STATE); };

  const handleExport = () => {
    try {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      const { url, name } = buildExportBlob(state);
      setExportUrl(url);
      setExportName(name);
      requestAnimationFrame(() => { dlRef.current?.click(); });
    } catch (e) { alert("Export failed: " + (e?.message || e)); }
  };

  const handleImportFile = async (file) => {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const normalized = normalizeImported(obj);
      if (!normalized) throw new Error("Invalid file format.");
      setState(normalized);
      alert("Import successful.");
    } catch (e) { alert("Import failed: " + (e?.message || e)); }
  };

  useEffect(() => () => { if (exportUrl) URL.revokeObjectURL(exportUrl); }, [exportUrl]);

  const today = new Date();
  const isCurrentMonth = settings.year === today.getFullYear() && settings.month === (today.getMonth() + 1);

  // Toasts for notifications
  const [toasts, setToasts] = useState([]);
  const pushToast = (text) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2000);
  };

  // Global auto-save to linked file (works across tabs)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!fsSupported()) return;
        const autoFlag = localStorage.getItem('autoSaveLinkedFile') === 'true';
        if (!autoFlag) return;
        const handle = await getHandle('data-file');
        if (!handle) return;
        const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: state }, null, 2);
        await writeFile(handle, payload);
        if (!cancelled) pushToast('Auto-saved to linked file');
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Budget & Daily Balance Planner</h1>
            <p className="text-gray-600">Track recurring income and liabilities, simulate credit-card usage & payments, and see daily cash needs.</p>
          </div>
          <ToolbarTabs tabs={["Dashboard","Liabilities","Income","Credit Cards","Setup"]} active={tab} setActive={setTab} />
        </header>

        {tab === 'Setup' && (
          <SetupPage
            settings={settings}
            state={state}
            setState={setState}
            monthDays={monthDays}
            fileRef={fileRef}
            dlRef={dlRef}
            exportUrl={exportUrl}
            exportName={exportName}
            handleImportFile={handleImportFile}
            handleExport={handleExport}
            resetAll={resetAll}
          />
        )}

        {tab === 'Liabilities' && (
          <LiabilitiesPage
            state={state}
            setState={setState}
            settings={settings}
            sim={sim}
            dayOptions={dayOptions}
            addLiab={addLiab}
          />
        )}

        {tab === 'Income' && (
          <IncomePage
            incomes={state.incomes}
            setState={setState}
            dayOptions={dayOptions}
            addIncome={addIncome}
            state={state}
          />
        )}

        {tab === 'Credit Cards' && (
          <CreditCardsPage
            cards={state.cards}
            settings={settings}
            sim={sim}
            setState={setState}
            addCard={addCard}
          />
        )}

        {tab === 'Dashboard' && (
          <DashboardPage
            state={state}
            settings={settings}
            sim={sim}
            horizon={horizon}
            activeYear={activeYear}
            activeMonth={activeMonth}
            isCurrentMonth={isCurrentMonth}
          />
        )}
      </div>
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2">
          {toasts.map(t => (
            <div key={t.id} className="bg-black text-white/90 px-3 py-2 rounded-lg shadow-lg text-sm">{t.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}

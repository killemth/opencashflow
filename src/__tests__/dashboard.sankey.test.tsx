// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DashboardPage from '../pages/DashboardPage'
import { computeMonthlySankeyData } from '../components/charts/MonthlySankey'

const renderDash = (state, sim) => {
  const horizon = { months: [{ year: 2025, month: 8, ...sim }] }
  render(
    <DashboardPage
      state={state}
      settings={{ year: 2025, month: 8 }}
      sim={sim}
      horizon={horizon}
      activeYear={2025}
      activeMonth={8}
      isCurrentMonth={false}
    />
  )
}

describe('Dashboard Sankey (funding sources and expand/collapse)', () => {
  const baseState = {
    cards: [{ id: 'card1', name: 'Card One', dueDay: 15, apr: 0.2, minPct: 0.03, creditLimit: 5000 }],
    incomes: [],
    liabilities: [
      { id: 'b1', name: 'Rent', type: 'Living Expense', amount: 1000, day: 1, frequency: 'exact', source: 'Bank' },
      { id: 'citem', name: 'Groceries', type: 'Living Expense', amount: 300, day: 5, frequency: 'exact', source: 'card1' },
      { id: 'u1', name: 'Water', type: 'Utility', amount: 50, day: 7, frequency: 'exact', source: 'Bank' },
    ],
  }
  const sim = {
    days: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      bankIn: 0,
      bankOut: 0,
      bankOutPlanned: 0,
      bankBalance: 0,
      ccCharges: {},
      ccPayments: i + 1 === 15 ? { card1: 150 } : {},
      ccInterest: {},
      ccPaymentsPlanned: {},
      ccNetChange: {},
      overLimitCards: [],
      loanMaturities: [],
      underfunded: false,
      cardBalances: {},
    })),
    cardsSummary: {},
    endBank: 0,
    requiredStartingBank: 0,
  }

  it('shows Bank and Credit Cards as separate funding sources', () => {
    renderDash(baseState, sim)
    // Expand month section if not already
    // Button text toggles, ensure content rendered
    expect(screen.getByText('Bank')).toBeTruthy()
    expect(screen.getByText('Credit Cards')).toBeTruthy()
    expect(screen.getByText('Cat: CC Payment')).toBeTruthy()
  })

  it('renders credit-to-category flows (orange) and bank-to-CC Payment', () => {
    renderDash(baseState, sim)
    // Check orange credit flow path exists
    const paths = document.querySelectorAll('path[stroke="#f97316"]')
    expect(paths.length).toBeGreaterThan(0)
    // Bank -> CC Payment exists via category node text existing already
    expect(screen.getByText('Cat: CC Payment')).toBeTruthy()
  })

  it('allows expand/collapse per category and via Expand all', () => {
    renderDash(baseState, sim)
    // Initially collapsed: no Bill nodes
    expect(screen.queryByText(/Bill:/)).toBeNull()
    // Click a category to expand (Utility)
    fireEvent.click(screen.getByText('Cat: Utility'))
    expect(screen.getByText('Bill: Water')).toBeTruthy()
    // Collapse again by clicking
    fireEvent.click(screen.getByText('Cat: Utility'))
    expect(screen.queryByText('Bill: Water')).toBeNull()
    // Expand all
    fireEvent.click(screen.getByText(/Expand all/i))
    expect(screen.getByText('Bill: Rent')).toBeTruthy()
    expect(screen.getByText('Bill: Groceries')).toBeTruthy()
  })
})

describe('Deficit logic (Unfunded vs Savings)', () => {
  const baseState = { cards: [], incomes: [], liabilities: [] };

  const makeDays = (len, def) => Array.from({ length: len }, (_, i) => ({
    day: i + 1,
    bankIn: def.in[i+1]?.in || 0,
    bankOut: def.in[i+1]?.out || 0,
    bankOutPlanned: 0,
    bankBalance: 0,
    ccCharges: {}, ccPayments: {}, ccInterest: {}, ccPaymentsPlanned: {}, ccNetChange: {},
    overLimitCards: [], loanMaturities: [], underfunded: false, cardBalances: {},
  }));

  it('shows Deficit from Savings only when shortfall is covered by starting bank', () => {
    const sim = {
      days: makeDays(30, { in: { 1: { in: 0, out: 200 } } }),
      endBank: 50, // startBank = 50 - (-200) = 250
      requiredStartingBank: 0,
      cardsSummary: {},
    };
    renderDash(baseState, sim);
    // Savings link color is gray (#64748b); unfunded is deep red (#991b1b)
    const savings = document.querySelectorAll('path[stroke="#64748b"]');
    const unfunded = document.querySelectorAll('path[stroke="#991b1b"]');
    expect(savings.length).toBeGreaterThan(0);
    expect(unfunded.length).toBe(0);
    expect(screen.getByText('Deficit from Savings')).toBeTruthy();
  });

  it('shows Unfunded Deficit only when required starting bank exceeds savings', () => {
    const sim = {
      days: makeDays(30, { in: {} }), // no shortfall
      endBank: 0, // startBank = 0
      requiredStartingBank: 500,
      cardsSummary: {},
    };
    renderDash(baseState, sim);
    const unfunded = document.querySelectorAll('path[stroke="#991b1b"]');
    const savings = document.querySelectorAll('path[stroke="#64748b"]');
    expect(unfunded.length).toBeGreaterThan(0);
    // No shortfall, so savings deficit link should not exist
    expect(savings.length).toBe(0);
    expect(screen.getByText('Unfunded Deficit')).toBeTruthy();
  });

  it('renders both links when there is a shortfall and unfunded portion', () => {
    const sim = {
      days: makeDays(30, { in: { 1: { in: 0, out: 500 } } }), // shortfall 500
      endBank: -200, // startBank = -200 - (-500) = 300
      requiredStartingBank: 600, // unfunded 300
      cardsSummary: {},
    };
    renderDash(baseState, sim);
    const savings = document.querySelectorAll('path[stroke="#64748b"]');
    const unfunded = document.querySelectorAll('path[stroke="#991b1b"]');
    expect(savings.length).toBeGreaterThan(0);
    expect(unfunded.length).toBeGreaterThan(0);
  });

  it('no deficits -> no deficit links rendered', () => {
    const sim = {
      days: makeDays(30, { in: { 1: { in: 200, out: 100 } } }), // net positive
      endBank: 200,
      requiredStartingBank: 0,
      cardsSummary: {},
    };
    renderDash(baseState, sim);
    const savings = document.querySelectorAll('path[stroke="#64748b"]');
    const unfunded = document.querySelectorAll('path[stroke="#991b1b"]');
    expect(savings.length).toBe(0);
    expect(unfunded.length).toBe(0);
  });
});

describe('computeMonthlySankeyData basic shape', () => {
  it('returns nodes and links with expected key nodes', () => {
    const state = { cards:[], liabilities:[], incomes:[], oneTimeIncomes:[] }
    const sim = { year:2025, month:8, days: Array.from({length:30},(_,i)=>({day:i+1,bankIn:0,bankOut:0,bankOutPlanned:0,bankBalance:0,ccCharges:{},ccPayments:{},ccInterest:{},ccPaymentsPlanned:{},ccNetChange:{},overLimitCards:[],loanMaturities:[],underfunded:false,cardBalances:{}})), endBank:0, requiredStartingBank:0 }
    const data = computeMonthlySankeyData(state, sim, { expandedTypes:new Set() })
    const names = data.nodes.map(n=>n.name)
    expect(names).toContain('Bank')
    expect(names).toContain('Credit Cards')
    expect(names).toContain('Cat: CC Payment')
  })
})

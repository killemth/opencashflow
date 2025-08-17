// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import React from 'react'
import DashboardPage from '../pages/DashboardPage'

const renderDash = (partial) => {
  const state = partial.state || { liabilities: [], incomes: [], cards: [] }
  const sim = partial.sim
  const horizon = { months: [{ year: partial.year || 2025, month: partial.month || 8, ...sim }] }
  render(<DashboardPage state={state} settings={{}} sim={sim} horizon={horizon} activeYear={2025} activeMonth={8} isCurrentMonth={false} />)
}

describe('Dashboard UI', () => {
  it('shows danger icon on underfunded day and inserts warning row', () => {
    const sim = {
      days: [
        { day: 1, bankIn: 0, bankOut: 100, bankBalance: -100, bankOutPlanned: 100, ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:[], loanMaturities:[], underfunded: true, cardBalances:{} },
        { day: 2, bankIn: 0, bankOut: 0, bankBalance: -100, bankOutPlanned: 0, ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:[], loanMaturities:[], underfunded: true, cardBalances:{} },
        { day: 3, bankIn: 0, bankOut: 0, bankBalance: -100, bankOutPlanned: 0, ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:[], loanMaturities:[], underfunded: false, cardBalances:{} },
      ],
      cardsSummary: {}, endBank: -100, requiredStartingBank: 100
    }
    renderDash({ sim })
    // Danger icon visible
    expect(screen.getAllByLabelText('underfunded').length).toBeGreaterThan(0)
    // Warning row present (full-width red row)
    const rows = screen.getAllByRole('row')
    const warningRow = rows.find(r => r.className.includes('bg-rose-50'))
    expect(warningRow).toBeTruthy()
  })

  it('shows green maturity row when loan matures', () => {
    const sim = {
      days: [
        { day: 5, bankIn: 0, bankOut: 0, bankBalance: 0, bankOutPlanned: 0, ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:[], loanMaturities:[{ id:'l1', name:'Car', monthlyAmountSaved:200 }], underfunded: false, cardBalances:{} },
        { day: 6, bankIn: 0, bankOut: 0, bankBalance: 0, bankOutPlanned: 0, ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:[], loanMaturities:[], underfunded: false, cardBalances:{} },
      ],
      cardsSummary: {}, endBank: 0, requiredStartingBank: 0
    }
    renderDash({ sim })
    const rows = screen.getAllByRole('row')
    const greenRow = rows.find(r => r.className.includes('bg-emerald-50'))
    expect(greenRow).toBeTruthy()
    expect(within(greenRow).getByText(/matured today/i)).toBeTruthy()
  })

  it('shows tooltip with Danger and Warning context on hover', () => {
    const state = { cards:[{ id:'c1', name:'Card1' }] }
    const sim = {
      days: [
        { day: 1, bankIn: 0, bankOut: 0, bankBalance: -10, bankOutPlanned: 0, ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:['c1'], loanMaturities:[], underfunded: true, cardBalances:{} },
      ],
      cardsSummary: {}, endBank: -10, requiredStartingBank: 10
    }
    renderDash({ sim, state })
    const rows = screen.getAllByRole('row')
    const dayRow = rows.find(r => /01/.test(r.textContent || ''))
    expect(dayRow).toBeTruthy()
    fireEvent.mouseEnter(dayRow, { clientX: 100, clientY: 100 })
    expect(screen.getByText(/Danger · Bank goes negative/i)).toBeTruthy()
    expect(screen.getByText(/Warning · Over limit: Card1/i)).toBeTruthy()
  })
})

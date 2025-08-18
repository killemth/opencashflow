// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DashboardPage from '../pages/DashboardPage'

const hoverDay = async (label) => {
  const rows = screen.getAllByRole('row')
  const row = rows.find(r => (r.textContent||'').includes(label))
  expect(row).toBeTruthy()
  fireEvent.mouseEnter(row, { clientX: 100, clientY: 100 })
}

describe('Dashboard tooltips include annual liabilities', () => {
  it('shows annual liability on specified month/day in tooltip', async () => {
    const state = {
      liabilities:[{ id:'l1', name:'Insurance', type:'Subscription', amount:600, day:10, month:8, frequency:'annual', source:'Bank' }],
      incomes:[], cards:[]
    }
    const sim = {
      year:2025, month:8,
      days: Array.from({ length: 31 }, (_, i) => ({
        day: i + 1, bankIn:0, bankOut: i+1===10?600:0, bankOutPlanned: i+1===10?600:0, bankBalance:0,
        ccCharges:{}, ccPayments:{}, ccInterest:{}, ccPaymentsPlanned:{}, ccNetChange:{}, overLimitCards:[], loanMaturities:[], underfunded:false, cardBalances:{}
      })),
      cardsSummary:{}, endBank:0, requiredStartingBank:0
    }
    const horizon = { months: [{ year:2025, month:8, ...sim }] }
    render(<DashboardPage state={state} settings={{year:2025, month:8}} sim={sim} horizon={horizon} activeYear={2025} activeMonth={8} isCurrentMonth={false} />)
    await hoverDay('10')
    expect(screen.getByText(/Bill · Insurance · -\$600\.00/)).toBeTruthy()
  })
})

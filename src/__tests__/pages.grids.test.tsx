// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import LiabilitiesPage from '../pages/LiabilitiesPage'
import IncomePage from '../pages/IncomePage'
import CreditCardsPage from '../pages/CreditCardsPage'

const noop = ()=>{}

describe('grids render', () => {
  it('Liabilities grid shows rows and loan details card', async () => {
    const state = { liabilities:[{ id:'l1', name:'Car', type:'Loan', amount:100, day:5, source:'Bank', loan:{ originationISO:'2025-01-01', termMonths:12 } }], cards:[], incomes:[] }
    render(<LiabilitiesPage state={state} setState={noop} settings={{year:2025,month:8}} sim={{ days:[], cardsSummary:{} }} dayOptions={[{label:1,value:1}]} addLiab={noop} />)
    await (await import('react-dom/test-utils')).act(async () => { screen.getByTitle('Manage Loan').click() })
    // modal title should render
    expect(screen.getByText(/Manage Loan/i)).toBeTruthy()
  })

  it('Income grid shows raises and one-time sections', () => {
    const state = { incomeModifiers:[{ effectiveISO:'2025-01-01', percent:3 }], oneTimeIncomes:[{ id:'ot1', name:'Bonus', type:'Bonus', amount:500, dateISO:'2025-08-20' }], incomes:[] }
    render(<IncomePage incomes={[]} setState={noop} dayOptions={[{label:1,value:1}]} addIncome={noop} state={state} />)
    expect(screen.getByText(/Income Modifiers/i)).toBeTruthy()
    expect(screen.getByText(/One-time Incomes/i)).toBeTruthy()
  })

  it('Credit cards grid renders', () => {
    const cards=[{ id:'c1', name:'Card1', apr:0.2, dueDay:15, carryPct:0.1, startBalance:0, minPct:0.03, creditLimit:5000, overLimitAdhocPct:1 }]
    render(<CreditCardsPage cards={cards} settings={{year:2025,month:8}} sim={{ days:[], cardsSummary:{} }} setState={noop} addCard={noop} />)
    expect(screen.getByText(/Credit Card Configuration/i)).toBeTruthy()
  })
})

// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import NumberInput from '../components/inputs/NumberInput'
import TextInput from '../components/inputs/TextInput'
import Select from '../components/inputs/Select'

describe('inputs', () => {
  it('NumberInput calls onChange with value', () => {
    const onChange = vi.fn()
    render(<NumberInput value={1} onChange={onChange} />)
    const inp = screen.getByRole('spinbutton')
    fireEvent.change(inp, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('TextInput updates', () => {
    const onChange = vi.fn()
    render(<TextInput value={'abc'} onChange={onChange} />)
    const inp = screen.getByDisplayValue('abc')
    fireEvent.change(inp, { target: { value: 'abcd' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('Select renders options and fires onChange', () => {
    const onChange = vi.fn()
    render(<Select value={1} onChange={onChange} options={[{label:'One', value:1},{label:'Two', value:2}]} />)
    expect(screen.getByText('One')).toBeTruthy()
    const sel = screen.getByRole('combobox')
    fireEvent.change(sel, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalled()
  })
})

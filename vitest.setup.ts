import '@testing-library/jest-dom'
import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

beforeAll(() => {
  // expose user on screen for simple usage in tests
  // @ts-ignore
  ;(global as any).screen = require('@testing-library/react').screen
  // @ts-ignore
  ;(global as any).within = require('@testing-library/react').within
  // @ts-ignore
  ;(global as any).user = userEvent.setup()
  // Polyfill ResizeObserver for recharts ResponsiveContainer
  // @ts-ignore
  if (typeof (global as any).ResizeObserver === 'undefined') {
    // @ts-ignore
    ;(global as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  // Provide non-zero element sizes so recharts ResponsiveContainer can compute dimensions
  const width = 800; const height = 320;
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return width; } });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return height; } });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return width; } });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return height; } });
  // @ts-ignore
  HTMLElement.prototype.getBoundingClientRect = function(){ return { x:0, y:0, width, height, top:0, left:0, right:width, bottom:height, toJSON(){ return this } }; } as any
})

afterEach(() => cleanup())

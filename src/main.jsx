import React from 'react'
import { createRoot } from 'react-dom/client'
import BudgetApp from './BudgetApp.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BudgetApp />
  </React.StrictMode>
)

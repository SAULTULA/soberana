import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/variables.css'
import './styles/global.css'
import { LicenseGuard } from './features/license/LicenseGuard.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LicenseGuard>
      <App />
    </LicenseGuard>
  </React.StrictMode>,
)

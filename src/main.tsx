import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.comprehensive.tsx'
import './index.css'

// Ensure React is available globally for production builds
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
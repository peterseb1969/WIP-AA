import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { fetchAppConfig } from './lib/app-config'
import { setNamespace } from './lib/constants'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

// The namespace must be known before anything queries WIP, so render
// nothing until the server's runtime config has arrived — and fail loud
// rather than guess a default if it can't be loaded.
fetchAppConfig()
  .then((config) => {
    if (!config.namespace) throw new Error('the server has no WIP namespace configured (WIP_NAMESPACE)')
    setNamespace(config.namespace)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch((err: unknown) => {
    root.render(
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="max-w-md rounded-md border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">Cannot load app configuration</p>
          <p className="mt-1 text-sm text-red-600">{err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>,
    )
  })

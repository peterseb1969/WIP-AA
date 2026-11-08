import { createWipClient } from '@wip/client'
import { QueryClient } from '@tanstack/react-query'

// BASE_URL mirrors Vite's config.base: '/', because the app is served at the
// root of its own origin. Prefixing keeps every call relative to the app,
// so it stays on the app's origin, where the gateway routes it to this app.
export const wipClient = createWipClient({
  baseUrl: `${import.meta.env.BASE_URL}wip`,
  // No auth needed — the Express proxy injects the API key
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
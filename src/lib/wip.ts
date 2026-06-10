import { createWipClient } from '@wip/client'
import { QueryClient } from '@tanstack/react-query'

// BASE_URL mirrors Vite's config.base (always ends with '/') — '/' in local
// dev, '/apps/aa/' behind the wip-deploy gateway. Prefixing keeps proxy
// calls on the app's own path so Caddy routes them back to this app.
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

/** The WIP namespace for this book */
export const WIP_NAMESPACE = 'aa'

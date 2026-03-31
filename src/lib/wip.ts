import { createWipClient } from '@wip/client'
import { QueryClient } from '@tanstack/react-query'

export const wipClient = createWipClient({
  baseUrl: '/wip',
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

import { useTerms } from '@wip/react'
import { NAMESPACE } from './constants'

type TermsParams = NonNullable<Parameters<typeof useTerms>[1]>

/**
 * `useTerms` in the book's namespace. A terminology given by value
 * (`TERMINOLOGIES.*`) resolves only within a namespace, and the deployment
 * key spans every namespace, so the namespace must travel with the request.
 * @wip/react's `useTerms` passes its params to the API unchanged (and into
 * its query key), but its params type has no `namespace` field, unlike
 * `useTerminologies`. This is the one place that widens it.
 */
export function useBookTerms(terminology: string, params: TermsParams = {}) {
  return useTerms(terminology, { ...params, namespace: NAMESPACE } as TermsParams)
}

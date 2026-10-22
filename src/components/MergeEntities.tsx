import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useWipClient } from '@wip/react'
import { useQueryClient } from '@tanstack/react-query'
import { Merge, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { TEMPLATES } from '../lib/constants'
import { planMerge, executeMerge, checkScenes, type MergeKind, type MergePlan } from '../lib/mergeEntities'
import { sceneTitleShown } from '../lib/titles'

/** Selection state for "merge mode" on a list page. */
export function useMergeSelection() {
  const [active, setActive] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  return {
    active,
    selected,
    start: () => { setActive(true); setSelected([]) },
    cancel: () => { setActive(false); setSelected([]) },
    toggle: (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    isSelected: (id: string) => selected.includes(id),
  }
}

/** Header controls: "Merge…" to start, then the selection count, Merge (n) and Cancel. */
export function MergeToolbar({ selection, total, onMerge }: {
  selection: ReturnType<typeof useMergeSelection>
  total: number
  onMerge: () => void
}) {
  const { t } = useTranslation()
  if (total < 2) return null
  if (!selection.active) {
    return (
      <button
        onClick={selection.start}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-text-muted rounded-lg hover:border-primary hover:text-primary transition-colors"
      >
        <Merge className="w-4 h-4" />
        {t('merge.start')}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">{t('merge.select_hint', { count: selection.selected.length })}</span>
      <button
        onClick={onMerge}
        disabled={selection.selected.length < 2}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
      >
        <Merge className="w-4 h-4" />
        {t('merge.merge_n', { count: selection.selected.length })}
      </button>
      <button onClick={selection.cancel} className="px-2 py-1.5 text-sm text-text-muted hover:text-text">{t('common.cancel')}</button>
    </div>
  )
}

/** Selection ring + tick for a card in merge mode. */
export function selectedCardClass(selected: boolean) {
  return selected ? 'ring-2 ring-primary ring-offset-2' : ''
}

const TEMPLATE_GROUP: Record<string, string> = {
  [TEMPLATES.EVENT]: 'scenes',
  [TEMPLATES.CHAPTER]: 'chapters',
  [TEMPLATES.PLOT_THREAD]: 'plot_threads',
  [TEMPLATES.NOTE]: 'notes',
  [TEMPLATES.WORLD_RULE]: 'world_rules',
  [TEMPLATES.CHARACTER]: 'characters',
}

/**
 * Merge two or more entries of one kind into the one the writer keeps.
 * Shows exactly what will change before anything is written.
 */
export function MergeEntitiesDialog({ kind, candidates, onClose, onMerged }: {
  kind: MergeKind
  /** The selected entries, with the name to show for each. */
  candidates: Array<{ documentId: string; name: string }>
  onClose: () => void
  onMerged: () => void
}) {
  const { t } = useTranslation()
  const wip = useWipClient()
  const queryClient = useQueryClient()
  // Like the import's merge: the longest name is kept unless the writer picks another.
  const [survivorId, setSurvivorId] = useState(
    () => [...candidates].sort((a, b) => b.name.length - a.name.length)[0]!.documentId,
  )
  const [plan, setPlan] = useState<MergePlan | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'review' | 'running' | 'done' | 'failed'>('review')
  const [step, setStep] = useState('')
  const [runError, setRunError] = useState<string | null>(null)
  const [scenesWithSuggestions, setScenesWithSuggestions] = useState<Array<{ id: string; title: string; suggestions: number }>>([])

  // Keyed on the ids: the parent passes a new array on every render.
  const candidateKey = candidates.map((c) => c.documentId).join(',')
  useEffect(() => {
    let current = true
    setPlan(null)
    setPlanError(null)
    planMerge(wip, kind, survivorId, candidateKey.split(',').filter((id) => id !== survivorId))
      .then((p) => { if (current) setPlan(p) })
      .catch((err) => { if (current) setPlanError(err instanceof Error ? err.message : String(err)) })
    return () => { current = false }
  }, [wip, kind, survivorId, candidateKey])

  const counts = new Map<string, number>()
  for (const c of plan?.changes ?? []) {
    const group = TEMPLATE_GROUP[c.template] ?? 'other'
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  const survivorName = candidates.find((c) => c.documentId === survivorId)?.name ?? ''

  const run = async () => {
    if (!plan) return
    setPhase('running')
    setRunError(null)
    try {
      await executeMerge(wip, plan, setStep)
      setStep('check')
      const sceneIds = plan.changes.filter((c) => c.template === TEMPLATES.EVENT).map((c) => c.documentId)
      setScenesWithSuggestions(sceneIds.length ? await checkScenes(wip, sceneIds) : [])
      await queryClient.invalidateQueries()
      setPhase('done')
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err))
      setPhase('failed')
      await queryClient.invalidateQueries()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={phase === 'running' ? undefined : onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="merge-entities-title" className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-4">
          <Merge className="w-5 h-5 text-primary mr-2" />
          <h3 id="merge-entities-title" className="text-lg font-semibold text-text">{t(`merge.title_${kind}`)}</h3>
          {phase !== 'running' ? (
            <button onClick={phase === 'done' ? onMerged : onClose} className="ml-auto p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
          ) : null}
        </div>

        {phase === 'review' ? (
          <>
            <div className="text-sm font-medium text-text mb-2">{t('merge.keep')}</div>
            <div className="space-y-1.5 mb-4">
              {candidates.map((c) => (
                <label key={c.documentId} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${survivorId === c.documentId ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="survivor" checked={survivorId === c.documentId} onChange={() => setSurvivorId(c.documentId)} />
                  <span className="text-sm text-text">{c.name}</span>
                  {survivorId !== c.documentId ? <span className="ml-auto text-xs text-text-light">{t('merge.absorbed')}</span> : null}
                </label>
              ))}
            </div>

            <div className="rounded-lg bg-surface p-3 text-sm mb-4">
              <div className="font-medium text-text mb-1.5">{t('merge.will_change', { name: survivorName })}</div>
              {planError ? (
                <div className="text-red-600">{planError}</div>
              ) : !plan ? (
                <div className="flex items-center gap-2 text-text-muted"><Loader2 className="w-4 h-4 animate-spin" />{t('merge.planning')}</div>
              ) : (
                <ul className="space-y-0.5 text-text-muted list-disc pl-5">
                  {[...counts.entries()].map(([group, n]) => (
                    <li key={group}>{t(`merge.refs_${group}`, { count: n })}</li>
                  ))}
                  {plan.images.length ? <li>{t('merge.images', { count: plan.images.length })}</li> : null}
                  {Object.keys(plan.survivorPatch).filter((f) => f !== 'relationships').length ? (
                    <li>{t('merge.fills', { fields: Object.keys(plan.survivorPatch).filter((f) => f !== 'relationships').join(', ') })}</li>
                  ) : null}
                  {plan.survivorPatch.relationships ? <li>{t('merge.relationships')}</li> : null}
                  <li>{t('merge.aliases', { count: plan.absorbed.length, names: plan.absorbed.map((a) => a.term.label || a.term.value).join(', ') })}</li>
                  {!counts.size && !plan.images.length ? <li>{t('merge.no_references')}</li> : null}
                </ul>
              )}
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{t('merge.warning', { name: survivorName })}</span>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200 transition-colors">{t('common.cancel')}</button>
              <button onClick={run} disabled={!plan}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                {t('merge.confirm', { count: candidates.length })}
              </button>
            </div>
          </>
        ) : phase === 'running' ? (
          <div className="flex items-center gap-2 text-sm text-text-muted py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            {step.startsWith('references:')
              ? t('merge.step_references', { progress: step.split(':')[1] })
              : t(`merge.step_${step || 'survivor'}`)}
          </div>
        ) : phase === 'failed' ? (
          <>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{t('merge.failed', { message: runError })}</div>
            <div className="flex justify-end"><button onClick={onMerged} className="px-4 py-2 text-sm font-medium bg-gray-100 text-text-muted rounded-lg hover:bg-gray-200">{t('common.close')}</button></div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-text mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              {t('merge.done', { name: survivorName })}
            </div>
            <div className="text-sm text-text-muted mb-2">
              {t('merge.checked', { count: plan?.changes.filter((c) => c.template === TEMPLATES.EVENT).length ?? 0 })}
              {' '}
              {t('merge.suggestions', { count: scenesWithSuggestions.reduce((n, s) => n + s.suggestions, 0) })}
            </div>
            {scenesWithSuggestions.length ? (
              <ul className="mb-4 space-y-1">
                {scenesWithSuggestions.map((s) => (
                  <li key={s.id}>
                    <Link to={`/scenes?id=${s.id}`} className="text-sm text-primary hover:underline">{sceneTitleShown(s.title)}</Link>
                    <span className="text-xs text-text-light ml-2">{t('merge.suggestions', { count: s.suggestions })}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex justify-end"><button onClick={onMerged} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark">{t('common.close')}</button></div>
          </>
        )}
      </div>
    </div>
  )
}

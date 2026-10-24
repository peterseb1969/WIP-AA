import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpenText, Download, FileDown, FileText, FileType, Hash, TabletSmartphone } from 'lucide-react'

// Vite BASE_URL always ends in '/'. '/' in dev, '/apps/aa/' behind the gateway.
const EXPORT_API = `${import.meta.env.BASE_URL}api/export`

// `id` names the strings; `format` and `query` make the download URL.
const FORMATS = [
  { id: 'docx_manuscript', format: 'docx', query: '&style=manuscript', icon: FileType },
  { id: 'docx_reading', format: 'docx', query: '&style=reading', icon: BookOpenText },
  { id: 'epub', format: 'epub', query: '', icon: TabletSmartphone },
  { id: 'md', format: 'md', query: '', icon: Hash },
  { id: 'txt', format: 'txt', query: '', icon: FileText },
] as const

export default function ExportPage() {
  const { t, i18n } = useTranslation()
  const [sceneTitles, setSceneTitles] = useState(false)

  // The words the export adds ("Chapter", "by") follow the UI language.
  const lang = i18n.language?.startsWith('de') ? 'de' : 'en'
  const href = (format: string, query: string) => `${EXPORT_API}/${format}?lang=${lang}${sceneTitles ? '&scene_titles=1' : ''}${query}`

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <FileDown className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-text">{t('export.title')}</h1>
      </div>
      <p className="text-sm text-text-muted mb-6">{t('export.description')}</p>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-text mb-3">{t('export.options')}</h2>
        <label className="flex items-start gap-2 text-sm text-text">
          <input type="checkbox" className="mt-0.5" checked={sceneTitles} onChange={(e) => setSceneTitles(e.target.checked)} />
          <span>
            {t('export.scene_titles')}
            <span className="block text-xs text-text-muted">{t('export.scene_titles_hint')}</span>
          </span>
        </label>
      </div>

      <div className="space-y-3">
        {FORMATS.map(({ id, format, query, icon: Icon }) => (
          <div key={id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
            <Icon className="w-5 h-5 text-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text">{t(`export.format_${id}`)}</div>
              <div className="text-xs text-text-muted">{t(`export.format_${id}_hint`)}</div>
            </div>
            <a
              href={href(format, query)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
              aria-label={t('export.download_format', { format: t(`export.format_${id}`) })}
            >
              <Download className="w-4 h-4" />
              {t('export.download')}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

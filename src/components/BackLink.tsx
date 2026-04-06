import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackLink() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate('/')
        }
      }}
      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary mb-4 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {t('common.back')}
    </button>
  )
}

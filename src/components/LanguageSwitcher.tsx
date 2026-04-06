import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English' },
] as const

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleChange = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('aa-language', lng)
  }

  if (LANGUAGES.length <= 1) return null

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full text-xs bg-primary-light text-white/80 border border-primary-light rounded px-2 py-1.5 focus:outline-none"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  )
}

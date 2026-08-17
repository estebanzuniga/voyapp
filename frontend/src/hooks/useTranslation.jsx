import { createContext, useContext, useMemo } from 'react'
import { LOCALE_BY_LANGUAGE, translations } from '../i18n/translations'
import { useAuth } from './useAuth'

const TranslationContext = createContext(null)

// Language lives on the logged-in user (`user.language`, same shape as
// `avatarColor`) - this provider just reads it off `useAuth()` rather than
// keeping its own copy of state, so there's nothing to keep in sync: the
// moment ProfilePage's `updateLanguage` mutation resolves and calls
// `updateUser({ language })`, every `t()` call re-renders with the new
// strings for free. Logged-out pages (login/signup/forgot-password) have no
// `user` yet, so they fall back to English.
export function TranslationProvider({ children }) {
  const { user } = useAuth()
  const language = user?.language === 'es' ? 'es' : 'en'
  const locale = LOCALE_BY_LANGUAGE[language]

  const value = useMemo(() => {
    const dictionary = translations[language]

    // `params` fills in `{token}` placeholders in the template, e.g.
    // t('dayCard.editAria', { name: stop.name }) -> "Edit Eiffel Tower".
    // Falls back to the English string (then the raw key) if a translation
    // is ever missing, so a typo'd/forgotten key shows up as odd English
    // text instead of a blank UI.
    function t(key, params) {
      const template = dictionary[key] ?? translations.en[key] ?? key
      if (!params) return template
      return template.replace(/\{(\w+)\}/g, (_match, name) => params[name] ?? '')
    }

    return { t, language, locale }
  }, [language, locale])

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}

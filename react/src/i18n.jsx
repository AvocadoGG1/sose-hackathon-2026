import { createContext, useContext, useEffect, useState } from 'react'
import { LANGUAGES } from './translations.js'

const LanguageContext = createContext(null)

function getSavedLanguage() {
  try {
    const stored = localStorage.getItem('lang')
    if (LANGUAGES.some((lang) => lang.code === stored)) return stored
  } catch {
    // localStorage unavailable - fall back to English
  }
  return 'en'
}

export function LanguageProvider({ children }) {
  const [code, setCode] = useState(getSavedLanguage)

  useEffect(() => {
    // screen readers pick their voice from this
    document.documentElement.lang = code
    try {
      localStorage.setItem('lang', code)
    } catch {
      // ignore - language just won't persist across reloads
    }
  }, [code])

  return <LanguageContext.Provider value={{ code, setCode }}>{children}</LanguageContext.Provider>
}

// const { t, food, code, setCode } = useLanguage()
// t('key') or t('key', ...args) for the entries that are functions;
// food(name) translates a database food name or category when we have one.
export function useLanguage() {
  const { code, setCode } = useContext(LanguageContext)
  const lang = LANGUAGES.find((l) => l.code === code)

  function t(key, ...args) {
    const value = lang.strings[key] ?? LANGUAGES[0].strings[key] ?? key
    return typeof value === 'function' ? value(...args) : value
  }

  function food(name) {
    return lang.foods[name] ?? name
  }

  return { t, food, code, setCode }
}

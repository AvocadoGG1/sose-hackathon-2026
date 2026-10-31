import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../i18n.jsx'
import { LANGUAGES } from '../translations.js'
import './LanguageMenu.css'

// globe outline, drawn in the button's text color
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9M12 3c-2.5 2.6-3.8 5.6-3.8 9s1.3 6.4 3.8 9" />
      </g>
    </svg>
  )
}

// translate button in the top-right corner, next to the theme toggle.
// Opens a small list of languages; picking one switches every page at once.
function LanguageMenu() {
  const { t, code, setCode } = useLanguage()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)

  // close on Escape (focus back to the button) or a click anywhere else
  useEffect(() => {
    if (!open) return
    function onKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current.focus()
      }
    }
    function onClick(event) {
      if (!wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  function choose(langCode) {
    setCode(langCode)
    setOpen(false)
    buttonRef.current.focus()
  }

  return (
    <div className="language-menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="language-toggle"
        aria-label={t('chooseLanguage')}
        title={t('chooseLanguage')}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <GlobeIcon />
      </button>

      {open && (
        <ul id={menuId} className="language-list">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                lang={lang.code}
                aria-current={lang.code === code ? 'true' : undefined}
                onClick={() => choose(lang.code)}
              >
                <span aria-hidden="true">{lang.code === code ? '✓' : ''}</span>
                {lang.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default LanguageMenu

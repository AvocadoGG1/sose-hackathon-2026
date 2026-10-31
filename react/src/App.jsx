import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle.jsx'
import LanguageMenu from './components/LanguageMenu.jsx'
import { useLanguage } from './i18n.jsx'
import MainMenu from './pages/MainMenu.jsx'
import GetFood from './pages/GetFood.jsx'
import Checkout from './pages/Checkout.jsx'
import DonateFood from './pages/DonateFood.jsx'
import Admin from './pages/Admin.jsx'

// pages with their own browser tab title (translations.js 'title.<path>')
const TITLED_PAGES = ['/get-food', '/checkout', '/donate-food', '/admin']

function App() {
  const { pathname } = useLocation()
  const { t, code } = useLanguage()

  // browser tab title per page, so screen reader users hear where they landed
  useEffect(() => {
    const appName = t('appName')
    document.title = TITLED_PAGES.includes(pathname) ? `${t(`title.${pathname}`)} · ${appName}` : appName
    // t changes with the language, which `code` already tracks
  }, [pathname, code])

  return (
    <>
      <LanguageMenu />
      <ThemeToggle />
      <main>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/get-food" element={<GetFood />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/donate-food" element={<DonateFood />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </>
  )
}

export default App

import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle.jsx'
import MainMenu from './pages/MainMenu.jsx'
import GetFood from './pages/GetFood.jsx'
import Checkout from './pages/Checkout.jsx'
import DonateFood from './pages/DonateFood.jsx'
import Admin from './pages/Admin.jsx'

// browser tab title per page, so screen reader users hear where they landed
const PAGE_TITLES = {
  '/get-food': 'Get Food',
  '/checkout': 'Checkout',
  '/donate-food': 'Donate Food',
  '/admin': 'Pantry Staff',
}

function App() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page = PAGE_TITLES[pathname]
    document.title = page ? `${page} · Better Food Pantry` : 'Better Food Pantry'
  }, [pathname])

  return (
    <>
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

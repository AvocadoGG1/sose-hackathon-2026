import { Routes, Route } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle.jsx'
import MainMenu from './pages/MainMenu.jsx'
import GetFood from './pages/GetFood.jsx'
import Checkout from './pages/Checkout.jsx'
import DonateFood from './pages/DonateFood.jsx'
import Admin from './pages/Admin.jsx'

function App() {
  return (
    <>
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/get-food" element={<GetFood />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/donate-food" element={<DonateFood />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  )
}

export default App

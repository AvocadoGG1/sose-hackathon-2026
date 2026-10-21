import { Routes, Route } from 'react-router-dom'
import MainMenu from './pages/MainMenu.jsx'
import GetFood from './pages/GetFood.jsx'
import Checkout from './pages/Checkout.jsx'
import DonateFood from './pages/DonateFood.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/get-food" element={<GetFood />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/donate-food" element={<DonateFood />} />
    </Routes>
  )
}

export default App

import { Link } from 'react-router-dom'
import './Pages.css'

function DonateFood() {
  return (
    <section className="page placeholder-page">
      <Link to="/" className="back-link">
        ← Back to Main Menu
      </Link>
      <h1>Donate Food</h1>
      <p className="subtitle">Not built yet — item form and donation list go here.</p>
    </section>
  )
}

export default DonateFood

import { Link } from 'react-router-dom'
import './Pages.css'

function GetFood() {
  return (
    <section className="page placeholder-page">
      <Link to="/" className="back-link">
        ← Back to Main Menu
      </Link>
      <h1>Get Food</h1>
      <p className="subtitle">Not built yet — food list, cart and checkout go here.</p>
    </section>
  )
}

export default GetFood

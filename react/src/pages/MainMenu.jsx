import { Link } from 'react-router-dom'
import './Pages.css'

function MainMenu() {
  return (
    <section className="page main-menu">
      <div className="title-frame">
        <span className="corner corner-tl" aria-hidden="true" />
        <span className="corner corner-tr" aria-hidden="true" />
        <span className="corner corner-bl" aria-hidden="true" />
        <span className="corner corner-br" aria-hidden="true" />
        <h1>Better Food Pantry</h1>
      </div>
      <p className="subtitle">Please choose one to get started!</p>
      <div className="nav-cards">
        <Link to="/get-food" className="nav-card">
          <h2>Get Food</h2>
          <p>Browse available food and build a cart!</p>
        </Link>

        <Link to="/donate-food" className="nav-card">
          <h2>Donate Food</h2>
          <p>List food you'd like to donate!</p>
        </Link>
      </div>

      <Link to="/admin" className="staff-link">
        Pantry Staff
      </Link>
    </section>
  )
}

export default MainMenu

import { Link } from 'react-router-dom'
import './Pages.css'

function MainMenu() {
  return (
    <section className="page main-menu">
      <div className="title-frame">
        <span className="corner corner-tl" />
        <span className="corner corner-tr" />
        <span className="corner corner-bl" />
        <span className="corner corner-br" />
        <h1>TITLE (TBD)</h1>
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
    </section>
  )
}

export default MainMenu

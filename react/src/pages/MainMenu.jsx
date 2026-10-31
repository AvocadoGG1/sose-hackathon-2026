import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n.jsx'
import './Pages.css'

function MainMenu() {
  const { t } = useLanguage()

  return (
    <section className="page main-menu">
      <div className="title-frame">
        <span className="corner corner-tl" aria-hidden="true" />
        <span className="corner corner-tr" aria-hidden="true" />
        <span className="corner corner-bl" aria-hidden="true" />
        <span className="corner corner-br" aria-hidden="true" />
        <h1>{t('appName')}</h1>
      </div>
      <p className="subtitle">{t('chooseOne')}</p>
      <div className="nav-cards">
        <Link to="/get-food" className="nav-card">
          <h2>{t('getFood')}</h2>
          <p>{t('getFoodBlurb')}</p>
        </Link>

        <Link to="/donate-food" className="nav-card">
          <h2>{t('donateFood')}</h2>
          <p>{t('donateFoodBlurb')}</p>
        </Link>
      </div>

      <Link to="/admin" className="staff-link">
        {t('pantryStaff')}
      </Link>
    </section>
  )
}

export default MainMenu

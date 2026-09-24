import { NexusLogo } from './NexusLogo'
import { CTA, FOOTER } from './nexus-story'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <div className="footer__lead">
          <h2 className="footer__heading">{FOOTER.heading}</h2>
          <a className="button button--light" href={CTA.href}>
            {CTA.label}
          </a>
        </div>
        <div className="footer__cols">
          {FOOTER.columns.map((col) => (
            <div key={col.title} className="footer__col">
              <p className="footer__col-title">{col.title}</p>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a className="footer__link" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="footer__bottom">
        <NexusLogo className="footer__logo" />
        <p className="footer__legal">{FOOTER.legal}</p>
      </div>
    </footer>
  )
}

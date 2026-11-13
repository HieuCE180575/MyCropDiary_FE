import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { useLanguage } from '../i18n/LanguageContext';

export function PublicFooter() {
  const { t: translate } = useLanguage();
  return (
    <footer className="public-footer" role="contentinfo">
      <div className="public-footer-top">
        <div className="public-footer-container">
          <section className="footer-col footer-col-brand" aria-labelledby="footer-brand-heading">
            <Link to="/" className="footer-brand" aria-label="MyCropDiary">
              <span className="footer-brand-icon">
                <Icon name="leaf" />
              </span>
              <div className="footer-brand-text">
                <strong id="footer-brand-heading">MyCropDiary</strong>
                <span>{translate("VietGAP Smart Agriculture")}</span>
              </div>
            </Link>
            <p className="footer-description">
              {translate("Smart farm management system empowering growers to standardize production diaries, optimize input costs, and ensure produce transparency according to VietGAP standards.")}
            </p>
            <div className="footer-badges">
              <span className="footer-badge">
                <Icon name="shield" /> {translate("VietGAP Standard")}
              </span>
              <span className="footer-badge">
                <Icon name="lock" /> {translate("Cloud Security")}
              </span>
            </div>
          </section>

          <nav className="footer-col" aria-labelledby="footer-explore-heading">
            <h3 id="footer-explore-heading">{translate("Explore & Learn")}</h3>
            <ul className="footer-nav-list">
              <li>
                <Link to="/">{translate("Home")}</Link>
              </li>
              <li>
                <Link to="/about">{translate("About Us")}</Link>
              </li>
              <li>
                <Link to="/knowledge">{translate("VietGAP Knowledge Library")}</Link>
              </li>
              <li>
                <Link to="/features">{translate("Features")}</Link>
              </li>
              <li>
                <Link to="/register">{translate("Create New Account")}</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer-col" aria-labelledby="footer-solutions-heading">
            <h3 id="footer-solutions-heading">{translate("Solutions")}</h3>
            <ul className="footer-nav-list">
              <li>
                <span className="footer-link-text">{translate("Digital Farming Diary")}</span>
              </li>
              <li>
                <span className="footer-link-text">{translate("Inventory & Materials")}</span>
              </li>
              <li>
                <span className="footer-link-text">{translate("Seasonal Cost Accounting")}</span>
              </li>
              <li>
                <span className="footer-link-text">{translate("Compliance & Traceability")}</span>
              </li>
            </ul>
          </nav>

          <section className="footer-col" aria-labelledby="footer-contact-heading">
            <h3 id="footer-contact-heading">{translate("Support & Contact")}</h3>
            <ul className="footer-contact-list">
              <li>
                <Icon name="phone" className="contact-icon" />
                <div>
                  <strong>{translate("Technical Hotline:")}</strong>
                  <p>1900 6868 ({translate('Toll-Free 24/7')})</p>
                </div>
              </li>
              <li>
                <Icon name="mail" className="contact-icon" />
                <div>
                  <strong>{translate("Support Email:")}</strong>
                  <p>support@mycropdiary.vn</p>
                </div>
              </li>
              <li>
                <Icon name="plots" className="contact-icon" />
                <div>
                  <strong>{translate("Headquarters:")}</strong>
                  <p>{translate("High-Tech Park, Thu Duc City, Ho Chi Minh City")}</p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="public-footer-bottom">
        <div className="public-footer-container">
          <p className="footer-copyright">
            &copy; {translate("2026 MyCropDiary. All rights reserved. VietGAP Digital Agriculture Platform.")}
          </p>
          <div className="footer-bottom-links">
            <Link to="/about">{translate("Terms of Service")}</Link>
            <span className="divider">&bull;</span>
            <Link to="/about">{translate("Privacy Policy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import "./Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-column">
          <h3>Registered Office</h3>
          <p>#155, 2nd floor, 4th Cross,</p>
          <p>GKW Layout,</p>
          <p>Vijayanagar, Bangalore,</p>
          <p>Karnataka – 560040</p>
        </div>

        <div className="footer-column">
          <h3>Contact</h3>
          <div className="contact-section">
            <span className="contact-label">Call Us:</span>
            <a href="tel:+919480865623" className="contact-link">
              +91- 9480 865 623
            </a>
          </div>
          <div className="contact-section" style={{ marginTop: "12px" }}>
            <span className="contact-label">Email Us:</span>
            <a href="mailto:sanskritfromhome@vyomalabs.in" className="contact-link">
              sanskritfromhome@vyomalabs.in
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h3>More</h3>
          <ul>
            <li>
              <a href="#/faq">FAQ</a>
            </li>
            <li>
              <Link to="/login">My Account</Link>
            </li>
            <li>
              <a href="terms_and_condtions.html" target="_blank" rel="noopener noreferrer">
                Terms and Conditions
              </a>
            </li>
            <li>
              <a href="privacy.html" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#/refund-policy">Shipping and Refund Policy</a>
            </li>
            <li>
              <a href="mailto:sanskritfromhome@vyomalabs.in">Contact Us</a>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Imp. Links</h3>
          <ul>
            <li>
              <a href="https://www.vyomalabs.in" target="_blank" rel="noopener noreferrer">
                Vyoma Labs (India)
              </a>
            </li>
            <li>
              <a href="https://www.vyomausa.org" target="_blank" rel="noopener noreferrer">
                Vyoma Labs (USA)
              </a>
            </li>
            <li>
              <a href="https://www.sanskritfromhome.org" target="_blank" rel="noopener noreferrer">
                Learn Sanskrit From Home
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Downloads</h3>
          <ul>
            <li>
              <a href="#/downloads/presentation">Company Presentation</a>
            </li>
            <li style={{ marginTop: "16px" }}>
              <a href="#/downloads/newsletter">Vyoma Newsletter</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© All Copyrights Reserved "Vyoma Linguistic Labs Foundation".</p>
      </div>
    </footer>
  );
}

export default Footer;

import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import Button from '../components/Button';
import './LearnMore.css';



function LearnMore() {
    const navigate = useNavigate();

  return (
    <div className="learn-more-page">
      <TopNav variant="landing" />
      <main className="learn-more-main">
        <section className="intro-section">
          <h1 className="page-title">Learn More About SpyPry</h1>
          <p className="page-subtitle">
            Understanding where your personal data exists online and taking control of your digital footprint.
          </p>
        </section>

        <section className="content-section">
          <div className="content-card highlight-card">
            <h2>What SpyPry Does</h2>
            <p>
              SpyPry helps you understand where your personal data may exist online. It identifies companies 
              you likely have accounts with and gives you tools to request opt-outs or data restrictions.
            </p>
          </div>

          <div className="two-column-grid">
            <div className="content-card">
              <h2>Why SpyPry Exists</h2>
              <p>
                Most people forget how many services they sign up for over time. This makes it difficult 
                to manage privacy, data sharing, and digital exposure. SpyPry makes that visible.
              </p>
            </div>

            <div className="content-card">
              <h2>Our Goal</h2>
              <p>
                To give individuals clearer visibility and practical control over their digital footprint.
              </p>
            </div>
          </div>

          <div className="content-card process-card">
            <h2>How It Works</h2>
            <ol className="process-list">
              <li>You connect your email account securely</li>
              <li>SpyPry searches for account-related email signals</li>
              <li>We infer likely services from sender domains</li>
              <li>You choose which companies to contact</li>
              <li>SpyPry generates opt-out request letters for you to send</li>
            </ol>
          </div>

          <div className="content-card privacy-card">
            <h2>Privacy-First by Design</h2>
            <div className="privacy-grid">
              <div className="privacy-item">
                <div className="privacy-icon">🔒</div>
                <p>Read-only email access</p>
              </div>
              <div className="privacy-item">
                <div className="privacy-icon">📋</div>
                <p>Metadata only, no email content</p>
              </div>
              <div className="privacy-item">
                <div className="privacy-icon">🗑️</div>
                <p>No data stored after session</p>
              </div>
              <div className="privacy-item">
                <div className="privacy-icon">✋</div>
                <p>No automated outreach</p>
              </div>
              <div className="privacy-item">
                <div className="privacy-icon">👤</div>
                <p>You stay in control</p>
              </div>
            </div>
          </div>

          <div className="two-column-grid">
            <div className="content-card">
              <h2>What You Get</h2>
              <ul className="benefits-list">
                <li>Consolidated view of likely online accounts</li>
                <li>Confidence indicators for each result</li>
                <li>Opt-out and data request letter templates</li>
                <li>Links to company privacy contacts when available</li>
              </ul>
            </div>

            <div className="content-card">
              <h2>What to Expect</h2>
              <p>
                SpyPry provides probabilistic results, not guarantees. Some accounts may be missed, 
                and some detected services may be inactive.
              </p>
            </div>
          </div>

          <div className="content-card status-card">
            <h2>Project Status</h2>
            <p>
              SpyPry is a hackathon prototype. Features, accuracy, and coverage are limited and 
              under active development.
            </p>
          </div>
        </section>

        <section className="cta-section">
          <h2>Ready to take control?</h2>
          <div className="cta-buttons">
            <Button variant="primary" color="black" onClick={() => navigate('/')}>
              Get Started
            </Button>
            <Button variant="secondary" color="black" onClick={() => navigate('/faq')}>
              View FAQ
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default LearnMore;
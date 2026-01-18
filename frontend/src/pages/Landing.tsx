import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import Button from '../components/Button';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <TopNav variant="landing" />
      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">Take control of your data</h1>
            <p className="hero-subtitle">Opt-out of your data being stolen to third parties</p>
            <div className="hero-actions">
              <Button variant="primary" color="black" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="secondary" color="black" onClick={() => navigate('/learn-more')}>
                Learn more
              </Button>
            </div>
          </div>
          <div className="hero-illustration">
            <div className="illustration-frame">
              <div className="illustration-content">
                <div className="illustration-figures">
                  <div className="figure figure-1"></div>
                  <div className="figure figure-2"></div>
                  <div className="figure figure-3"></div>
                </div>
                <div className="illustration-screen">
                  <div className="screen-element"></div>
                  <div className="screen-element"></div>
                  <div className="screen-element"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gradient-banner">
          <div className="gradient-content"></div>
        </section>

        <section className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <h2 className="feature-title">How it works?</h2>
              <ol className="feature-steps">
                <li>Connect email securely.</li>
                <li>We detect likely accounts.</li>
                <li>You send opt-out requests.</li>
              </ol>
              <Button variant="primary" color="black" onClick={() => navigate('/learn-more')}>
                Learn More
              </Button>
            </div>
            <div className="feature-illustration">
              <div className="illustration-card">
                <div className="illustration-people">
                  <div className="person person-1"></div>
                  <div className="person person-2"></div>
                  <div className="person person-3"></div>
                </div>
                <div className="illustration-data">
                  <div className="data-chart"></div>
                  <div className="data-list"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="security-section">
          <div className="security-grid">
            <div className="security-illustration">
              <div className="illustration-card">
                <div className="workspace-illustration">
                  <div className="workspace-desk"></div>
                  <div className="workspace-person"></div>
                  <div className="workspace-dog"></div>
                </div>
              </div>
            </div>
            <div className="security-content">
              <h2 className="security-title">Fully Secure</h2>
              <p className="security-description">
                We use limited data from your emails and figure out places of vulnerability and help you regain control.
              </p>
              <Button variant="primary" color="black" onClick={() => navigate('/learn-more')}>
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Landing;

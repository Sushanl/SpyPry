import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import GoogleLogin from '../components/GoogleLogin';
import './Login.css';

export default function Login() {
  return (
    <div className="login-page">
      <TopNav variant="auth" />
      <div className="login-container">
        <div className="login-left">
          <div className="login-content">
            <div className="login-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>SpyPry</span>
            </div>
            
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in with your Google account to continue.</p>
            
            <div className="google-login-section">
              <GoogleLogin />
            </div>
            
            <p className="signup-link">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
        
        <div className="login-right">
          <div className="login-graphic">
            <div className="coral-semicircle"></div>
            <div className="coral-glow"></div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
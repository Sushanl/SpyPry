import './App.css'
import GoogleLogin from './components/GoogleLogin'

function App() {
  return (
    <div className="landing-page">
      <div className="hero-section">
        <h1 className="hero-title">SpyPry</h1>
        <p className="hero-subtitle">
          Take control of your data. Make sure it's never sold to third-party companies.
        </p>
        <p className="hero-description">
          SpyPry helps you monitor and protect your personal information, ensuring that your data stays yours and yours alone.
        </p>
        <div className="login-section">
          <GoogleLogin />
        </div>
      </div>
      
      <div className="features-section">
        <div className="feature">
          <h3>🔒 Data Protection</h3>
          <p>Monitor who has access to your data and prevent unauthorized sharing</p>
        </div>
        <div className="feature">
          <h3>🛡️ Privacy First</h3>
          <p>Keep your personal information out of third-party hands</p>
        </div>
        <div className="feature">
          <h3>👁️ Transparency</h3>
          <p>See exactly how your data is being used and by whom</p>
        </div>
      </div>
    </div>
  )
}

export default App

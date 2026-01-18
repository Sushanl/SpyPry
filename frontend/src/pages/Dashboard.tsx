import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scanAccounts, logout, getMe, type ScanResult, type UserInfo } from '../api/client';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import Button from '../components/Button';
import './Dashboard.css';

type ViewState = "landing" | "scanning" | "results" | "error";

// Mock data for demo - matches Figma examples
const mockAccounts = [
  { domain: "meta.com", displayName: "Meta", firstSeen: "March, 2013", hasOptOut: true },
  { domain: "x.com", displayName: "X.com", firstSeen: "April, 2011", hasOptOut: false },
  { domain: "youtube.com", displayName: "YouTube", firstSeen: "February, 2012", hasOptOut: false },
  { domain: "openai.com", displayName: "OpenAI", firstSeen: "January, 2023", hasOptOut: false },
  { domain: "reddit.com", displayName: "Reddit", firstSeen: "June, 2014", hasOptOut: false },
  { domain: "github.com", displayName: "GitHub", firstSeen: "February, 2013", hasOptOut: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>("results");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);

  const scanSteps = [
    "Connecting to Gmail...",
    "Scanning inbox for signup emails...",
    "Analyzing account patterns...",
    "Extracting service information...",
    "Finalizing results...",
  ];

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const userInfo = await getMe();
      if (!userInfo) {
        // Not logged in, redirect to landing page
        navigate('/');
        return;
      }
      setUser(userInfo);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    // Load mock data for demo
    if (viewState === "results" && scanResults.length === 0) {
      setScanResults(mockAccounts.map(acc => ({
        domain: acc.domain,
        displayName: acc.displayName,
        confidence: "high" as const,
        evidence: ["welcome" as const],
        lastSeen: acc.firstSeen,
      })));
    }
  }, [viewState, scanResults.length]);

  const handleStartScan = async () => {
    setViewState("scanning");
    setError(null);
    setScanStep(0);

    // Animate scan steps
    const stepInterval = setInterval(() => {
      setScanStep((prev) => {
        if (prev < scanSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 400);

    try {
      const results = await scanAccounts();
      clearInterval(stepInterval);
      setScanStep(scanSteps.length - 1);
      setScanResults(results);
      setViewState("results");
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : "Failed to scan accounts");
      setViewState("error");
    }
  };

  const handleOptOut = (result: ScanResult, action: 'save' | 'generate') => {
    if (action === 'save') {
      alert(`Saving opt-out preference for ${result.displayName || result.domain}`);
    } else {
      alert(`Generating opt-out letter for ${result.displayName || result.domain}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="dashboard-page">
        <TopNav variant="app" />
        <div className="dashboard-container">
          <h2>Loading...</h2>
        </div>
        <Footer />
      </div>
    );
  }

  // If not authenticated, don't render (will redirect)
  if (!user) {
    return null;
  }

  if (viewState === "scanning") {
    return (
      <div className="dashboard-page">
        <TopNav variant="app" />
        <div className="dashboard-container">
          <h2>Scanning Your Accounts</h2>
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((scanStep + 1) / scanSteps.length) * 100}%` }}
              />
            </div>
            <div className="scan-steps">
              {scanSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`scan-step ${idx <= scanStep ? "active" : ""} ${idx === scanStep ? "current" : ""}`}
                >
                  {idx <= scanStep ? "✓" : "○"} {step}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (viewState === "error") {
    return (
      <div className="dashboard-page">
        <TopNav variant="app" />
        <div className="dashboard-container">
          <h2>Error</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <Button variant="primary" color="black" onClick={handleStartScan}>
              Retry
            </Button>
            <Button variant="secondary" color="black" onClick={() => setViewState("results")}>
              Back
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Results view - matches Figma table layout
  const accounts = scanResults.length > 0 ? scanResults : mockAccounts.map(acc => ({
    domain: acc.domain,
    displayName: acc.displayName,
    confidence: "high" as const,
    evidence: ["welcome" as const],
    lastSeen: acc.firstSeen,
    hasOptOut: acc.hasOptOut,
  }));

  return (
    <div className="dashboard-page">
      <TopNav variant="app" />
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome, {user.name || user.email}! Here's the accounts we found
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Button variant="pill" color="coral" onClick={handleStartScan}>
              Delete Scan
            </Button>
            <Button variant="pill" color="black" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>

        <div className="accounts-count">
          We found {accounts.length} accounts
        </div>

        <div className="accounts-table-container">
          <table className="accounts-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>First Seen</th>
                <th>Opt-Out</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((result, idx) => {
                const hasOptOut = 'hasOptOut' in result && result.hasOptOut;
                return (
                  <tr key={result.domain || idx}>
                    <td className="company-name">{result.displayName || result.domain}</td>
                    <td className="first-seen">{result.lastSeen || 'Unknown'}</td>
                    <td className="opt-out">
                      {hasOptOut ? (
                        <Button 
                          variant="pill" 
                          color="orange" 
                          onClick={() => handleOptOut(result, 'save')}
                        >
                          Save
                        </Button>
                      ) : (
                        <Button 
                          variant="pill" 
                          color="purple" 
                          onClick={() => handleOptOut(result, 'generate')}
                        >
                          Generate Letter
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}

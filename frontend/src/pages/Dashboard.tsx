import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    scanAccounts,
    logout,
    getMe,
    getGmailStatus,
    startGmailConnect,
    disconnectGmail,
    findDeleteLink,
    type ScanResult,
    type UserInfo,
    type EmailMessage,
    type DeleteLinkResult,
  } from '../api/client';
  import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import Button from '../components/Button';
import './Dashboard.css';
import { getGmailMessages } from '../api/client';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("results");
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [optOutByDomain, setOptOutByDomain] = useState<Record<string, DeleteLinkResult>>({});
  const [optOutLoading, setOptOutLoading] = useState<Record<string, boolean>>({});
  const [optOutOpen, setOptOutOpen] = useState<DeleteLinkResult | null>(null);
  const [activeSearchDomain, setActiveSearchDomain] = useState<string | null>(null);




  useEffect(() => {
    const fetchEmails = async () => {
      if (!gmailConnected) return;
      const data = await getGmailMessages();
      setEmails(data);
    };
    fetchEmails();
  }, [gmailConnected]);

  const scanSteps = [
    "Connecting to Gmail...",
    "Scanning inbox for signup emails...",
    "Analyzing account patterns...",
    "Extracting service information...",
    "Finalizing results...",
  ];

  // Check authentication and Gmail status on mount
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
      
      // Check Gmail connection status
      const gmailStatus = await getGmailStatus();
      setGmailConnected(gmailStatus.connected);
      
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Handle Gmail connection callback
// Handle Gmail connection callback
useEffect(() => {
    const gmailParam = searchParams.get("gmail"); // backend uses ?gmail=connected
    if (gmailParam !== "connected") return;
  
    (async () => {
      try {
        // This MUST send cookies. Ensure your client uses credentials: "include".
        const gmailStatus = await getGmailStatus();
  
        if (!gmailStatus.connected) {
          setError("Gmail auth returned, but backend has no session. Try reconnecting.");
          setViewState("error");
          return;
        }
  
        setGmailConnected(true);
        // Remove query parameter from URL
        const next = new URLSearchParams(searchParams);
        next.delete("gmail");
        setSearchParams(next);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to confirm Gmail connection");
        setViewState("error");
      }
    })();
  }, [searchParams, setSearchParams]);
  

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
    if (!gmailConnected) {
      alert("Please connect your Gmail account first to scan for accounts.");
      return;
    }

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

  const handleConnectGmail = () => {
    startGmailConnect();
  };

  const handleDisconnectGmail = async () => {
    await disconnectGmail();
    setGmailConnected(false);
    // Refresh status to confirm
    const status = await getGmailStatus();
    setGmailConnected(status.connected);
  };

  const handleFindOptOut = async (domain?: string) => {
    if (!domain) {
      alert("No domain found for this row.");
      return;
    }
  
    // If cached, open immediately
    const cached = optOutByDomain[domain];
    if (cached) {
      setOptOutOpen(cached);
      return;
    }
  
    setActiveSearchDomain(domain);
    setOptOutOpen({
      domain,
      best_url: null,
      purpose: "unknown",
      confidence: 0,
      steps: [],
      evidence: [],
      notes: "",
    });
  
    setOptOutLoading((prev) => ({ ...prev, [domain]: true }));
  
    try {
      const result = await findDeleteLink(domain);
      setOptOutByDomain((prev) => ({ ...prev, [domain]: result }));
      setOptOutOpen(result);
    } catch (e: any) {
      alert(`Failed to find delete/opt-out link: ${e.message ?? e}`);
      setOptOutOpen(null);
    } finally {
      setOptOutLoading((prev) => ({ ...prev, [domain]: false }));
      setActiveSearchDomain(null);
    }
  };
  
  

  const handleOptOut = (result: ScanResult | EmailMessage, action: 'save' | 'generate') => {

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
            {gmailConnected ? (
              <Button variant="pill" color="purple" onClick={handleDisconnectGmail}>
                Sign out of Gmail
              </Button>
            ) : (
              <Button variant="pill" color="purple" onClick={handleConnectGmail}>
                Connect Gmail
              </Button>
            )}
            <Button variant="pill" color="coral" onClick={handleStartScan}>
              {gmailConnected ? 'Scan Accounts' : 'Delete Scan'}
            </Button>
            <Button variant="pill" color="black" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>

        {!gmailConnected && (
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '500' }}>
              Connect your Gmail account to scan for accounts
            </p>
            <Button variant="primary" color="purple" onClick={handleConnectGmail}>
              Connect Gmail
            </Button>
          </div>
        )}

        {gmailConnected && (
          <div className="accounts-count">
            We found {accounts.length} accounts
          </div>
        )}

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
            {emails.map((result, idx) => {
                const domain = result.domain;
                const loading = !!optOutLoading[domain];
                const cached = optOutByDomain[domain];

                return (
                <tr key={idx}>
                    <td className="company-name">{result.displayName || domain}</td>
                    <td className="first-seen">{result.lastSeen || "-"}</td>
                    <td className="opt-out">
                    <div className="optout-actions">
                        <Button
                        variant="pill"
                        color="purple"
                        onClick={() => handleFindOptOut(domain)}
                        disabled={loading}
                        >
                        {loading ? "Searching..." : cached?.best_url ? "View Options" : "Find Delete Link"}
                        </Button>

                        <Button
                        variant="pill"
                        color="purple"
                        onClick={() => handleOptOut(result as any, "generate")}
                        >
                        Generate Letter
                        </Button>
                    </div>
                    </td>
                </tr>
                );
            })}
            </tbody>

          </table>
        </div>
      </main>
      {optOutOpen && (
  <div
    className="optout-modal-overlay"
    onClick={() => {
      setOptOutOpen(null);
      setActiveSearchDomain(null);
    }}
  >
    <div className="optout-modal" onClick={(e) => e.stopPropagation()}>
      <div className="optout-modal-hero">
        <div className="optout-hero-left">
          <div className="optout-hero-title">Delete / Opt-Out Options</div>
          <div className="optout-hero-sub">
            We find the most official on-domain path to delete your account or contact support.
          </div>

          <div className="optout-meta-row">
            <span className="optout-pill">
              Domain: <strong>{optOutOpen.domain}</strong>
            </span>

            <span className={`optout-badge purpose-${optOutOpen.purpose}`}>
              {optOutOpen.purpose === "account_delete" ? "Account Deletion" :
               optOutOpen.purpose === "privacy_rights" ? "Privacy Rights" :
               optOutOpen.purpose === "contact_support" ? "Contact Support" : "Unknown"}
            </span>

            <span className="optout-pill">
              Confidence: <strong>{Math.round((optOutOpen.confidence || 0) * 100)}%</strong>
            </span>
          </div>
        </div>

        <button
          className="optout-modal-close"
          onClick={() => {
            setOptOutOpen(null);
            setActiveSearchDomain(null);
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="optout-modal-body">
        {/* Searching state */}
        {activeSearchDomain === optOutOpen.domain && (
          <div className="optout-searching">
            <div className="optout-shield">
              <div className="optout-shield-inner" />
            </div>
            <div className="optout-searching-text">
              <div className="optout-searching-title">Searching official deletion steps…</div>
              <div className="optout-searching-sub">Scanning public pages on {optOutOpen.domain}</div>
              <div className="optout-scanbar">
                <div className="optout-scanbar-fill" />
              </div>
            </div>
          </div>
        )}

        {/* Result state */}
        {activeSearchDomain !== optOutOpen.domain && (
          <>
            {optOutOpen.best_url ? (
              <div className="optout-linkbox">
                <div className="optout-linkbox-title">Best official page</div>
                <a className="optout-link" href={optOutOpen.best_url} target="_blank" rel="noreferrer">
                  {optOutOpen.best_url}
                </a>
              </div>
            ) : (
              <div className="optout-linkbox warn">
                <div className="optout-linkbox-title">No on-domain deletion page found</div>
                <div className="optout-linkbox-sub">
                  We’ll show the best on-domain support/contact path instead.
                </div>
              </div>
            )}

            <div className="optout-steps">
              <div className="optout-section-title">Steps</div>
              <ol className="optout-steps-list">
                {(optOutOpen.steps || []).map((s, i) => (
                  <li key={i} className="optout-step" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className="optout-step-index">{i + 1}</span>
                    <span className="optout-step-text">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {optOutOpen.notes && (
              <div className="optout-notes">
                <div className="optout-section-title">Notes</div>
                <div className="optout-notes-text">{optOutOpen.notes}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
)}


      <Footer />
    </div>
  );
}

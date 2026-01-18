import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const BACKEND_URL = "http://localhost:8000";

interface User {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/me`, {
          credentials: "include",
        });
        
        if (!response.ok) {
          // If not authenticated, redirect to landing
          navigate("/");
          return;
        }
        
        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      // Navigate to landing page after logout
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      // Still navigate even if logout fails
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>SpyPry Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome back{user?.name ? `, ${user.name}` : ''}!</h2>
          {user?.email && (
            <p className="user-email">
              <span className="email-label">Email:</span> {user.email}
            </p>
          )}
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>🔒 Data Access Monitor</h3>
            <p>Track who has access to your personal information</p>
            <div className="card-stats">
              <span className="stat-value">0</span>
              <span className="stat-label">Active Data Shares</span>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>🛡️ Privacy Score</h3>
            <p>Your overall privacy protection rating</p>
            <div className="card-stats">
              <span className="stat-value">100%</span>
              <span className="stat-label">Protected</span>
            </div>
          </div>

          <div className="dashboard-card">
            <h3>📊 Third-Party Tracking</h3>
            <p>Companies attempting to access your data</p>
            <div className="card-stats">
              <span className="stat-value">0</span>
              <span className="stat-label">Blocked Attempts</span>
            </div>
          </div>
        </div>

        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            <p className="activity-item">No recent activity to display</p>
          </div>
        </div>
      </div>
    </div>
  );
}

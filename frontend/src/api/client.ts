export type ScanResult = {
  domain: string;
  displayName?: string;
  confidence: "high" | "medium" | "low";
  evidence: Array<"welcome" | "receipt" | "reset" | "login_alert">;
  lastSeen?: string; // ISO yyyy-mm-dd
  count?: number;
};

export type UserInfo = {
  email: string;
  name?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const MOCK_MODE = import.meta.env.VITE_MOCK === "true";

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Mock data for demo mode
const mockResults: ScanResult[] = [
  {
    domain: "netflix.com",
    displayName: "Netflix",
    confidence: "high",
    evidence: ["welcome", "receipt"],
    lastSeen: "2024-01-15",
    count: 12,
  },
  {
    domain: "spotify.com",
    displayName: "Spotify",
    confidence: "high",
    evidence: ["welcome", "receipt", "login_alert"],
    lastSeen: "2024-02-20",
    count: 8,
  },
  {
    domain: "amazon.com",
    displayName: "Amazon",
    confidence: "high",
    evidence: ["receipt", "login_alert"],
    lastSeen: "2024-03-10",
    count: 45,
  },
  {
    domain: "old-forum.example",
    displayName: "Old Forum",
    confidence: "medium",
    evidence: ["welcome"],
    lastSeen: "2020-06-12",
    count: 2,
  },
  {
    domain: "newsletter-service.io",
    displayName: "Newsletter Service",
    confidence: "low",
    evidence: ["welcome"],
    lastSeen: "2019-03-05",
    count: 1,
  },
  {
    domain: "uber.com",
    displayName: "Uber",
    confidence: "high",
    evidence: ["receipt", "login_alert"],
    lastSeen: "2024-03-18",
    count: 23,
  },
  {
    domain: "forgotten-app.net",
    confidence: "low",
    evidence: ["welcome"],
    lastSeen: "2018-11-22",
    count: 1,
  },
  {
    domain: "linkedin.com",
    displayName: "LinkedIn",
    confidence: "high",
    evidence: ["welcome", "login_alert"],
    lastSeen: "2024-03-01",
    count: 15,
  },
];

export async function getMe(): Promise<UserInfo | null> {
  if (MOCK_MODE) {
    return { email: "demo@example.com", name: "Demo User" };
  }

  try {
    const data = await http<{ user: UserInfo }>("/me");
    return data.user;
  } catch {
    return null;
  }
}

export function startGmailConnect(): void {
  if (MOCK_MODE) {
    // In mock mode, just trigger the scan flow
    return;
  }
  window.location.href = `${API_BASE}/gmail/connect`;
}

export async function scanAccounts(): Promise<ScanResult[]> {
  if (MOCK_MODE) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
    return [...mockResults];
  }

  const data = await http<ScanResult[]>("/gmail/scan");
  return data;
}

export async function logout(): Promise<void> {
  if (MOCK_MODE) {
    return;
  }

  try {
    await http<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } catch {
    // Ignore errors on logout
  }
}

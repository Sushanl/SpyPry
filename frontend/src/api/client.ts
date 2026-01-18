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

export type LetterResponse = {
  ok: boolean;
  letter?: string;
  email_address?: string;
  company_name?: string;
  email_subject?: string;
  missing?: {
    privacy_policy_url?: boolean;
    privacy_contact_email?: boolean;
  };
  found?: Record<string, unknown>;
  debug?: Record<string, unknown>;
};

export type LetterData = {
  letter: string;
  email_address: string;
  company_name: string;
  email_subject: string;
};

export type EmailMessage = {
  domain: string;
  displayName?: string;
  confidence: "high" | "medium" | "low";
  evidence?: Array<"welcome" | "receipt" | "reset" | "login_alert">;
  lastSeen?: string;
};

export type DeleteLinkPurpose =
  | "account_delete"
  | "privacy_rights"
  | "contact_support"
  | "unknown";

export type DeleteLinkEvidence = {
  title: string;
  url: string;
  snippet: string;
};

export type DeleteLinkResult = {
  domain: string;
  best_url: string | null;
  purpose: DeleteLinkPurpose;
  confidence: number;
  steps: string[];
  evidence: DeleteLinkEvidence[];
  notes: string;
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

export async function getGmailStatus(): Promise<{ connected: boolean; email?: string }> {
  if (MOCK_MODE) {
    return { connected: false };
  }

  try {
    const data = await http<{ connected: boolean; email?: string }>("/gmail/status");
    return data;
  } catch {
    return { connected: false };
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

export async function findDeleteLink(domain: string): Promise<DeleteLinkResult> {
    return http<DeleteLinkResult>("/privacy/find_delete_link", {
      method: "POST",
      body: JSON.stringify({ domain }),
    });
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

export async function disconnectGmail(): Promise<void> {
  if (MOCK_MODE) {
    return;
  }

  try {
    await http<{ ok: boolean }>("/gmail/disconnect", { method: "POST" });
  } catch {
    // Ignore errors on disconnect
  }
}

export async function getGmailMessages(): Promise<EmailMessage[]> {

  // Call /gmail/scan which returns the company data
  const data = await http<EmailMessage[]>("/gmail/scan");
  return data;
}


export async function generateLetter(companyName: string, companyDomain?: string): Promise<LetterResponse> {
  // Construct website URL from domain if not provided
  const companyWebsiteUrl = companyDomain 
    ? (companyDomain.startsWith('http') ? companyDomain : `https://${companyDomain}`)
    : `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
  
  const data = await http<LetterResponse>("/letter/generate", {
    method: "POST",
    body: JSON.stringify({ 
      company_name: companyName,
      company_website_url: companyWebsiteUrl,
      product_or_service_used: "",
      user_full_name: "",
      user_email: "",
    }),
  });
  return data;
}
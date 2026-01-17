import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "http://localhost:8000";

// Type declaration for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            config: { theme: string; size: string }
          ) => void;
        };
      };
    };
  }
}

export default function GoogleLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Google Identity Services script to load
    const checkGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initializeGoogleSignIn();
      } else {
        // Retry after a short delay if script isn't loaded yet
        setTimeout(checkGoogleScript, 100);
      }
    };

    const initializeGoogleSignIn = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        console.error("Missing VITE_GOOGLE_CLIENT_ID in environment variables");
        return;
      }

      try {
        // @ts-expect-error - Google Identity Services types not available
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: { credential: string }) => {
            console.log("Google login callback triggered");
            
            try {
              // resp.credential is the ID token (JWT)
              const r = await fetch(`${BACKEND_URL}/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // IMPORTANT so cookie is set
                body: JSON.stringify({ id_token: resp.credential }),
              });

              if (!r.ok) {
                const errorData = await r.json().catch(() => ({}));
                console.error("Login failed:", r.status, errorData);
                alert("Login failed. Please try again.");
                return;
              }

              const data = await r.json();
              console.log("Login successful:", data);
              
              // Navigate to dashboard after successful login
              navigate("/dashboard");
            } catch (error) {
              console.error("Error during login:", error);
              alert("An error occurred during login. Please try again.");
            }
          },
        });

        // @ts-expect-error - Google Identity Services types not available
        window.google.accounts.id.renderButton(
          document.getElementById("google-btn"),
          { theme: "outline", size: "large" }
        );
      } catch (error) {
        console.error("Error initializing Google Sign In:", error);
      }
    };

    // Start checking for the script
    checkGoogleScript();
  }, [navigate]);

  return <div id="google-btn" />;
}

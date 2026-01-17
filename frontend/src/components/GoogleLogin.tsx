import { useEffect } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function GoogleLogin() {
  useEffect(() => {
    // @ts-expect-error
    window.google?.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (resp: any) => {
        // resp.credential is the ID token (JWT)
        const r = await fetch(`${BACKEND_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // IMPORTANT so cookie is set
          body: JSON.stringify({ id_token: resp.credential }),
        });

        if (!r.ok) {
          console.error("Login failed");
          return;
        }

        console.log("Logged in");
      },
    });

    // @ts-ignore
    window.google?.accounts.id.renderButton(
      document.getElementById("google-btn"),
      { theme: "outline", size: "large" }
    );
  }, []);

  return <div id="google-btn" />;
}

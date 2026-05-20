"use client";

import Header from "@/components/header";
import ThemeToggle from "@/components/ThemeToggle";
import { SignOut } from "@/components/icons";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);

    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="settings-page">
      <Header demph="Account &" emph="Settings" />

      <div className="settings-content">
        <section className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-label">Appearance</p>
              <h2 className="dash-card-title">Theme</h2>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-copy">
              <p className="settings-row-title">Dark mode</p>
              <p className="settings-row-description">
                Switch between light and dark appearance.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        <section className="dash-card">
          <div className="dash-card-header">
            <div>
              <p className="dash-card-label">Account</p>
              <h2 className="dash-card-title">Session</h2>
            </div>
          </div>

          <button
            type="button"
            className="settings-sign-out-btn btn-press"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <SignOut />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </section>
      </div>
    </div>
  );
}

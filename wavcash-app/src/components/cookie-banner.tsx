"use client";

import { useEffect, useState } from "react";

const EU_COUNTRIES = new Set([
  // EU member states
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA
  "IS", "LI", "NO",
  // UK (GDPR-equivalent)
  "GB",
]);

const CONSENT_KEY = "wc-cookie-consent";

function getGeoCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)wc-geo=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if user already made a choice
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent) return;

    // Only show for EU/EEA/UK visitors
    const geo = getGeoCookie();
    if (geo && EU_COUNTRIES.has(geo)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleChoice(choice: "all" | "necessary") {
    localStorage.setItem(CONSENT_KEY, choice);
    setVisible(false);
  }

  return (
    <div className="wc-cookie-banner">
      <style>{`
        .wc-cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 200;
          padding: 0 16px 16px;
          pointer-events: none;
          animation: wc-cb-slide-up 0.35s ease-out;
        }

        @keyframes wc-cb-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .wc-cookie-banner-inner {
          max-width: 620px;
          margin: 0 auto;
          padding: 18px 22px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 14px;
          box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
          pointer-events: auto;
          cursor: default !important;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .wc-cookie-banner-inner * {
          cursor: default !important;
        }

        [data-theme="dark"] .wc-cookie-banner-inner {
          background: #1e2023;
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
        }

        .wc-cookie-banner-text {
          font-family: var(--font-plus-jakarta), system-ui, sans-serif;
          font-size: 13.5px;
          line-height: 1.55;
          color: #1a1a1a;
          margin: 0;
        }

        [data-theme="dark"] .wc-cookie-banner-text {
          color: rgba(255, 255, 255, 0.88);
        }

        .wc-cookie-banner-text a {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .wc-cookie-banner-text a:hover {
          color: var(--accent);
        }

        .wc-cookie-banner-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .wc-cookie-btn {
          font-family: var(--font-plus-jakarta), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 18px;
          border-radius: 8px;
          border: none;
          cursor: default;
          transition: opacity 0.15s, transform 0.1s;
          white-space: nowrap;
        }

        .wc-cookie-btn:hover {
          opacity: 0.88;
        }

        .wc-cookie-btn:active {
          transform: scale(0.97);
        }

        .wc-cookie-btn-secondary {
          background: #f0f0f0;
          color: #1a1a1a;
        }

        [data-theme="dark"] .wc-cookie-btn-secondary {
          background: #2c2f33;
          color: rgba(255, 255, 255, 0.92);
        }

        .wc-cookie-btn-primary {
          background: var(--accent);
          color: #000;
        }

        @media (max-width: 480px) {
          .wc-cookie-banner {
            padding: 0 10px 10px;
          }
          .wc-cookie-banner-inner {
            padding: 16px 16px;
          }
          .wc-cookie-banner-actions {
            flex-direction: column-reverse;
          }
          .wc-cookie-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
      <div className="wc-cookie-banner-inner">
        <p className="wc-cookie-banner-text">
          We use cookies to analyze site usage and improve our services.
          You can accept all cookies or use only those necessary for the site to function.{" "}
          <a href="/privacy#cookies">Learn more</a>
        </p>
        <div className="wc-cookie-banner-actions">
          <button
            className="wc-cookie-btn wc-cookie-btn-secondary"
            onClick={() => handleChoice("necessary")}
          >
            Necessary only
          </button>
          <button
            className="wc-cookie-btn wc-cookie-btn-primary"
            onClick={() => handleChoice("all")}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import dynamic from "next/dynamic";

const MercuryCanvas = dynamic(
  () => import("@/components/dashboard/mercury-canvas"),
  { ssr: false }
);

/* ================================================================
   FAQ Data
   ================================================================ */

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    title: "Understanding Royalties",
    items: [
      {
        q: "What are the different types of music royalties?",
        a: "There are four main royalty streams for a recorded song:\n\nMaster recording royalties are paid by distributors (DistroKid, TuneCore, etc.) based on streams and downloads. This is the money most independent artists are familiar with.\n\nMechanical royalties are created every time a composition is reproduced, including every single stream on Spotify or Apple Music. These are collected by organizations like The MLC in the US.\n\nPerformance royalties are collected by PROs (ASCAP, BMI, SOCAN, etc.) when a song is played on radio, TV, or in public venues like restaurants and stores.\n\nNeighboring rights royalties pay performers and recording owners for public and broadcast use of their recordings. These are collected by organizations like SoundExchange (US) and PPL (UK).\n\nEach stream flows through a different collection society, which is why registering with the right organizations matters. If you only have a distributor, you are likely only collecting one of these four streams.",
      },
      {
        q: "What's the difference between master recording and publishing royalties?",
        a: "A recorded song creates two separate copyrights, and each one generates its own royalties.\n\nThe master recording copyright covers the actual recording and belongs to whoever paid for the session, usually the artist or their label. Distributor payments from DistroKid, TuneCore, and similar services cover master royalties.\n\nThe composition copyright covers the underlying song: the melody, lyrics, and arrangement. It belongs to the songwriter(s). Publishing royalties from the composition side are collected by PROs, mechanical licensing bodies like The MLC, and publishers.\n\nThese two streams are completely independent. Having a distributor does not mean your publishing royalties are being collected. Many independent artists only collect the master side and leave the composition side on the table.",
      },
    ],
  },
  {
    title: "Uploading Statements",
    items: [
      {
        q: "What happens when I upload a distributor statement?",
        a: "When you upload a CSV from your distributor, WavCash reads every line and matches tracks to your catalog using ISRCs.\n\nIt then compares your actual earnings against estimates based on stream counts and published per-stream rates. Any track where the actual payout is significantly different from the expected amount gets flagged.\n\nThis helps you spot missing money, underpayments, or tracks that may not be properly set up with your distributor.",
      },
      {
        q: "What happens when I upload a publisher statement?",
        a: "Publisher statements contain composition royalties: mechanical royalties from streaming, performance royalties collected by PROs, and YouTube composition revenue.\n\nThese are publishing royalties, completely separate from your distributor payments. There is no overlap between the two. WavCash matches them to your catalog by ISRC and adds them to your total earnings. Publishing earnings show up as a separate line in your dashboard so you can see exactly how much you are earning from each side.",
      },
      {
        q: "What platforms and sources are supported?",
        a: "For distributor statements: DistroKid, TuneCore, Amuse, and CD Baby.\n\nFor publisher statements: AMRA, with more publishers being added.\n\nPlatform coverage includes Spotify, Apple Music, YouTube Music, Amazon Music, Tidal, Deezer, TikTok, Audiomack, SoundCloud, Pandora, iHeart, Anghami, Vevo, and Meta.\n\nIf your distributor or publisher is not listed, let us know and we will add support for it.",
      },
    ],
  },
  {
    title: "Split Agreements & Distributions",
    items: [
      {
        q: "How are split distributions calculated and paid out?",
        a: "When earnings are distributed through a WavCash split agreement, the smart contract divides the deposited amount according to each contributor's percentage and sends each share directly to their wallet.\n\nThe exact amount each person receives is recorded on the blockchain. There is no estimation involved: what the contract sends is what you get.",
      },
      {
        q: "What about mechanical royalties collected by the distributor?",
        a: "Some distributors collect a portion of mechanical royalties on behalf of the master recording owner as part of their standard agreement. The WavCash split contract covers these: any mechanical royalties collected by the distributor are sent through the split along with the rest of the distributor proceeds.\n\nHowever, composition-only royalties from collection societies, such as the writer's performance share or publisher's share, are not covered by the split agreement. Contributors collect those on their own through their PRO and publisher.\n\nIn short: everything your distributor pays out goes through the split. Everything your PRO or publisher pays out goes directly to you.",
      },
      {
        q: "I'm a contributor on a split. Should I also upload my own distributor CSV for that track?",
        a: "No. If a split agreement is active for a track and distributions have been made, your earnings for that track come from the split payouts sent to your wallet.\n\nThe split creator already received the full distributor payment and deposited it into the contract, which then paid out your share. If you also uploaded your own distributor CSV showing the same track, WavCash would ignore those lines to avoid counting the same money twice.\n\nYour dashboard will show your split payout as your master earnings for that track.",
      },
      {
        q: "I'm the split creator. Are my earnings the full distributor amount or just my share?",
        a: "Just your share. As the split creator, you receive the distributor payment, then deposit it into the split contract. The contract pays each contributor their percentage, including you.\n\nYour earnings for that track are your split payout (your percentage of the total), not the full distributor payment. WavCash reads the exact amounts from the blockchain, so your dashboard shows what you actually received after the split.",
      },
      {
        q: "Can contributors register independently for publishing royalties?",
        a: "Yes, and they should. PRO performance royalties, SoundExchange digital performance royalties, and neighboring rights are completely separate from the master recording split.\n\nEach contributor should register with their own PRO and relevant collection societies to collect their writer's share and performer's share. The split agreement only covers master recording distribution and any mechanicals the distributor collects.\n\nImportant: do not set up separate master distribution with your distributor for a track that already has a split agreement. The split contract handles that. But always register separately for your publishing and performance royalties.",
      },
      {
        q: "What if two contributors on the same split both register the same song with their PRO?",
        a: "That is expected and correct. PROs track ownership percentages per writer. When you register a song, you declare your ownership share (for example, 50% if you co-wrote it). Each contributor registers with their own PRO and claims their own percentage.\n\nRegistering does not mean claiming 100%. It means telling the PRO what share is yours so they can pay you the right amount. All co-writers should register the same work with their respective PROs.",
      },
    ],
  },
  {
    title: "Earnings & Reconciliation",
    items: [
      {
        q: "How does WavCash calculate my total earnings without double-counting?",
        a: "WavCash combines three data sources per track to give you one accurate total.\n\nIf a track has an active split agreement and distributions have been made, your master earnings for that track come from the exact amounts sent to your wallet on-chain. Any distributor CSV data for the same track is excluded to avoid counting the same money twice, since the split creator already deposited those distributor proceeds into the contract.\n\nIf a track has no split, master earnings come from your uploaded distributor statements.\n\nPublishing earnings from publisher statements are always added on top, since they represent a completely separate royalty stream that never overlaps with distributor or split payments.\n\nIf no actual data or split data exist for a track, WavCash falls back to estimates based on stream counts and per-stream rates. The dashboard shows whether your earnings are verified from real data or estimated.",
      },
    ],
  },
  {
    title: "Self-Publishing & Registration",
    items: [
      {
        q: "What is Reclaim and how does it help me?",
        a: "Reclaim is a guided self-registration tool that helps you collect royalties you may be leaving on the table.\n\nIt figures out which collection societies you should be registered with based on your country and catalog, prepares your registration package using data already in your WavCash profile (name, tracks, ISRCs), and gives you step-by-step instructions for submitting through each society's own website or channel. WavCash prepares everything, you review and submit.\n\nThe audit feature also looks at your uploaded statements to find gaps. For example, if your publisher is collecting from BMI on your behalf and taking a cut, Reclaim will suggest registering directly with BMI to keep the full amount.",
      },
      {
        q: "What's the difference between the writer's share and the publisher's share?",
        a: "When a composition earns royalties, the total is split 50/50 between the writer's share and the publisher's share.\n\nPROs like ASCAP and BMI pay the writer's share directly to registered songwriters. The publisher's share goes to whoever is registered as the publisher for that work.\n\nIf you do not have a publisher and are not registered as your own publisher, that 50% either goes uncollected or gets held by the society with no clear path to you.\n\nAs an independent songwriter, you can register as your own publisher and collect both halves, receiving 100% of your composition royalties instead of just 50%.",
      },
      {
        q: "How do I register as my own publisher?",
        a: "With ASCAP, writer membership is free and publisher affiliation is also free. With BMI, writer membership is free and publisher registration requires a one-time $150 fee.\n\nIn both cases, you choose a publishing entity name. This can be anything you want followed by \"Publishing\" or \"Music\" (for example, \"Sunrise Publishing\").\n\nRegister as a publisher through the society's website, then register the same works under your publisher entity that you already registered as a writer. This links both the writer's share and the publisher's share to you.\n\nThe Reclaim registration wizard walks you through this process step by step for societies that support self-publishing.",
      },
      {
        q: "Can I register with both ASCAP and BMI?",
        a: "No. You can only be a member of one US performing rights organization at a time. Choose either ASCAP or BMI, not both.\n\nIf you are already registered with one and want to switch, you need to resign from your current PRO first and wait for the resignation to take effect before joining the other. This typically takes effect at the end of your current membership term.\n\nOutside the US, the same rule applies: one PRO per territory.",
      },
      {
        q: "Which collection societies should I be registered with?",
        a: "At minimum, every songwriter and recording artist should be registered with three types of organizations:\n\n**SoundExchange:** free, collects US digital radio royalties for artists worldwide. If your music has ever played on Pandora, SiriusXM, or internet radio in the US, you have money waiting.\n\n**The MLC:** free, collects US streaming mechanical royalties for songwriters worldwide. Every Spotify and Apple Music stream in the US creates a mechanical royalty that The MLC collects.\n\n**A PRO in your home country:** ASCAP or BMI in the US, SOCAN in Canada, PRS in the UK, COSON in Nigeria, SAMRO in South Africa, etc. This collects your writer's performance royalties.\n\nPPL in the UK is also worth registering with since it collects neighboring rights royalties for performers worldwide and is free.\n\nThe Reclaim audit looks at your specific situation and tells you exactly which societies you need based on your country, catalog, and existing registrations.",
      },
      {
        q: "What are cross-border royalties and how do I collect them?",
        a: "When your song plays on the radio in France but you are registered with ASCAP in the US, SACEM in France collects the royalty and sends it to ASCAP through a reciprocal agreement. This works for performance royalties through the CISAC network of 228 societies across 119 countries.\n\nHowever, the system has gaps: data matching failures, delays of 12 to 24 months, and some smaller societies with limited reciprocal agreements.\n\nFor digital performance royalties (SoundExchange) and streaming mechanicals (The MLC), these are US-based organizations open to international registration directly. You do not need to go through a local intermediary for these. Register directly and collect without the delay.",
      },
    ],
  },
];

/* ================================================================
   Scoped CSS
   ================================================================ */

const FAQ_CSS = `
.faq-root {
  --accent: #D4883A;
  --accent-dim: rgba(212,136,58,0.12);
  --accent-border: rgba(212,136,58,0.28);
  --text-primary: #E8ECF0;
  --text-secondary: #9AA8B4;
  --text-tertiary: #788898;
  --bg-surface: rgba(232,236,240,0.06);
  --border-subtle: rgba(232,236,240,0.12);
  --bg-btn-primary: #fff;
  --text-btn-primary: #000;
  --nav-underline: rgba(232,236,240,0.25);
}
.faq-root[data-theme="light"] {
  --text-primary: #1A1A1A;
  --text-secondary: #5A6670;
  --text-tertiary: #8895A0;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
  --bg-btn-primary: #000;
  --text-btn-primary: #fff;
  --accent-dim: rgba(212,136,58,0.08);
  --accent-border: rgba(212,136,58,0.22);
  --nav-underline: rgba(0,0,0,0.18);
}

.faq-root {
  position: relative; min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-primary); overflow-x: hidden;
}
.faq-root *, .faq-root *::before, .faq-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}

/* ---- NAV ---- */
.faq-root .top-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: background 0.6s ease, border-color 0.6s ease;
}
.faq-root .nav-logo {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color 0.8s ease;
}
.faq-root .nav-logo:hover { color: var(--accent); }
.faq-root .nav-links { display: flex; gap: 0; align-items: center; }
.faq-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; background: none; border: none;
  position: relative; padding: 4px 16px; transition: color 0.8s ease;
  font-family: inherit; cursor: pointer;
}
.faq-root .nav-link:hover { color: var(--accent); }
.faq-root .nav-link.active { color: var(--accent); }
.faq-root .nav-right { display: flex; align-items: center; gap: 0; }
.faq-root .nav-hit { display: flex; align-items: center; padding: 0 16px; }
.faq-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.5s ease;
}
.faq-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.faq-root .theme-toggle svg { width: 16px; height: 16px; }
.faq-root .icon-sun { display: block; }
.faq-root .icon-moon { display: none; }
.faq-root[data-theme="light"] .icon-sun { display: none; }
.faq-root[data-theme="light"] .icon-moon { display: block; }
.faq-root .nav-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-btn-primary); background: var(--bg-btn-primary);
  border: none; border-radius: 8px; padding: 10px 22px;
  letter-spacing: 0.2px; cursor: pointer;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
}
.faq-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25);
}

/* ---- MAIN ---- */
.faq-root .main {
  position: relative; z-index: 1;
  max-width: 820px; margin: 0 auto;
  padding: 140px 40px 80px;
}

/* ---- HEADER ---- */
.faq-root .page-header {
  text-align: center; margin-bottom: 56px;
}
.faq-root .page-title {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-size: 40px; font-weight: 700; letter-spacing: -1px;
  margin-bottom: 12px;
}
.faq-root .page-subtitle {
  font-size: 16px; color: var(--text-secondary);
  max-width: 480px; margin: 0 auto; line-height: 1.6;
}

/* ---- CATEGORY ---- */
.faq-root .faq-category {
  margin-bottom: 48px;
}
.faq-root .category-title {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-size: 22px; font-weight: 700;
  letter-spacing: -0.3px; color: var(--accent);
  margin-bottom: 20px; padding-left: 2px;
}

/* ---- ACCORDION ---- */
.faq-root .faq-item {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  margin-bottom: 8px;
  overflow: hidden;
  transition: border-color 0.4s ease;
}
.faq-root .faq-item[open] {
  border-color: var(--accent-border);
}
.faq-root .faq-item summary {
  padding: 20px 24px;
  font-size: 15px; font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  list-style: none;
  display: flex; align-items: center; justify-content: space-between;
  transition: color 0.3s ease;
}
.faq-root .faq-item summary::-webkit-details-marker { display: none; }
.faq-root .faq-item summary::after {
  content: '+';
  font-size: 20px; font-weight: 300;
  color: var(--text-tertiary);
  transition: transform 0.3s ease, color 0.3s ease;
  flex-shrink: 0; margin-left: 16px;
}
.faq-root .faq-item[open] summary::after {
  content: '\\2212';
  color: var(--accent);
}
.faq-root .faq-item summary:hover { color: var(--accent); }
.faq-root .faq-answer {
  padding: 0 24px 24px;
  font-size: 14.5px; line-height: 1.8;
  color: var(--text-primary);
  text-align: justify;
}
.faq-root .faq-answer p {
  margin-bottom: 14px;
}
.faq-root .faq-answer p:last-child {
  margin-bottom: 0;
}

/* ---- FOOTER ---- */
.faq-root .sp-footer { padding: 100px 0 60px; }
.faq-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.faq-root .footer-grid > div {
  display: flex; flex-direction: column; align-items: center;
}
.faq-root .footer-col-title {
  font-family: inherit;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.faq-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease;
}
.faq-root .footer-link:hover { color: var(--accent); }
.faq-root .social-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.faq-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.faq-root .social-icon:hover { color: var(--accent); }

/* ---- RESPONSIVE ---- */
@media (max-width: 768px) {
  .faq-root .top-nav { padding: 16px 20px; }
  .faq-root .nav-links { display: none; }
  .faq-root .main { padding: 120px 20px 60px; }
  .faq-root .page-title { font-size: 28px; }
  .faq-root .faq-item summary { padding: 16px 18px; font-size: 14px; }
  .faq-root .faq-answer { padding: 0 18px 20px; font-size: 13.5px; }
  .faq-root .category-title { font-size: 18px; }
  .faq-root .footer-grid { flex-direction: column; align-items: center; gap: 32px; }
}
`;

/* ================================================================
   Component
   ================================================================ */

export default function FAQPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { ready, authenticated } = usePrivy();
  const isLoggedIn = ready && authenticated;
  const rootRef = useRef<HTMLDivElement>(null);

  // Theme sync
  useEffect(() => {
    if (!resolvedTheme) return;
    try {
      const stored = localStorage.getItem("wavcash-theme");
      if (stored && stored !== resolvedTheme) {
        setNextTheme(stored);
        return;
      }
    } catch {}
    rootRef.current?.setAttribute(
      "data-theme",
      resolvedTheme === "light" ? "light" : "dark"
    );
  }, [resolvedTheme, setNextTheme]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setNextTheme(next);
    try {
      localStorage.setItem("wavcash-theme", next);
    } catch {}
  }, [resolvedTheme, setNextTheme]);

  const goCta = useCallback(() => {
    router.push(isLoggedIn ? "/dashboard" : "/login");
  }, [isLoggedIn, router]);

  // Track which item is open for single-open behavior
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  function handleToggle(key: string) {
    setOpenIndex((prev) => (prev === key ? null : key));
  }

  return (
    <div className="faq-root" ref={rootRef} data-theme="dark">
      <style dangerouslySetInnerHTML={{ __html: FAQ_CSS }} />
      <MercuryCanvas />

      {/* Nav */}
      <nav className="top-nav">
        <Link href="/" className="nav-logo">
          <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
          </svg>
          WavCash
        </Link>
        <div className="nav-links">
          <Link href="/sniffer" className="nav-link">Royalty Sniffer</Link>
          <Link href="/splits" className="nav-link">Splits</Link>
          <Link href="/reclaim" className="nav-link">Reclaim</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
        </div>
        <div className="nav-right">
          <div className="nav-hit">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
          </div>
          <div className="nav-hit">
            <button className="nav-cta" onClick={goCta}>
              {isLoggedIn ? "Dashboard" : "Get Started"}
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="main">
        <div className="page-header">
          <h1 className="page-title">Frequently Asked Questions</h1>
          <p className="page-subtitle">
            Everything you need to know about royalties, splits, publishing, and collecting what you&apos;re owed.
          </p>
        </div>

        {FAQ_DATA.map((category, ci) => (
          <div key={ci} className="faq-category">
            <h2 className="category-title">{category.title}</h2>
            {category.items.map((item, qi) => {
              const key = `${ci}-${qi}`;
              const isOpen = openIndex === key;
              return (
                <details
                  key={key}
                  className="faq-item"
                  open={isOpen}
                >
                  <summary
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggle(key);
                    }}
                  >
                    {item.q}
                  </summary>
                  <div className="faq-answer">
                    {item.a.split("\n\n").map((paragraph, pi) => (
                      <p key={pi}>{paragraph.split(/(\*\*[^*]+\*\*)/).map((chunk, ci) =>
                        chunk.startsWith("**") && chunk.endsWith("**")
                          ? <strong key={ci}>{chunk.slice(2, -2)}</strong>
                          : chunk
                      )}</p>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ))}
        {/* ======== Footer ======== */}
        <div className="sp-footer">
          <div className="footer-grid">
            <div>
              <div className="footer-col-title">Legal</div>
              <a href="/terms" className="footer-link">Terms</a>
              <a href="/privacy" className="footer-link">Privacy Policy</a>
            </div>
            <div>
              <div className="footer-col-title">Docs</div>
              <a href="/faq" className="footer-link">FAQs</a>
              <a href="/docs" className="footer-link">White paper</a>
            </div>
            <div>
              <div className="footer-col-title">Social</div>
              <div className="social-col">
                <a href="https://x.com/wavcash" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="X (Twitter)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="mailto:hello@wav.cash" className="social-icon" aria-label="Email">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

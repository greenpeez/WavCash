"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authFetch } from "@/lib/auth/client";

interface WalkthroughProps {
  walletCreated: boolean;
  userId: string;
  onComplete: () => void;
}

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  actionItem?: string;
  /** href of the sidebar nav link to elevate above tint, or null for centered dialog */
  navTarget: string | null;
}

const STEPS: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to WavCash!",
    description: "", // Set dynamically based on walletCreated
    navTarget: null,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "See your total estimated royalties, top tracks, and platform breakdowns at a glance.",
    actionItem: "Connect your Spotify account to get started",
    navTarget: "/dashboard",
  },
  {
    id: "tracks",
    title: "Tracks",
    description:
      "Browse your full catalog with ISRCs, stream counts, and per-track earnings.",
    actionItem: "Import your catalog via Spotify",
    navTarget: "/dashboard/tracks",
  },
  {
    id: "actuals",
    title: "Actuals",
    description:
      "Upload distributor statements and compare actual payouts against estimated royalties.",
    actionItem: "Upload your first royalty statement",
    navTarget: "/dashboard/actuals",
  },
  {
    id: "splits",
    title: "Splits",
    description:
      "Create, sign, and manage split agreements with collaborators.",
    actionItem: "Create your first split agreement",
    navTarget: "/dashboard/splits",
  },
  {
    id: "reclaim",
    title: "Reclaim",
    description:
      "Register with collecting societies in your country to claim uncollected royalties.",
    actionItem: "Start a CMO registration",
    navTarget: "/dashboard/reclaim",
  },
  {
    id: "complete",
    title: "You're all set!",
    description: "Your WavCash dashboard is ready. Start exploring.",
    navTarget: null,
  },
];

export default function Walkthrough({ walletCreated, userId, onComplete }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dialogStyle, setDialogStyle] = useState<React.CSSProperties>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const highlightedNavRef = useRef<HTMLElement | null>(null);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  // Skip walkthrough on mobile (sidebar hidden)
  useEffect(() => {
    if (window.innerWidth < 768) {
      completeWalkthrough();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Elevate sidebar above overlay on nav steps, highlight the target nav link
  useEffect(() => {
    const sidebar = document.querySelector(".dash-sidebar") as HTMLElement | null;

    // Remove highlight from previous nav link
    if (highlightedNavRef.current) {
      highlightedNavRef.current.classList.remove("walkthrough-nav-highlight");
      highlightedNavRef.current = null;
    }

    if (step.navTarget && sidebar) {
      // Raise entire sidebar above the overlay so nav links are visible
      sidebar.style.zIndex = "52";

      // Highlight the specific nav link
      const navLink = document.querySelector(
        `.dash-nav-link[href="${step.navTarget}"]`
      ) as HTMLElement | null;

      if (navLink) {
        navLink.classList.add("walkthrough-nav-highlight");
        highlightedNavRef.current = navLink;
      }
    } else if (sidebar) {
      // Centered steps: sidebar stays below overlay
      sidebar.style.zIndex = "50";
    }

    return () => {
      // Cleanup on unmount
      if (highlightedNavRef.current) {
        highlightedNavRef.current.classList.remove("walkthrough-nav-highlight");
        highlightedNavRef.current = null;
      }
      if (sidebar) {
        sidebar.style.zIndex = "50";
      }
    };
  }, [step]);

  // Position the dialog using pixel values only (no transform) for smooth transitions
  const positionDialog = useCallback(() => {
    const dialogWidth = 360;

    if (!step.navTarget) {
      // Centered in the main content area (right of sidebar)
      const contentCenterX = 260 + (window.innerWidth - 260) / 2;
      const dialogHeight = dialogRef.current?.offsetHeight || 280;
      const centerY = window.innerHeight / 2;

      setDialogStyle({
        position: "fixed",
        top: centerY - dialogHeight / 2,
        left: contentCenterX - dialogWidth / 2,
      });
      return;
    }

    // Sidebar step: position next to the nav link
    const navLink = document.querySelector(
      `.dash-nav-link[href="${step.navTarget}"]`
    ) as HTMLElement | null;

    if (!navLink) {
      const contentCenterX = 260 + (window.innerWidth - 260) / 2;
      const dialogHeight = dialogRef.current?.offsetHeight || 280;
      const centerY = window.innerHeight / 2;

      setDialogStyle({
        position: "fixed",
        top: centerY - dialogHeight / 2,
        left: contentCenterX - dialogWidth / 2,
      });
      return;
    }

    const rect = navLink.getBoundingClientRect();

    const dialogTop = Math.max(
      120,
      Math.min(rect.top - 20, window.innerHeight - 320)
    );
    setDialogStyle({
      position: "fixed",
      top: dialogTop,
      left: 275,
    });
  }, [step]);

  useEffect(() => {
    positionDialog();
    window.addEventListener("resize", positionDialog);
    return () => window.removeEventListener("resize", positionDialog);
  }, [positionDialog]);

  function completeWalkthrough() {
    // Restore sidebar z-index
    const sidebar = document.querySelector(".dash-sidebar") as HTMLElement | null;
    if (sidebar) {
      sidebar.style.zIndex = "50";
    }
    // Remove highlight from nav link
    if (highlightedNavRef.current) {
      highlightedNavRef.current.classList.remove("walkthrough-nav-highlight");
      highlightedNavRef.current = null;
    }
    // Set user-scoped localStorage immediately for instant check
    try {
      localStorage.setItem(`wavcash-walkthrough-complete:${userId}`, "true");
    } catch {}
    // Persist to DB
    authFetch("/api/user/complete-walkthrough", { method: "POST" }).catch(
      () => {}
    );
    onComplete();
  }

  function handleNext() {
    if (isLast) {
      completeWalkthrough();
    } else {
      // Fade out → swap step → fade in (masks position jump)
      if (dialogRef.current) dialogRef.current.style.opacity = "0";
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
        requestAnimationFrame(() => {
          if (dialogRef.current) dialogRef.current.style.opacity = "1";
        });
      }, 200);
    }
  }

  // Build description for welcome step
  const description =
    step.id === "welcome"
      ? walletCreated
        ? "Account created. Let's get started."
        : "Let's get started."
      : step.description;

  return (
    <>
      {/* Overlay tint — above screen, below dialog and elevated sidebar */}
      <div className="walkthrough-overlay" onClick={(e) => e.stopPropagation()} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="walkthrough-dialog"
        style={dialogStyle}
      >
        {/* Step indicator */}
        <div className="walkthrough-step-indicator">
          <span className="walkthrough-step-number">
            {currentStep + 1}/{STEPS.length}
          </span>
        </div>

        {/* Content */}
        <h3 className="walkthrough-title">{step.title}</h3>
        <p className="walkthrough-description">{description}</p>

        {/* Action item pill */}
        {step.actionItem && (
          <div className="walkthrough-action-pill">{step.actionItem}</div>
        )}

        {/* Footer */}
        <div className="walkthrough-footer">
          <button
            className="walkthrough-next-btn"
            onClick={handleNext}
          >
            {isLast ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}

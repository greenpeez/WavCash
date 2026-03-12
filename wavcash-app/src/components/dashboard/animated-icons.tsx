/**
 * Animated Nav Icons
 * ==================
 * Drop-in replacements for lucide-react sidebar icons.
 * Same 24×24 viewBox, same strokes, same currentColor — but with
 * CSS class hooks for hover micro-animations triggered by
 * `.dash-nav-link:hover` in globals.css.
 *
 * Each icon's animated paths carry `.ani-*` classes.
 * Static parts have no animation class.
 */

interface IconProps {
  className?: string;
}

/* ── BarChart3 (Dashboard) ──────────────────────────────────────────────── */

export function AniBarChart({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Axis — static */}
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      {/* Bars — animated: staggered grow from bottom */}
      <path d="M8 17v-3" className="ani-bar ani-bar-1" />
      <path d="M13 17V5" className="ani-bar ani-bar-2" />
      <path d="M18 17V9" className="ani-bar ani-bar-3" />
    </svg>
  );
}

/* ── Music (Tracks) ─────────────────────────────────────────────────────── */

export function AniMusic({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Stem — static */}
      <path d="M9 18V5l12-2v13" />
      {/* Note circles — animated: bounce */}
      <circle cx="6" cy="18" r="3" className="ani-note ani-note-1" />
      <circle cx="18" cy="16" r="3" className="ani-note ani-note-2" />
    </svg>
  );
}

/* ── FileSpreadsheet (Actuals) ──────────────────────────────────────────── */

export function AniFileSpreadsheet({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* File outline — static */}
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      {/* Corner fold — static */}
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      {/* Cells — animated: staggered fade-in */}
      <path d="M8 13h2" className="ani-cell ani-cell-1" />
      <path d="M14 13h2" className="ani-cell ani-cell-2" />
      <path d="M8 17h2" className="ani-cell ani-cell-3" />
      <path d="M14 17h2" className="ani-cell ani-cell-4" />
    </svg>
  );
}

/* ── Split (Splits) ─────────────────────────────────────────────────────── */

export function AniSplit({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Corners — animated: spread apart */}
      <path d="M16 3h5v5" className="ani-fork ani-fork-r" />
      <path d="M8 3H3v5" className="ani-fork ani-fork-l" />
      {/* Lines — static */}
      <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
      <path d="m15 9 6-6" />
    </svg>
  );
}

/* ── LockOpen (Reclaim) ─────────────────────────────────────────────────── */

export function AniLockOpen({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Lock body — static */}
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      {/* Keyhole — static */}
      <circle cx="12" cy="16" r="1" />
      {/* Shackle — animated: lifts open */}
      <path d="M7 11V7a5 5 0 0 1 9.9-1" className="ani-shackle" />
    </svg>
  );
}

/* ── Settings ───────────────────────────────────────────────────────────── */

export function AniSettings({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Gear teeth — animated: rotate */}
      <path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        className="ani-gear"
      />
      {/* Center dot — static */}
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ── LogOut (Sign out) ──────────────────────────────────────────────────── */

export function AniLogOut({ className = "" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Door frame — static */}
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      {/* Arrow — animated: slide right and bounce back */}
      <path d="m16 17 5-5-5-5" className="ani-arrow" />
      <path d="M21 12H9" className="ani-arrow" />
    </svg>
  );
}

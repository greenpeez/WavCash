interface InviteEmailParams {
  senderName: string;
  trackTitle: string;
  contributorName: string;
  role: string;
  percentage: number;
  signUrl: string;
}

/**
 * Builds an HTML email for inviting a contributor to sign a royalty split agreement.
 * Defaults to dark mode (inline styles). Light mode applied via
 * @media (prefers-color-scheme: light) for clients that support it.
 *
 * NOTE — Logo: The header uses an inline SVG waveform icon. Most email clients
 * (Gmail, Outlook, Yahoo) strip inline SVGs. Once the app is hosted on a live
 * domain, replace the SVG with a hosted PNG:
 *   <img src="https://wav.cash/logo-icon.png" alt="" width="22" height="18" />
 * and add a light-mode variant or use a transparent PNG that works on both.
 */
export function buildInviteEmailHtml(params: InviteEmailParams): string {
  const {
    senderName,
    trackTitle,
    contributorName,
    role,
    percentage,
    signUrl,
  } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: light) {
      .wc-body { background: #F8F6F3 !important; color: #1A1A1A !important; }
      .wc-text { color: #1A1A1A !important; }
      .wc-muted { color: #555555 !important; }
      .wc-dim { color: #777777 !important; }
      .wc-card { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.10) !important; }
      .wc-track { background: rgba(212,136,58,0.06) !important; border-color: rgba(212,136,58,0.15) !important; }
      .wc-details { background: rgba(0,0,0,0.03) !important; }
      .wc-divider { background: rgba(0,0,0,0.10) !important; }
      .wc-btn-secondary { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.10) !important; color: #1A1A1A !important; }
      .wc-logo-line { stroke: #1A1A1A !important; }
    }
  </style>
</head>
<body class="wc-body" style="margin:0;padding:0;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#E8ECF0;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="22" height="18" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line class="wc-logo-line" x1="13" y1="2" x2="13" y2="20" stroke="#E8ECF0" stroke-width="3" stroke-linecap="round" />
          <line class="wc-logo-line" x1="9" y1="4" x2="9" y2="18" stroke="#E8ECF0" stroke-width="2" stroke-linecap="round" opacity="0.6" />
          <line class="wc-logo-line" x1="17" y1="4" x2="17" y2="18" stroke="#E8ECF0" stroke-width="2" stroke-linecap="round" opacity="0.6" />
          <line class="wc-logo-line" x1="5.5" y1="6" x2="5.5" y2="16" stroke="#E8ECF0" stroke-width="1.2" stroke-linecap="round" opacity="0.3" />
          <line class="wc-logo-line" x1="20.5" y1="6" x2="20.5" y2="16" stroke="#E8ECF0" stroke-width="1.2" stroke-linecap="round" opacity="0.3" />
        </svg>
        <span class="wc-text" style="font-size:20px;font-weight:700;color:#E8ECF0;letter-spacing:-0.5px;">WavCash</span>
      </div>
    </div>

    <!-- Card -->
    <div class="wc-card" style="background:rgba(232,236,240,0.06);border:1px solid rgba(232,236,240,0.12);border-radius:16px;padding:32px 28px;">
      <p class="wc-muted" style="font-size:14px;color:#9AA8B4;margin:0 0 6px;">Hi ${contributorName},</p>
      <h1 class="wc-text" style="font-size:20px;font-weight:700;margin:0 0 16px;color:#E8ECF0;">
        ${senderName} has invited you to claim ${percentage}% royalties
      </h1>

      <!-- Track info -->
      <div class="wc-track" style="background:rgba(212,136,58,0.08);border:1px solid rgba(212,136,58,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p class="wc-muted" style="margin:0;font-size:13px;color:#9AA8B4;">Track</p>
        <p class="wc-text" style="margin:2px 0 0;font-size:15px;font-weight:600;color:#E8ECF0;">${trackTitle}</p>
      </div>

      <!-- Details -->
      <div class="wc-details" style="background:rgba(232,236,240,0.04);border-radius:8px;padding:10px 16px;margin-bottom:24px;display:flex;align-items:center;">
        <div style="flex:3;text-align:center;">
          <p class="wc-dim" style="margin:0;font-size:11px;color:#788898;">Role</p>
          <p class="wc-text" style="margin:2px 0 0;font-size:14px;font-weight:600;color:#E8ECF0;">${role}</p>
        </div>
        <div class="wc-divider" style="width:1px;height:28px;background:rgba(232,236,240,0.12);margin:0 12px;"></div>
        <div style="flex:2;text-align:center;">
          <p class="wc-dim" style="margin:0;font-size:11px;color:#788898;">Your Share</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#D4883A;">${percentage}%</p>
        </div>
      </div>

      <!-- CTAs -->
      <a href="${signUrl}" style="display:block;width:100%;padding:14px 24px;background:#D4883A;color:#000;text-align:center;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:10px;box-sizing:border-box;">
        Review &amp; Sign
      </a>
      <a class="wc-btn-secondary" href="${signUrl}" style="display:block;width:100%;padding:12px 24px;background:rgba(232,236,240,0.06);border:1px solid rgba(232,236,240,0.12);color:#E8ECF0;text-align:center;text-decoration:none;border-radius:10px;font-size:14px;font-weight:500;box-sizing:border-box;">
        View Contract
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:28px;">
      <p class="wc-dim" style="font-size:11px;color:#788898;margin:0;">
        You received this email because ${senderName} added you as a contributor on WavCash.
      </p>
      <p style="font-size:11px;margin:4px 0 0;">
        <a href="https://wav.cash" style="color:#D4883A;text-decoration:none;">wav.cash</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds a plain-text fallback for the invite email.
 */
export function buildInviteEmailText(params: InviteEmailParams): string {
  const { senderName, trackTitle, contributorName, role, percentage, signUrl } = params;
  return `Hi ${contributorName},

${senderName} has invited you to claim ${percentage}% royalties on "${trackTitle}".

Role: ${role}
Your Share: ${percentage}%

Review & Sign: ${signUrl}

---
WavCash | wav.cash`;
}

// ─── Creator Self-Invite (Reminder) ─────────────────────────────────────────

interface CreatorReminderParams {
  creatorName: string;
  trackTitle: string;
  role: string;
  percentage: number;
  signUrl: string;
}

/**
 * Builds an HTML email reminding the creator to sign their own split agreement.
 * Same visual design as the invite email but with different copy.
 */
export function buildCreatorReminderEmailHtml(params: CreatorReminderParams): string {
  const { creatorName, trackTitle, role, percentage, signUrl } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    @media (prefers-color-scheme: light) {
      .wc-body { background: #F8F6F3 !important; color: #1A1A1A !important; }
      .wc-text { color: #1A1A1A !important; }
      .wc-muted { color: #555555 !important; }
      .wc-dim { color: #777777 !important; }
      .wc-card { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.10) !important; }
      .wc-track { background: rgba(212,136,58,0.06) !important; border-color: rgba(212,136,58,0.15) !important; }
      .wc-details { background: rgba(0,0,0,0.03) !important; }
      .wc-divider { background: rgba(0,0,0,0.10) !important; }
      .wc-btn-secondary { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.10) !important; color: #1A1A1A !important; }
      .wc-logo-line { stroke: #1A1A1A !important; }
    }
  </style>
</head>
<body class="wc-body" style="margin:0;padding:0;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#E8ECF0;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="22" height="18" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line class="wc-logo-line" x1="13" y1="2" x2="13" y2="20" stroke="#E8ECF0" stroke-width="3" stroke-linecap="round" />
          <line class="wc-logo-line" x1="9" y1="4" x2="9" y2="18" stroke="#E8ECF0" stroke-width="2" stroke-linecap="round" opacity="0.6" />
          <line class="wc-logo-line" x1="17" y1="4" x2="17" y2="18" stroke="#E8ECF0" stroke-width="2" stroke-linecap="round" opacity="0.6" />
          <line class="wc-logo-line" x1="5.5" y1="6" x2="5.5" y2="16" stroke="#E8ECF0" stroke-width="1.2" stroke-linecap="round" opacity="0.3" />
          <line class="wc-logo-line" x1="20.5" y1="6" x2="20.5" y2="16" stroke="#E8ECF0" stroke-width="1.2" stroke-linecap="round" opacity="0.3" />
        </svg>
        <span class="wc-text" style="font-size:20px;font-weight:700;color:#E8ECF0;letter-spacing:-0.5px;">WavCash</span>
      </div>
    </div>

    <!-- Card -->
    <div class="wc-card" style="background:rgba(232,236,240,0.06);border:1px solid rgba(232,236,240,0.12);border-radius:16px;padding:32px 28px;">
      <p class="wc-muted" style="font-size:14px;color:#9AA8B4;margin:0 0 6px;">Hi ${creatorName},</p>
      <h1 class="wc-text" style="font-size:20px;font-weight:700;margin:0 0 16px;color:#E8ECF0;">
        Sign your Split Agreement
      </h1>
      <p class="wc-muted" style="font-size:14px;color:#9AA8B4;margin:0 0 20px;line-height:1.5;">
        You created a new split agreement on WavCash. Don\u2019t forget to sign it so the contract can activate.
      </p>

      <!-- Track info -->
      <div class="wc-track" style="background:rgba(212,136,58,0.08);border:1px solid rgba(212,136,58,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <p class="wc-muted" style="margin:0;font-size:13px;color:#9AA8B4;">Track</p>
        <p class="wc-text" style="margin:2px 0 0;font-size:15px;font-weight:600;color:#E8ECF0;">${trackTitle}</p>
      </div>

      <!-- Details -->
      <div class="wc-details" style="background:rgba(232,236,240,0.04);border-radius:8px;padding:10px 16px;margin-bottom:24px;display:flex;align-items:center;">
        <div style="flex:3;text-align:center;">
          <p class="wc-dim" style="margin:0;font-size:11px;color:#788898;">Role</p>
          <p class="wc-text" style="margin:2px 0 0;font-size:14px;font-weight:600;color:#E8ECF0;">${role}</p>
        </div>
        <div class="wc-divider" style="width:1px;height:28px;background:rgba(232,236,240,0.12);margin:0 12px;"></div>
        <div style="flex:2;text-align:center;">
          <p class="wc-dim" style="margin:0;font-size:11px;color:#788898;">Your Share</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#D4883A;">${percentage}%</p>
        </div>
      </div>

      <!-- CTAs -->
      <a href="${signUrl}" style="display:block;width:100%;padding:14px 24px;background:#D4883A;color:#000;text-align:center;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:10px;box-sizing:border-box;">
        Review &amp; Sign
      </a>
      <a class="wc-btn-secondary" href="${signUrl}" style="display:block;width:100%;padding:12px 24px;background:rgba(232,236,240,0.06);border:1px solid rgba(232,236,240,0.12);color:#E8ECF0;text-align:center;text-decoration:none;border-radius:10px;font-size:14px;font-weight:500;box-sizing:border-box;">
        View Contract
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:28px;">
      <p class="wc-dim" style="font-size:11px;color:#788898;margin:0;">
        You received this email because you added yourself as a contributor to a split agreement on WavCash.
      </p>
      <p style="font-size:11px;margin:4px 0 0;">
        <a href="https://wav.cash" style="color:#D4883A;text-decoration:none;">wav.cash</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds a plain-text fallback for the creator reminder email.
 */
export function buildCreatorReminderEmailText(params: CreatorReminderParams): string {
  const { creatorName, trackTitle, role, percentage, signUrl } = params;
  return `Hi ${creatorName},

You created a new split agreement on WavCash. Don't forget to sign it so the contract can activate.

Track: ${trackTitle}
Role: ${role}
Your Share: ${percentage}%

Review & Sign: ${signUrl}

---
WavCash | wav.cash`;
}

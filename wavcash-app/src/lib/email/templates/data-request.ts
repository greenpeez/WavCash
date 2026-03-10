// ─── Data Request Email Templates ─────────────────────────────────────────────
// Acknowledgment (auto-sent on receipt) and Completion (triggered from admin).
// Same design system as invite.ts: dark default, light @media, Plus Jakarta Sans.

interface AcknowledgmentParams {
  name: string;
  date: string;
  requestType: string;
  reference: string;
}

interface CompletionParams {
  name: string;
  requestType: string;
  date: string;
  completionSummary: string;
}

// ─── Shared ──────────────────────────────────────────────────────────────────

const LIGHT_STYLES = `
  @media (prefers-color-scheme: light) {
    .wc-body { background: #F8F6F3 !important; color: #1A1A1A !important; }
    .wc-text { color: #1A1A1A !important; }
    .wc-muted { color: #555555 !important; }
    .wc-dim { color: #777777 !important; }
    .wc-card { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.10) !important; }
    .wc-logo-line { stroke: #1A1A1A !important; }
  }
`;

const HEADER = `
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
</div>`;

const FOOTER = `
<div style="text-align:center;margin-top:28px;">
  <p class="wc-dim" style="font-size:11px;color:#788898;margin:0;">
    WavCash Privacy
  </p>
  <p style="font-size:11px;margin:4px 0 0;">
    <a href="https://wav.cash" style="color:#D4883A;text-decoration:none;">wav.cash</a>
  </p>
</div>`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Acknowledgment ──────────────────────────────────────────────────────────

export function buildAcknowledgmentEmailHtml(params: AcknowledgmentParams): string {
  const { name, date, requestType, reference } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    ${LIGHT_STYLES}
  </style>
</head>
<body class="wc-body" style="margin:0;padding:0;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#E8ECF0;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    ${HEADER}

    <div class="wc-card" style="background:rgba(232,236,240,0.06);border:1px solid rgba(232,236,240,0.12);border-radius:16px;padding:32px 28px;">
      <p class="wc-muted" style="font-size:14px;color:#9AA8B4;margin:0 0 6px;">Hi ${escapeHtml(name)},</p>
      <p class="wc-text" style="font-size:14px;color:#E8ECF0;line-height:1.6;margin:0 0 20px;">
        We received your data rights request on ${escapeHtml(date)}. Your request has been logged and we will complete it within 30 days.
      </p>

      <div style="background:rgba(232,236,240,0.04);border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="margin-bottom:8px;">
          <p class="wc-dim" style="margin:0;font-size:11px;color:#788898;">Request type</p>
          <p class="wc-text" style="margin:2px 0 0;font-size:14px;font-weight:600;color:#E8ECF0;">${escapeHtml(requestType)}</p>
        </div>
        <div>
          <p class="wc-dim" style="margin:0;font-size:11px;color:#788898;">Reference</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#D4883A;">${escapeHtml(reference)}</p>
        </div>
      </div>

      <p class="wc-muted" style="font-size:13px;color:#9AA8B4;line-height:1.5;margin:0;">
        If we need any additional information from you to complete the request, we will reach out to this email address. If you have questions in the meantime, reply to this email or contact us at <a href="mailto:privacy@wav.cash" style="color:#D4883A;text-decoration:none;">privacy@wav.cash</a>.
      </p>
    </div>

    <div style="text-align:center;margin-top:20px;">
      <p class="wc-muted" style="font-size:13px;color:#9AA8B4;margin:0;">Best,</p>
      <p class="wc-text" style="font-size:13px;font-weight:600;color:#E8ECF0;margin:2px 0 0;">WavCash</p>
    </div>

    ${FOOTER}
  </div>
</body>
</html>`;
}

export function buildAcknowledgmentEmailText(params: AcknowledgmentParams): string {
  const { name, date, requestType, reference } = params;
  return `Hi ${name},

We received your data rights request on ${date}. Your request has been logged and we will complete it within 30 days.

Request type: ${requestType}
Reference: ${reference}

If we need any additional information from you to complete the request, we will reach out to this email address. If you have questions in the meantime, reply to this email or contact us at privacy@wav.cash.

Best,
WavCash

---
WavCash | wav.cash`;
}

// ─── Completion ──────────────────────────────────────────────────────────────

export function buildCompletionEmailHtml(params: CompletionParams): string {
  const { name, requestType, date, completionSummary } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    ${LIGHT_STYLES}
  </style>
</head>
<body class="wc-body" style="margin:0;padding:0;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#E8ECF0;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    ${HEADER}

    <div class="wc-card" style="background:rgba(232,236,240,0.06);border:1px solid rgba(232,236,240,0.12);border-radius:16px;padding:32px 28px;">
      <p class="wc-muted" style="font-size:14px;color:#9AA8B4;margin:0 0 6px;">Hi ${escapeHtml(name)},</p>
      <p class="wc-text" style="font-size:14px;color:#E8ECF0;line-height:1.6;margin:0 0 20px;">
        Your ${escapeHtml(requestType)} request submitted on ${escapeHtml(date)} has been completed.
      </p>

      <div style="background:rgba(232,236,240,0.04);border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <p class="wc-text" style="font-size:14px;color:#E8ECF0;line-height:1.6;margin:0;">
          ${escapeHtml(completionSummary)}
        </p>
      </div>

      <p class="wc-muted" style="font-size:13px;color:#9AA8B4;line-height:1.5;margin:0 0 16px;">
        If you have any questions about this response or believe we have not fully honored your request, you may reply to this email or contact <a href="mailto:privacy@wav.cash" style="color:#D4883A;text-decoration:none;">privacy@wav.cash</a>.
      </p>

      <p class="wc-muted" style="font-size:13px;color:#9AA8B4;line-height:1.5;margin:0 0 8px;">
        You also have the right to escalate a complaint to a supervisory authority:
      </p>
      <ul style="margin:0;padding:0 0 0 18px;">
        <li class="wc-muted" style="font-size:12px;color:#9AA8B4;margin-bottom:4px;">
          EU/Portugal: <a href="https://www.cnpd.pt" style="color:#D4883A;text-decoration:none;">CNPD</a>
        </li>
        <li class="wc-muted" style="font-size:12px;color:#9AA8B4;margin-bottom:4px;">
          UK: <a href="https://ico.org.uk" style="color:#D4883A;text-decoration:none;">ICO</a>
        </li>
        <li class="wc-muted" style="font-size:12px;color:#9AA8B4;">
          California: <a href="https://cppa.ca.gov" style="color:#D4883A;text-decoration:none;">CPPA</a>
        </li>
      </ul>
    </div>

    <div style="text-align:center;margin-top:20px;">
      <p class="wc-muted" style="font-size:13px;color:#9AA8B4;margin:0;">Best,</p>
      <p class="wc-text" style="font-size:13px;font-weight:600;color:#E8ECF0;margin:2px 0 0;">WavCash</p>
    </div>

    ${FOOTER}
  </div>
</body>
</html>`;
}

export function buildCompletionEmailText(params: CompletionParams): string {
  const { name, requestType, date, completionSummary } = params;
  return `Hi ${name},

Your ${requestType} request submitted on ${date} has been completed.

${completionSummary}

If you have any questions about this response or believe we have not fully honored your request, you may reply to this email or contact privacy@wav.cash.

You also have the right to escalate a complaint to a supervisory authority:
- EU/Portugal: CNPD — https://www.cnpd.pt
- UK: ICO — https://ico.org.uk
- California: CPPA — https://cppa.ca.gov

Best,
WavCash

---
WavCash | wav.cash`;
}

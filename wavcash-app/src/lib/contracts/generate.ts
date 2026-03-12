import type { ContractData } from "@/lib/types/contract";

// ── Legacy types (backward compat) ─────────────────────────────────────────

interface ContractContributor {
  legal_name: string;
  role: string;
  percentage: number;
  email: string;
  signed?: boolean;
  signed_at?: string | null;
}

interface GenerateContractParams {
  senderName: string;
  trackTitle: string;
  trackIsrc: string;
  contributors: ContractContributor[];
  date: string;
  contractData?: ContractData | null;
  contractAddress?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionHtml(num: number, title: string, body: string): string {
  return `<div style="page-break-inside:avoid;margin-top:28px;">
<h2 style="font-size:15px;font-weight:600;margin:0 0 8px;color:#1a1a1a;">${num}. ${esc(title)}</h2>
${body}
</div>`;
}

function p(text: string): string {
  return `<p style="margin:6px 0;font-size:13px;line-height:1.7;color:#1a1a1a;">${text}</p>`;
}

function pb(): string {
  return `<div style="page-break-before:always;"></div>`;
}

// Table header style: black fill, white text for contrast in both light/dark
const TH_STYLE = "padding:6px 8px;text-align:left;background:#111;color:#fff;font-weight:600;font-size:11px;";
const TH_STYLE_CENTER = "padding:6px 8px;text-align:center;background:#111;color:#fff;font-weight:600;font-size:11px;";

// ── Extended generator (14 sections + Exhibit A) ────────────────────────────

function generateExtendedHtml(params: GenerateContractParams): string {
  const { trackTitle, trackIsrc, contributors, date, contractData: cd, contractAddress } = params;
  if (!cd) throw new Error("contractData required for extended generator");

  const formattedDate = fmtDate(date);
  const sections: string[] = [];

  // ── Header ──
  sections.push(`<h1 style="font-size:20px;font-weight:700;text-align:center;margin-bottom:4px;color:#1a1a1a;">MUSIC ROYALTY SPLIT SHEET AGREEMENT</h1>`);
  sections.push(`<p style="text-align:center;font-size:12px;margin:0 0 24px;">Date: ${formattedDate}</p>`);

  // ── Section 1: Work Identification ──
  {
    const rows: string[] = [];
    rows.push(`<tr><td style="padding:4px 8px;font-weight:500;width:180px;">Track Title</td><td style="padding:4px 8px;">${esc(trackTitle)}</td></tr>`);
    rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">ISRC</td><td style="padding:4px 8px;font-family:monospace;font-size:12px;">${esc(trackIsrc)}</td></tr>`);
    if (cd.work.alternate_titles)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Alternate Titles</td><td style="padding:4px 8px;">${esc(cd.work.alternate_titles)}</td></tr>`);
    if (cd.work.iswc_code)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">ISWC</td><td style="padding:4px 8px;font-family:monospace;font-size:12px;">${esc(cd.work.iswc_code)}</td></tr>`);
    if (cd.work.date_of_creation)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Date of Creation</td><td style="padding:4px 8px;">${esc(cd.work.date_of_creation)}</td></tr>`);
    if (cd.work.recording_session_dates)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Session Dates</td><td style="padding:4px 8px;">${esc(cd.work.recording_session_dates)}</td></tr>`);
    if (cd.work.genre)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Genre</td><td style="padding:4px 8px;">${esc(cd.work.genre)}</td></tr>`);
    if (cd.work.anticipated_release_date)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Release Date</td><td style="padding:4px 8px;">${esc(cd.work.anticipated_release_date)}</td></tr>`);
    if (cd.work.distributor_or_label)
      rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Distributor / Label</td><td style="padding:4px 8px;">${esc(cd.work.distributor_or_label)}</td></tr>`);
    rows.push(`<tr><td style="padding:4px 8px;font-weight:500;">Samples Used</td><td style="padding:4px 8px;">${cd.work.samples_used ? "Yes" : "No"}</td></tr>`);

    const table = `<table style="width:100%;border-collapse:collapse;font-size:13px;">${rows.join("")}</table>`;
    sections.push(sectionHtml(1, "IDENTIFICATION OF THE WORK", table));
  }

  // ── Section 2: Parties ──
  {
    const contribRows = contributors.map((c, i) => {
      const extras = cd.contributor_extras[Object.keys(cd.contributor_extras)[i]] || {};
      const pub = extras.publishing_type === "publisher"
        ? ` | Publisher: ${esc(extras.publisher_name)}`
        : " | Self-Published";
      const pro = extras.pro_affiliation ? ` | PRO: ${esc(extras.pro_affiliation)}` : "";
      const ipi = extras.ipi_number ? ` | IPI: ${esc(extras.ipi_number)}` : "";
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${i + 1}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:500;">${esc(c.legal_name)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(c.role)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;">${c.percentage}%</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${esc(c.email)}${pro}${ipi}${pub}</td>
      </tr>`;
    });

    const body = `${p('The following parties ("Contributors") agree to the terms set forth in this Agreement for the above-referenced musical work:')}
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
      <thead><tr>
        <th style="${TH_STYLE}">#</th>
        <th style="${TH_STYLE}">Name</th>
        <th style="${TH_STYLE}">Role</th>
        <th style="${TH_STYLE}">Share</th>
        <th style="${TH_STYLE}">Details</th>
      </tr></thead>
      <tbody>${contribRows.join("")}</tbody>
    </table>`;
    sections.push(sectionHtml(2, "PARTIES", body));
  }

  // ── Section 3: Composition Ownership & Publishing ──
  {
    const rows = Object.entries(cd.composition_splits).map(([id, split]) => {
      const contrib = contributors.find((_, i) => Object.keys(cd.contributor_extras)[i] === id);
      const name = contrib?.legal_name || id;
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(name)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;text-align:center;">${split.writer_share_pct}%</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;text-align:center;">${split.publisher_share_pct}%</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;text-align:center;">${split.writer_share_pct + split.publisher_share_pct}%</td>
      </tr>`;
    });

    const body = `${p("The composition (underlying musical work) is divided into Writer's Share and Publisher's Share as follows:")}
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
      <thead><tr>
        <th style="${TH_STYLE}">Contributor</th>
        <th style="${TH_STYLE_CENTER}">Writer %</th>
        <th style="${TH_STYLE_CENTER}">Publisher %</th>
        <th style="${TH_STYLE_CENTER}">Total</th>
      </tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>`;
    sections.push(sectionHtml(3, "COMPOSITION OWNERSHIP & PUBLISHING SPLITS", body));
  }

  // ── Section 4: Master Recording Ownership ──
  {
    let body = p(`Ownership structure: <strong>${esc(cd.master.ownership_type)}</strong>`);
    if (cd.master.ownership_type === "single" && cd.master.owner_name) {
      body += p(`The master recording is wholly owned by ${esc(cd.master.owner_name)}.`);
    }
    if (cd.master.ownership_type === "joint" && cd.master.splits) {
      const rows = Object.entries(cd.master.splits).map(([id, ms]) => {
        const contrib = contributors.find((_, i) => Object.keys(cd.contributor_extras)[i] === id);
        const name = contrib?.legal_name || id;
        const pubInfo = ms.publishing_type === "publisher"
          ? `${esc(ms.publisher_name)} (${esc(ms.publisher_pro)})`
          : "Self-Published";
        return `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(name)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;text-align:center;">${ms.pct}%</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${pubInfo}</td>
        </tr>`;
      });
      body += `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
        <thead><tr>
          <th style="${TH_STYLE}">Contributor</th>
          <th style="${TH_STYLE_CENTER}">Master %</th>
          <th style="${TH_STYLE}">Publishing</th>
        </tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>`;
    }
    sections.push(sectionHtml(4, "MASTER RECORDING OWNERSHIP", body));
  }

  // ── Section 5: Royalty Distribution ──
  {
    let rateDesc = "Statutory rate";
    if (cd.royalty.mechanical_rate === "controlled") {
      rateDesc = `Controlled composition rate (${cd.royalty.controlled_pct ?? 75}% of statutory)`;
    } else if (cd.royalty.mechanical_rate === "other" && cd.royalty.mechanical_rate_description) {
      rateDesc = esc(cd.royalty.mechanical_rate_description);
    }
    const body = `${p(`<strong>Mechanical Royalty Rate:</strong> ${rateDesc}`)}
    ${p("Each Contributor shall be entitled to receive the percentage of net royalties indicated in this Agreement. These percentages represent each party's share of all royalty income generated by the Track, including but not limited to streaming revenue, sync licensing fees, and mechanical royalties collected by the distributor on behalf of the master recording owner. Composition-only royalties administered by collection societies (writer's performance share, publisher's share) are not covered by this Agreement and are collected independently by each Contributor through their respective PRO and publisher affiliations.")}
    ${p("<strong>Platform Fee:</strong> WavCash retains a processing fee of 2.5% on each royalty distribution. Contributor percentages in this Agreement are calculated on the gross amount; the 2.5% fee is deducted before distribution.")}`;
    sections.push(sectionHtml(5, "ROYALTY DISTRIBUTION", body));
  }

  // ── Section 6: Administration ──
  {
    const admin = cd.administration;
    const adminName = admin.administrating_party === "wavcash" ? "WavCash" : esc(admin.administrating_party);
    let body = p(`<strong>Administrating Party:</strong> ${adminName}`);
    body += p(`<strong>Payment Timeframe:</strong> ${admin.payment_timeframe_days} days from receipt of royalties`);
    body += p(`<strong>Accounting Frequency:</strong> ${admin.accounting_frequency}`);
    if (admin.has_third_party_publishing) {
      body += p("One or more Contributors have indicated they have a publishing agreement granting a third party rights to their share of mechanical royalties. It is each Contributor's legal responsibility to ensure their publishing partner receives appropriate payments.");
    }
    body += p("The Administrating Party shall route all distributor proceeds, including mechanical royalties collected by the distributor, through the WavCash split contract for automatic distribution.");
    body += p("WavCash automatically distributes royalties to all contributors. You must set your WavCash account as your payment destination with your distributor/DSP.");
    sections.push(sectionHtml(6, "ADMINISTRATION", body));
  }

  // ── Section 7: Sample Clearance (conditional) ──
  if (cd.samples && cd.samples.items.length > 0) {
    const sampleRows = cd.samples.items.map((s) => {
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(s.song_title)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(s.original_artist)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(s.owner)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(s.clearance_status)}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;">${s.split_adjustment_pct ?? "—"}%</td>
      </tr>`;
    });
    const body = `${p("The following samples from existing recordings are incorporated into this work:")}
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
      <thead><tr>
        <th style="${TH_STYLE}">Song</th>
        <th style="${TH_STYLE}">Artist</th>
        <th style="${TH_STYLE}">Owner</th>
        <th style="${TH_STYLE}">Status</th>
        <th style="${TH_STYLE}">Adj. %</th>
      </tr></thead>
      <tbody>${sampleRows.join("")}</tbody>
    </table>
    ${p(`<strong>Clearance Responsible Party:</strong> ${esc(cd.samples.clearance_responsible_party)}`)}
    ${p("The parties agree to redistribute payments to the rights holders of any samples used in this work.")}`;
    sections.push(sectionHtml(7, "SAMPLE CLEARANCE", body));
  }

  // ── Section 8: Work for Hire (conditional) ──
  if (cd.work_for_hire) {
    const wfh = cd.work_for_hire;
    const body = `${p(`<strong>Contributor:</strong> ${esc(wfh.contributor_name)}`)}
    ${p(`<strong>Engaging Party:</strong> ${esc(wfh.engaging_party)}`)}
    ${p(`<strong>Flat Fee:</strong> ${esc(wfh.flat_fee)}`)}
    ${p(`<strong>Retains Composition Credit:</strong> ${wfh.retains_composition_credit ? "Yes" : "No"}`)}
    ${p("The work-for-hire contributor waives all future royalty claims in exchange for the flat fee specified above. If composition credit is retained, the contributor's name shall appear in metadata and credits but carries no ongoing royalty obligation.")}`;
    sections.push(sectionHtml(8, "WORK FOR HIRE", body));
  }

  // ── Section 9: Credit & Attribution ──
  {
    const creditEntries = Object.entries(cd.credits);
    if (creditEntries.length > 0) {
      const rows = creditEntries.map(([, cr]) => {
        return `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(cr.credit_name)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(cr.role_credit)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;">${esc(cr.metadata_tag)}</td>
        </tr>`;
      });
      const body = `${p("The following credits shall appear on all releases and metadata:")}
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
        <thead><tr>
          <th style="${TH_STYLE}">Name</th>
          <th style="${TH_STYLE}">Role Credit</th>
          <th style="${TH_STYLE}">Metadata Tag</th>
        </tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>`;
      sections.push(sectionHtml(9, "CREDIT & ATTRIBUTION", body));
    }
  }

  // ── Section 10: Enforcement ──
  {
    const addrClause = contractAddress
      ? `a smart contract (<span style="font-family:monospace;font-size:11px;">${esc(contractAddress)}</span>) shall be deployed on the Avalanche C-Chain blockchain`
      : "a smart contract shall be deployed on the Avalanche C-Chain blockchain";
    const body = `${p(`Upon execution of this Agreement by all Contributors, ${addrClause} that automatically distributes funds according to the percentages specified herein. The smart contract address, once deployed, shall be appended to this Agreement as an immutable record.`)}
    ${p("All distributions are executed automatically and transparently. Each party acknowledges that the smart contract code governs the distribution of funds and that transactions are irreversible once confirmed on the blockchain.")}`;
    sections.push(sectionHtml(10, "ENFORCEMENT", body));
  }

  // ── Section 11: Term ──
  {
    const body = p("This Agreement shall remain in effect for the lifetime of the copyright in the Track, unless terminated or amended by the unanimous written consent of all Contributors.");
    sections.push(sectionHtml(11, "TERM", body));
  }

  // ── Section 12: Dispute Resolution ──
  {
    const dr = cd.dispute_resolution;
    let body = p(`The parties shall first attempt to resolve any dispute through good-faith negotiation for a period of <strong>${dr.negotiation_period_days} days</strong>.`);
    if (dr.method === "arbitration") {
      body += p("If the dispute remains unresolved, it shall be submitted to binding arbitration under the rules of the American Arbitration Association (AAA). The arbitration shall take place in the governing jurisdiction specified below.");
    } else {
      body += p("If the dispute remains unresolved, the parties consent to the exclusive jurisdiction of the courts in the governing jurisdiction specified below.");
    }
    body += p(`<strong>Governing Jurisdiction:</strong> ${esc(dr.governing_jurisdiction)}`);
    sections.push(sectionHtml(12, "DISPUTE RESOLUTION", body));
  }

  // ── Section 13: Amendments ──
  {
    const body = p("This Agreement may only be amended by a new agreement signed by all Contributors. Any such amendment shall void the existing smart contract and may require deployment of a new contract reflecting the updated terms.");
    sections.push(sectionHtml(13, "AMENDMENTS", body));
  }

  // ── Section 14: Acceptance & Signatures ──
  {
    const sigBlocks = contributors.map((c) => {
      const sigArea = c.signed && c.signed_at
        ? `<div style="margin-top:12px;">
            <p style="font-family:'Dancing Script',cursive;font-size:22px;margin:0 0 2px;color:#1a1a1a;">${esc(c.legal_name)}</p>
            <p style="font-size:10px;margin:0;color:#666;">${fmtDate(c.signed_at)}</p>
          </div>`
        : `<div style="margin-top:20px;border-top:1px solid #999;padding-top:4px;">
            <p style="font-size:10px;margin:0;">Signature / Date</p>
          </div>`;

      return `<div style="display:inline-block;width:48%;margin:8px 1%;padding:12px;border:1px solid #ddd;border-radius:6px;vertical-align:top;">
        <p style="font-size:12px;font-weight:600;margin:0 0 16px;">${esc(c.legal_name)}</p>
        <p style="font-size:11px;margin:0;">${esc(c.role)} · ${esc(c.email)}</p>
        ${sigArea}
      </div>`;
    });

    const body = `${p("By signing this Agreement (electronically through the WavCash platform), each Contributor acknowledges that they have read, understood, and agreed to all terms set forth herein.")}
    <div style="margin-top:16px;">${sigBlocks.join("")}</div>`;
    sections.push(sectionHtml(14, "ACCEPTANCE & SIGNATURES", body));
  }

  // ── Exhibit A: SoundExchange Letter of Direction (conditional) ──
  if (cd.soundexchange?.enabled) {
    sections.push(pb());
    let body = `<h2 style="font-size:16px;font-weight:700;text-align:center;margin:0 0 12px;color:#1a1a1a;">EXHIBIT A: SoundExchange Letter of Direction</h2>`;
    body += p("The undersigned parties to the above-referenced Music Royalty Split Sheet Agreement hereby direct SoundExchange to distribute their respective shares of digital performance royalties for the Track identified in Section 1 in accordance with the master recording ownership percentages specified in Section 4.");
    body += p("Each contributor listed below authorizes SoundExchange to pay their share directly to their designated account:");

    if (cd.master.splits) {
      const rows = Object.entries(cd.master.splits).map(([id, ms]) => {
        const contrib = contributors.find((_, i) => Object.keys(cd.contributor_extras)[i] === id);
        const name = contrib?.legal_name || id;
        const acct = cd.soundexchange?.accounts?.[id] || "—";
        return `<tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${esc(name)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;font-family:monospace;text-align:center;">${ms.pct}%</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;font-size:11px;">${esc(acct)}</td>
        </tr>`;
      });
      body += `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
        <thead><tr>
          <th style="${TH_STYLE}">Contributor</th>
          <th style="${TH_STYLE_CENTER}">Share</th>
          <th style="${TH_STYLE}">Account / Contact</th>
        </tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>`;
    }
    sections.push(body);
  }

  // ── Footer: Legal disclaimer ──
  sections.push(`<div style="page-break-inside:avoid;margin-top:32px;padding-bottom:24px;">
<hr style="margin:0 0 12px;border:none;border-top:1px solid #ddd;" />
<p style="text-align:center;font-size:9px;line-height:1.5;max-width:520px;margin:0 auto;">This document is provided for general informational purposes only and does not constitute legal advice. The Parties are strongly encouraged to have this Agreement reviewed by a qualified attorney prior to signing, particularly for high-value works or complex arrangements.</p>
</div>`);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Music Royalty Split Sheet Agreement</title>
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="max-width:680px;margin:0 auto;padding:32px 24px 48px;font-family:'Plus Jakarta Sans',-apple-system,sans-serif;color:#1a1a1a;font-size:13px;line-height:1.6;">
${sections.join("\n")}
</body>
</html>`;
}

// ── Legacy generators (backward compat) ────────────────────────────────────

export function generateContractText(params: GenerateContractParams): string {
  const { senderName, trackTitle, trackIsrc, contributors, date } = params;
  const formattedDate = fmtDate(date);

  const contributorList = contributors
    .map(
      (c, i) =>
        `  ${i + 1}. ${c.legal_name} ("${c.role}") - ${c.percentage}% (${c.email})`
    )
    .join("\n");

  return `ROYALTY SPLIT AGREEMENT

Date: ${formattedDate}
Created by: ${senderName}
Track: ${trackTitle}
ISRC: ${trackIsrc}

1. PARTIES

The following parties ("Contributors") agree to the royalty split percentages outlined below for the above-referenced musical work:

${contributorList}

2. ROYALTY SPLIT

Each Contributor shall be entitled to receive the percentage of net royalties indicated next to their name above. These percentages represent each party's share of all royalty income generated by the Track, including but not limited to streaming revenue, sync licensing fees, mechanical royalties, and performance royalties.

The total allocation among all Contributors equals 100%.

Platform Fee: WavCash retains a processing fee of 2.5% on each royalty distribution. Contributor percentages in this Agreement are calculated on the gross amount; the 2.5% fee is deducted before distribution.

3. ENFORCEMENT

Upon execution of this Agreement by all Contributors, a smart contract shall be deployed on the Avalanche C-Chain blockchain that automatically distributes funds according to the percentages specified herein. The smart contract address, once deployed, shall be appended to this Agreement as an immutable record.

All distributions are executed automatically and transparently. Each party acknowledges that the smart contract code governs the distribution of funds and that transactions are irreversible once confirmed on the blockchain.

4. TERM

This Agreement shall remain in effect for the lifetime of the copyright in the Track, unless terminated or amended by the unanimous written consent of all Contributors.

5. AMENDMENTS

This Agreement may only be amended by a new agreement signed by all Contributors. Any such amendment shall void the existing smart contract and may require deployment of a new contract reflecting the updated terms.

6. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction of the creating party. Disputes arising under this Agreement shall first be resolved through good-faith negotiation between the parties.

7. ACCEPTANCE

By signing this Agreement (electronically through the WavCash platform), each Contributor acknowledges that they have read, understood, and agreed to all terms set forth herein.

---
This document is provided for general informational purposes only and does not constitute legal advice. The Parties are strongly encouraged to have this Agreement reviewed by a qualified attorney prior to signing, particularly for high-value works or complex arrangements.
`;
}

export function generateContractHtml(params: GenerateContractParams): string {
  // Extended path: use full 14-section template when contract_data is present
  if (params.contractData) {
    return generateExtendedHtml(params);
  }

  // Legacy path: basic template
  const text = generateContractText(params);
  const htmlBody = text
    .split("\n")
    .map((line) => {
      if (line.startsWith("ROYALTY SPLIT AGREEMENT")) {
        return `<h1 style="font-size:22px;font-weight:700;margin-bottom:8px;">${line}</h1>`;
      }
      if (/^\d+\.\s+[A-Z]/.test(line)) {
        return `<h2 style="font-size:16px;font-weight:600;margin-top:20px;margin-bottom:6px;">${line}</h2>`;
      }
      if (line.startsWith("  ")) {
        return `<p style="margin:2px 0;padding-left:16px;font-family:monospace;font-size:13px;">${line}</p>`;
      }
      if (line.startsWith("---")) {
        return `<hr style="margin:24px 0;border:none;border-top:1px solid #ddd;" />`;
      }
      if (line.trim() === "") {
        return "<br />";
      }
      return `<p style="margin:4px 0;font-size:14px;line-height:1.6;">${line}</p>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Royalty Split Agreement</title></head>
<body style="max-width:640px;margin:0 auto;padding:32px 24px;font-family:'Plus Jakarta Sans',-apple-system,sans-serif;color:#1a1a1a;">
${htmlBody}
</body>
</html>`;
}

"use client";

import { useMemo } from "react";
import { useWizard } from "./wizard-context";

interface FieldCheck {
  label: string;
  filled: boolean;
  required: boolean;
}

export default function CompletenessScore() {
  const { state } = useWizard();

  const { score, missing } = useMemo(() => {
    const checks: FieldCheck[] = [];

    // Required checks (weighted 2x)
    checks.push({
      label: "Track selected",
      filled: !!state.trackId,
      required: true,
    });
    checks.push({
      label: "At least one contributor",
      filled: state.contributors.length > 0,
      required: true,
    });
    checks.push({
      label: "All contributors have names",
      filled: state.contributors.every((c) => c.legal_name.trim()),
      required: true,
    });
    checks.push({
      label: "All contributors have emails",
      filled: state.contributors.every((c) => c.email.trim()),
      required: true,
    });
    checks.push({
      label: "Governing jurisdiction set",
      filled: !!state.disputeResolution.governing_jurisdiction?.trim(),
      required: true,
    });

    // Recommended checks
    checks.push({
      label: "Genre specified",
      filled: !!state.work.genre?.trim(),
      required: false,
    });
    checks.push({
      label: "ISWC code",
      filled: !!state.work.iswc_code?.trim(),
      required: false,
    });
    checks.push({
      label: "Date of creation",
      filled: !!state.work.date_of_creation?.trim(),
      required: false,
    });
    checks.push({
      label: "Distributor / label",
      filled: !!state.work.distributor_or_label?.trim(),
      required: false,
    });

    // PRO affiliation for each contributor
    state.contributors.forEach((c) => {
      checks.push({
        label: `PRO for ${c.legal_name || "contributor"}`,
        filled: !!c.pro_affiliation,
        required: false,
      });
      checks.push({
        label: `IPI for ${c.legal_name || "contributor"}`,
        filled: !!c.ipi_number?.trim(),
        required: false,
      });
    });

    // Credits filled
    const hasCredits = Object.keys(state.credits).length > 0;
    checks.push({
      label: "Credits configured",
      filled: hasCredits,
      required: false,
    });

    // Calculate score
    let total = 0;
    let earned = 0;
    for (const c of checks) {
      const weight = c.required ? 2 : 1;
      total += weight;
      if (c.filled) earned += weight;
    }

    const pct = total > 0 ? Math.round((earned / total) * 100) : 0;
    const missingFields = checks.filter((c) => !c.filled && !c.required);

    return { score: pct, missing: missingFields };
  }, [state]);

  // SVG ring dimensions
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      {/* Circular progress ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-surface)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-amber)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold font-[family-name:var(--font-jetbrains)]">
          {score}%
        </span>
      </div>

      {/* Text summary */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          Your agreement is {score}% complete
        </p>
        {missing.length > 0 && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {missing.length} recommended field{missing.length !== 1 ? "s" : ""}{" "}
            missing
          </p>
        )}
        {missing.length > 0 && missing.length <= 5 && (
          <ul className="mt-1.5 space-y-0.5">
            {missing.map((m) => (
              <li
                key={m.label}
                className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5"
              >
                <span className="w-1 h-1 rounded-full bg-[var(--color-amber)]" />
                {m.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useWizard } from "../wizard-context";
import GateQuestion from "../gate-question";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SoundExchangeStep() {
  const { state, dispatch } = useWizard();

  const se = state.soundexchange || { enabled: false, accounts: {} };
  const accounts = se.accounts || {};

  const updateAccount = (id: string, value: string) => {
    dispatch({
      type: "UPDATE_SOUNDEXCHANGE",
      se: { enabled: true, accounts: { ...accounts, [id]: value } },
    });
  };

  // Initialize on gate yes
  if (state.gates.wantsSoundExchange === true && !state.soundexchange) {
    dispatch({
      type: "UPDATE_SOUNDEXCHANGE",
      se: { enabled: true, accounts: {} },
    });
  }

  return (
    <GateQuestion
      gateKey="wantsSoundExchange"
      question="Do you want contributors to receive neighboring royalties directly from SoundExchange?"
      subtitle="A Letter of Direction instructs SoundExchange to pay each contributor's share directly, reducing accounting delays."
    >
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          SoundExchange: Letter of Direction
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          This will generate a Letter of Direction based on the master recording
          splits. Optionally add each contributor&apos;s SoundExchange account
          or contact info.
        </p>

        {state.contributors.map((c) => (
          <Card key={c.id} className="border-[var(--border-subtle)]">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.legal_name || "—"}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {c.role}
                  </p>
                </div>
                <div className="w-48">
                  <Label className="text-[10px] text-[var(--text-tertiary)]">
                    Account / Contact
                  </Label>
                  <Input
                    value={accounts[c.id] || ""}
                    onChange={(e) => updateAccount(c.id, e.target.value)}
                    placeholder="SoundExchange ID"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </GateQuestion>
  );
}

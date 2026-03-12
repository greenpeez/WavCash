"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Upload,
  Loader2,
  ExternalLink,
  Copy,
  BookOpen,
  Save,
} from "lucide-react";

interface CmoEntry {
  code: string;
  name: string;
  country: string;
  website: string | null;
  registration_url: string | null;
  submission_channel: string | null;
  royalty_types: string[];
  required_documents: { type: string; label: string; formats: string[] }[];
  processing_time: string | null;
  notes: string | null;
  publisher_registration: boolean;
}

interface Track {
  id: string;
  isrc: string;
  title: string;
  artist_name?: string;
}

interface RegistrationWizardProps {
  cmo: CmoEntry;
  existingRegistration?: {
    id: string;
    status: string;
    selected_track_ids: string[];
    personal_info: Record<string, string> | null;
    current_step?: string;
    documents?: Record<string, { name: string; uploaded: boolean }> | null;
  } | null;
  onClose: () => void;
  onComplete: () => void;
  userProfile: {
    display_name: string;
    country: string;
    legal_name: string | null;
    email: string | null;
  } | null;
}

type Step = "info" | "tracks" | "documents" | "review" | "submit" | "publisher";

export function RegistrationWizard({
  cmo,
  existingRegistration,
  onClose,
  onComplete,
  userProfile,
}: RegistrationWizardProps) {
  // Resume at saved step, or start at "info"
  const initialStep = (existingRegistration?.current_step as Step) || "info";
  const [step, setStep] = useState<Step>(initialStep);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(
    existingRegistration?.id || null
  );
  // Step 1: Personal info — pre-fill from existing registration or user profile
  const existingInfo = existingRegistration?.personal_info;
  const [legalName, setLegalName] = useState(
    existingInfo?.legal_name || userProfile?.legal_name || userProfile?.display_name || ""
  );
  const [email, setEmail] = useState(
    existingInfo?.email || userProfile?.email || ""
  );
  const [country, setCountry] = useState(
    existingInfo?.country || userProfile?.country || ""
  );
  const [ipiNumber, setIpiNumber] = useState(existingInfo?.ipi_number || "");
  const [roles, setRoles] = useState<string[]>(
    existingInfo?.roles ? (existingInfo.roles as unknown as string[]) : ["songwriter"]
  );

  // Step 2: Track selection — pre-fill from existing registration
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(
    existingRegistration?.selected_track_ids || []
  );
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Step 3: Documents — pre-fill from existing registration
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string; uploaded: boolean }>>(
    (existingRegistration?.documents as Record<string, { name: string; uploaded: boolean }>) || {}
  );

  // Load tracks on mount
  useEffect(() => {
    let cancelled = false;
    async function loadTracks() {
      setLoadingTracks(true);
      try {
        const res = await authFetch("/api/tracks");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTracks(Array.isArray(data) ? data : data.tracks || []);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingTracks(false);
      }
    }
    loadTracks();
    return () => { cancelled = true; };
  }, []);

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function toggleTrack(trackId: string) {
    setSelectedTrackIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  }

  function selectAllTracks() {
    if (selectedTrackIds.length === tracks.length) {
      setSelectedTrackIds([]);
    } else {
      setSelectedTrackIds(tracks.map((t) => t.id));
    }
  }

  async function handleCreateRegistration(): Promise<boolean> {
    setError(null);
    try {
      const res = await authFetch("/api/reclaim/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmo_code: cmo.code }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrationId(data.id);
        return true;
      }
      const errData = await res.json().catch(() => null);
      // 409 = already exists — fetch existing registration to get its ID
      if (res.status === 409) {
        const listRes = await authFetch("/api/reclaim/registrations");
        if (listRes.ok) {
          const regs = await listRes.json();
          const existing = regs.find((r: { cmo_code: string }) => r.cmo_code === cmo.code);
          if (existing) setRegistrationId(existing.id);
        }
        return true;
      }
      setError(errData?.details || errData?.error || "Failed to create registration");
      return false;
    } catch {
      setError("Network error, please try again");
      return false;
    }
  }

  const updateRegistration = useCallback(async (updates: Record<string, unknown>) => {
    if (!registrationId) return;
    try {
      await authFetch("/api/reclaim/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: registrationId, ...updates }),
      });
    } catch {
      // silent
    }
  }, [registrationId]);

  // Save all current wizard data + target step
  async function saveProgress(targetStep: Step) {
    if (!registrationId) return;
    const updates: Record<string, unknown> = {
      current_step: targetStep,
      personal_info: {
        legal_name: legalName,
        email,
        country,
        ipi_number: ipiNumber,
        roles,
      },
      selected_track_ids: selectedTrackIds,
      documents: uploadedDocs,
    };
    // Set in_progress once user starts advancing, but never downgrade
    // from submitted/confirmed/forms_ready
    if (
      existingRegistration?.status === "not_started" ||
      !existingRegistration?.status
    ) {
      updates.status = "in_progress";
    }
    await updateRegistration(updates);
  }

  async function handleMarkSubmitted() {
    setSaving(true);
    await updateRegistration({
      status: "submitted",
      submission_date: new Date().toISOString().split("T")[0],
      current_step: "submit",
      personal_info: { legal_name: legalName, email, country, ipi_number: ipiNumber, roles },
    });
    setSaving(false);
    onComplete();
  }

  const steps: Step[] = cmo.publisher_registration
    ? ["info", "tracks", "documents", "review", "submit", "publisher"]
    : ["info", "tracks", "documents", "review", "submit"];

  const stepIndex = steps.indexOf(step);
  const stepLabels: Record<Step, string> = {
    info: "Personal Info",
    tracks: "Select Tracks",
    documents: "Documents",
    review: "Review",
    submit: "Submit",
    publisher: "Self-Publishing",
  };

  async function goNext() {
    const next = steps[stepIndex + 1];
    if (!next) return;
    setSaving(true);
    setError(null);

    // Create registration when leaving info step (if not already created)
    if (step === "info" && !registrationId) {
      const ok = await handleCreateRegistration();
      if (!ok) {
        setSaving(false);
        return; // Don't advance on failure
      }
    }

    await saveProgress(next);
    setSaving(false);
    setStep(next);
  }

  async function goBack() {
    const prev = steps[stepIndex - 1];
    if (!prev) return;
    setSaving(true);
    await saveProgress(prev);
    setSaving(false);
    setStep(prev);
  }

  async function handleSaveAndExit() {
    setSaving(true);
    await saveProgress(step);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden !bg-[var(--card-solid)]">
        <CardHeader className="border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Register with {cmo.name}
            </CardTitle>
            <button
              onClick={onClose}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm"
            >
              Cancel
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex gap-1 mt-3">
            {steps.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col gap-1">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    i <= stepIndex
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--border-subtle)]"
                  }`}
                />
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {stepLabels[s]}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="py-6 space-y-6 overflow-y-auto min-h-0">
          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === "info" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Legal Name
                </label>
                <Input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Your full legal name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Country
                </label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country code (e.g. US, NG, ZA)"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  IPI Number{" "}
                  <span className="text-[var(--text-tertiary)] font-normal">
                    (optional, you&apos;ll receive one after registering)
                  </span>
                </label>
                <Input
                  value={ipiNumber}
                  onChange={(e) => setIpiNumber(e.target.value)}
                  placeholder="e.g. 00123456789"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Roles
                </label>
                <div className="flex gap-3">
                  {["songwriter", "performer", "producer"].map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={roles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <span className="capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Track Selection */}
          {step === "tracks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  Select the tracks you want to register with {cmo.name}.
                </p>
                <button
                  onClick={selectAllTracks}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  {selectedTrackIds.length === tracks.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              {loadingTracks ? (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-[var(--text-tertiary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading tracks...
                </div>
              ) : tracks.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">
                  No tracks found in your catalog.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {tracks.map((track) => (
                    <label
                      key={track.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedTrackIds.includes(track.id)}
                        onCheckedChange={() => toggleTrack(track.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] font-[family-name:var(--font-jetbrains)]">
                          {track.isrc || "No ISRC"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--text-tertiary)]">
                {selectedTrackIds.length} of {tracks.length} tracks selected
              </p>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === "documents" && (
            <div className="space-y-4">
              {cmo.required_documents.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {cmo.name} does not require any documents to be uploaded at
                  this stage. You can proceed to review.
                </p>
              ) : (
                <>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Prepare the following documents for your {cmo.name}{" "}
                    registration.
                  </p>
                  {cmo.required_documents.map((doc) => (
                    <div
                      key={doc.type}
                      className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)]"
                    >
                      <div>
                        <p className="text-sm font-medium">{doc.label}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Accepted: {doc.formats.join(", ").toUpperCase()}
                        </p>
                      </div>
                      {uploadedDocs[doc.type]?.uploaded ? (
                        <Badge
                          variant="outline"
                          className="text-green-500 border-green-500/30"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <label className="cursor-pointer">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border-subtle)] hover:border-[var(--accent)] text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">
                            <Upload className="h-3 w-3" />
                            Upload
                          </div>
                          <input
                            type="file"
                            accept={doc.formats
                              .map((f) => `.${f}`)
                              .join(",")}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadedDocs((prev) => ({
                                  ...prev,
                                  [doc.type]: {
                                    name: file.name,
                                    uploaded: true,
                                  },
                                }));
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-bold font-[family-name:var(--font-jetbrains)]">
                    Society
                  </p>
                  <p className="text-sm">{cmo.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-bold font-[family-name:var(--font-jetbrains)]">
                    Legal Name
                  </p>
                  <p className="text-sm">{legalName}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-bold font-[family-name:var(--font-jetbrains)]">
                    Email
                  </p>
                  <p className="text-sm">{email}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-bold font-[family-name:var(--font-jetbrains)]">
                    Tracks
                  </p>
                  <p className="text-sm">
                    {selectedTrackIds.length} tracks selected
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-bold font-[family-name:var(--font-jetbrains)]">
                    Documents
                  </p>
                  <p className="text-sm">
                    {Object.values(uploadedDocs).filter((d) => d.uploaded)
                      .length}{" "}
                    of {cmo.required_documents.length} uploaded
                  </p>
                </div>
                {cmo.processing_time && (
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-bold font-[family-name:var(--font-jetbrains)]">
                      Estimated Processing Time
                    </p>
                    <p className="text-sm">{cmo.processing_time}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Submission Guide */}
          {step === "submit" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Your registration package is ready. Follow these steps to submit
                to {cmo.name}:
              </p>

              {cmo.submission_channel === "portal" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)] space-y-2">
                    <p className="text-sm font-medium">
                      1. Visit the {cmo.name} registration portal
                    </p>
                    {cmo.registration_url && (
                      <a
                        href={cmo.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                      >
                        {cmo.registration_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      2. Create an account and fill in your personal details
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Use the information from the previous step.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      3. Register your works (tracks) with their ISRCs
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      You can copy ISRCs from the track selection step.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      4. Upload any required documents
                    </p>
                  </div>
                </div>
              )}

              {cmo.submission_channel === "email" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)] space-y-2">
                    <p className="text-sm font-medium">
                      1. Send an email to {cmo.name}
                    </p>
                    {cmo.registration_url && (
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-[family-name:var(--font-jetbrains)] text-[var(--accent)]">
                          {cmo.registration_url}
                        </code>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(
                              cmo.registration_url || ""
                            )
                          }
                          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      2. Include your personal details and track listing
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      3. Attach any required documents
                    </p>
                  </div>
                </div>
              )}

              {cmo.submission_channel === "mail" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      1. Print your registration forms and documents
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium">
                      2. Mail to the address provided on the {cmo.name} website
                    </p>
                    {cmo.website && (
                      <a
                        href={cmo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline mt-1"
                      >
                        Visit website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handleMarkSubmitted}
                disabled={saving}
                className="w-full gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "I've submitted my registration"}
              </Button>
            </div>
          )}

          {/* Step 6: Self-Publishing (conditional) */}
          {step === "publisher" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-[var(--accent)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      Claim your publisher&apos;s share
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      As a songwriter, composition royalties are split 50/50
                      between the writer&apos;s share and the publisher&apos;s share.
                      Without a publisher, you&apos;re only collecting the
                      writer&apos;s half. By registering as your own publisher
                      with {cmo.name}, you collect both halves, 100% of your
                      composition royalties.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                  <p className="text-sm font-medium">
                    1. Choose a publishing entity name
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Any name works. For example, &ldquo;{legalName || "Your Name"} Publishing&rdquo; or &ldquo;{legalName || "Your Name"} Music&rdquo;. This is just a
                    business name for your publishing registration.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                  <p className="text-sm font-medium">
                    2. Register as a publisher with {cmo.name}
                  </p>
                  {cmo.registration_url && (
                    <a
                      href={cmo.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline mt-1"
                    >
                      Go to {cmo.name} publisher registration
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {cmo.code === "bmi" && (
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Note: BMI charges a one-time $150 fee for publisher
                      registration.
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-[var(--bg-surface)]">
                  <p className="text-sm font-medium">
                    3. Register your works under your publisher entity
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    Once your publisher account is active, register the same
                    tracks you registered as a writer. This links both shares
                    to you.
                  </p>
                </div>
              </div>

              <Button onClick={onComplete} className="w-full gap-2">
                <CheckCircle className="h-4 w-4" />
                Done
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step !== "submit" && step !== "publisher" && (
            <div className="flex justify-between pt-4 border-t border-[var(--border-subtle)]">
              <div>
                {stepIndex > 0 && (
                  <Button variant="outline" onClick={goBack} disabled={saving} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveAndExit}
                  disabled={saving}
                  className="gap-2 text-[var(--text-secondary)]"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save & Exit
                </Button>
                <Button onClick={goNext} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

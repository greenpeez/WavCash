"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useTheme } from "next-themes";
import type { UserRole } from "@/lib/types/database";
import { useEnsureEmbeddedWallet } from "@/lib/hooks/use-ensure-embedded-wallet";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

const MOCK_TRACKS = [
  { title: "Midnight in Lagos", isrc: "USRC17607839", album: "Neon Nights", album_art_url: "" },
  { title: "Favela Dreams", isrc: "USRC17607840", album: "Neon Nights", album_art_url: "" },
  { title: "Sahara Wind", isrc: "USRC17607841", album: "Desert Tape", album_art_url: "" },
  { title: "Coast to Coast", isrc: "USRC17607842", album: "Desert Tape", album_art_url: "" },
  { title: "Groundwater", isrc: "USRC17607843", album: "Singles", album_art_url: "" },
];

const COUNTRIES = [
  { code: "NG", label: "Nigeria" },
  { code: "BR", label: "Brazil" },
  { code: "ZA", label: "South Africa" },
  { code: "GH", label: "Ghana" },
  { code: "KE", label: "Kenya" },
  { code: "OTHER", label: "Other" },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: "artist", label: "Artist" },
  { value: "songwriter", label: "Songwriter" },
  { value: "producer", label: "Producer" },
  { value: "publisher", label: "Publisher" },
  { value: "manager", label: "Manager / Label" },
];

const DISTRIBUTORS = [
  "DistroKid",
  "TuneCore",
  "Amuse",
  "CD Baby",
  "Other",
];

interface CatalogTrack {
  title: string;
  isrc: string;
  album: string;
  album_art_url: string;
}

/* ================================================================
   Onboarding Page — Mercury Surface + Glass Card
   ================================================================ */

const OB_CSS = `
.ob-root {
  --bg-body: #0a0a0a;
  --text-primary: #E8ECF0;
  --text-secondary: #9AA8B4;
  --text-tertiary: #788898;
  --accent: #D4883A;
  --bg-surface: rgba(232,236,240,0.06);
  --border-subtle: rgba(232,236,240,0.12);
  position: relative; width: 100%; min-height: 100vh; overflow-x: hidden;
  background: var(--bg-body);
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  color: var(--text-primary);
}
.ob-root[data-theme="light"] {
  --bg-body: #F8F6F3;
  --text-primary: #1A1A1A;
  --text-secondary: #5A5A5A;
  --text-tertiary: #888;
  --accent: #D4883A;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
}
/* Canvas */
.ob-root canvas {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;
}

/* UI overlay */
.ob-root .ui-overlay {
  position: relative; z-index: 10;
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 48px 16px;
}

/* ---- GLASS CARD ---- */
.ob-root .glass-card {
  width: 100%; max-width: 480px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 36px 32px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.ob-root[data-theme="light"] .glass-card {
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}

/* Card header */
.ob-root .card-title {
  font-family: 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.ob-root .card-desc {
  font-size: 14px; color: var(--text-secondary);
  margin-bottom: 24px; line-height: 1.5;
}

/* Progress bar */
.ob-root .progress-bar {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 24px;
}
.ob-root .progress-dot {
  height: 5px; border-radius: 4px;
  transition: all 0.5s ease;
}
.ob-root .progress-dot.active { width: 40px; background: var(--accent); }
.ob-root .progress-dot.inactive { width: 28px; background: var(--border-subtle); }

/* Input fields */
.ob-root .input-label {
  display: block; font-size: 13px; font-weight: 500;
  color: var(--text-secondary); margin-bottom: 6px;
}
.ob-root .input-label .optional {
  font-weight: 400; color: var(--text-tertiary);
}
.ob-root .glass-input {
  width: 100%; padding: 12px 16px;
  background: rgba(232,236,240,0.08);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; outline: none;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ob-root .glass-input::placeholder { color: var(--text-tertiary); transition: color 0.5s ease; }
.ob-root .glass-input:hover {
  border-color: rgba(212,136,58,0.25);
  background: rgba(212,136,58,0.03);
}
.ob-root .glass-input:hover::placeholder { color: var(--accent); }
.ob-root .glass-input:focus {
  border-color: rgba(212,136,58,0.4);
  background: rgba(212,136,58,0.04);
  box-shadow: 0 0 0 3px rgba(212,136,58,0.1), 0 8px 30px rgba(0,0,0,0.2);
  transform: translateY(-1px);
}
.ob-root .glass-input:focus::placeholder { color: var(--accent); }
.ob-root[data-theme="light"] .glass-input {
  background: rgba(0,0,0,0.06);
  border-color: rgba(0,0,0,0.10);
}
.ob-root[data-theme="light"] .glass-input:hover {
  border-color: rgba(212,136,58,0.3);
  background: rgba(212,136,58,0.04);
}
.ob-root[data-theme="light"] .glass-input:focus {
  border-color: rgba(212,136,58,0.5);
  background: rgba(212,136,58,0.06);
}

/* Glass select */
.ob-root .glass-select {
  width: 100%; padding: 12px 16px;
  background: rgba(232,236,240,0.08);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; outline: none;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: all 0.35s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23788898' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
.ob-root .glass-select:hover { border-color: rgba(212,136,58,0.25); }
.ob-root .glass-select:focus {
  border-color: rgba(212,136,58,0.4);
  box-shadow: 0 0 0 3px rgba(212,136,58,0.1);
}
.ob-root .glass-select option { background: #1a1a1a; color: #E8ECF0; }
.ob-root[data-theme="light"] .glass-select {
  background-color: rgba(0,0,0,0.06);
  border-color: rgba(0,0,0,0.10);
}
.ob-root[data-theme="light"] .glass-select option { background: #fff; color: #1A1A1A; }

/* Chip / pill toggles */
.ob-root .chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.ob-root .chip {
  padding: 7px 14px; font-size: 13px; font-weight: 500;
  border-radius: 99px;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  transition: all 0.3s ease;
}
.ob-root .chip:hover {
  border-color: rgba(212,136,58,0.3);
  color: var(--accent);
}
.ob-root .chip.selected {
  background: var(--accent); color: #000;
  border-color: var(--accent);
}

/* Primary button */
.ob-root .btn-primary {
  width: 100%; padding: 13px 24px;
  background: var(--accent); color: #000;
  border: none; border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  transition: all 0.5s ease;
  box-shadow: 0 2px 8px rgba(212,136,58,0.2);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ob-root .btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,136,58,0.3), 0 0 0 1px rgba(212,136,58,0.15);
}
.ob-root .btn-primary:active:not(:disabled) { transform: translateY(0); }
.ob-root .btn-primary:disabled { opacity: 0.5; }

/* Outline button */
.ob-root .btn-outline {
  width: 100%; padding: 12px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 500;
  transition: all 0.5s ease;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.ob-root .btn-outline:hover {
  border-color: rgba(212,136,58,0.35);
  color: var(--accent);
  transform: translateY(-1px);
}
.ob-root .btn-outline:active { transform: scale(0.98); }
.ob-root[data-theme="light"] .btn-outline {
  background: rgba(0,0,0,0.05);
  border-color: rgba(0,0,0,0.10);
}
.ob-root[data-theme="light"] .btn-outline:hover {
  background: rgba(0,0,0,0.08);
  border-color: rgba(212,136,58,0.35);
}

/* Ghost / link button */
.ob-root .btn-ghost {
  width: 100%; padding: 10px 20px;
  background: transparent; border: none;
  color: var(--text-tertiary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  transition: color 0.5s ease;
}
.ob-root .btn-ghost:hover { color: var(--accent); }

/* Spotify button — matches login social-btn style */
.ob-root .btn-spotify {
  width: 100%; padding: 12px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 500;
  transition: all 0.5s ease;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.ob-root .btn-spotify:hover {
  background: rgba(212,136,58,0.08);
  border-color: rgba(212,136,58,0.35);
  color: var(--accent);
  transform: translateY(-1px);
}
.ob-root .btn-spotify:active { transform: scale(0.98); }
.ob-root[data-theme="light"] .btn-spotify {
  background: rgba(0,0,0,0.05);
  border-color: rgba(0,0,0,0.10);
}
.ob-root[data-theme="light"] .btn-spotify:hover {
  background: rgba(0,0,0,0.08);
  border-color: rgba(212,136,58,0.35);
}

/* Dev bypass button */
.ob-root .btn-dev {
  width: 100%; padding: 12px 20px;
  background: transparent;
  border: 1px dashed rgba(212,136,58,0.5);
  border-radius: 10px;
  color: var(--accent);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  transition: all 0.4s ease;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ob-root .btn-dev:hover { background: rgba(212,136,58,0.08); }
.ob-root .btn-dev:disabled { opacity: 0.5; }

/* Connected card */
.ob-root .connected-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}
.ob-root .connected-card .avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: var(--accent); display: flex;
  align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.ob-root .connected-card .avatar img {
  width: 100%; height: 100%; object-fit: cover;
}

/* Track list */
.ob-root .track-list {
  max-height: 240px; overflow-y: auto; display: flex;
  flex-direction: column; gap: 6px;
}
.ob-root .track-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}
.ob-root .track-item .track-art {
  width: 38px; height: 38px; border-radius: 6px;
  background: rgba(212,136,58,0.1);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.ob-root .track-item .track-art img {
  width: 100%; height: 100%; object-fit: cover;
}

/* Error / warning text */
.ob-root .error-text { font-size: 13px; color: #e53e3e; margin-top: 4px; }
.ob-root .warning-text { font-size: 13px; color: #e53e3e; margin-top: 6px; line-height: 1.4; }
.ob-root .error-box {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px; border-radius: 10px;
  background: rgba(229,62,62,0.08);
  border: 1px solid rgba(229,62,62,0.15);
  font-size: 13px; color: #e53e3e;
}

/* Button row */
.ob-root .btn-row { display: flex; gap: 8px; }
.ob-root .btn-row > * { flex: 1; }
`;

// ---- Shaders ----
const VERT = `#version 300 es
layout(location=0) in vec2 pos;
out vec2 uv;
void main(){ uv=pos*0.5+0.5; gl_Position=vec4(pos,0,1); }`;

const FRAG_DROP = `#version 300 es
precision highp float;
uniform sampler2D src; uniform vec2 center; uniform float radius; uniform float strength;
in vec2 uv; out vec4 dst;
void main(){
  vec4 s=texture(src,uv);
  float d=distance(uv,center);
  s.r+=exp(-d*d/(radius*radius))*strength*0.04;
  dst=s;
}`;

const FRAG_UPDATE = `#version 300 es
precision highp float;
uniform sampler2D src; uniform vec2 texel;
in vec2 uv; out vec4 dst;
void main(){
  vec4 s=texture(src,uv);
  float n=texture(src,uv+vec2(0,texel.y)).r;
  float south=texture(src,uv-vec2(0,texel.y)).r;
  float e=texture(src,uv+vec2(texel.x,0)).r;
  float w=texture(src,uv-vec2(texel.x,0)).r;
  float avg=(n+south+e+w)*0.25;
  s.g+=(avg-s.r)*0.18; s.g*=0.945; s.r+=s.g; s.r*=0.9992;
  vec2 a=smoothstep(vec2(0),vec2(0.01),uv);
  vec2 b=smoothstep(vec2(0),vec2(0.01),1.0-uv);
  s.rg*=a.x*a.y*b.x*b.y;
  dst=s;
}`;

const FRAG_RENDER = `#version 300 es
precision highp float;
uniform sampler2D hmap; uniform vec2 texel; uniform vec2 res; uniform float time;
uniform int uLightMode;
in vec2 uv; out vec4 fc;
vec3 getNorm(vec2 p){
  float l=texture(hmap,p-vec2(texel.x,0)).r;
  float r=texture(hmap,p+vec2(texel.x,0)).r;
  float u=texture(hmap,p+vec2(0,texel.y)).r;
  float d=texture(hmap,p-vec2(0,texel.y)).r;
  float ns=uLightMode==1?2.0:1.0;
  return normalize(vec3((l-r)*ns,(d-u)*ns,1.0));
}
vec3 env(vec3 rd){
  float y=rd.y;
  vec3 dark,mid,tint; float limiter;
  if(uLightMode==1){
    dark=vec3(0.62,0.62,0.62); mid=vec3(0.78,0.78,0.77);
    tint=vec3(0.92,0.91,0.89); limiter=0.93;
  } else {
    dark=vec3(0.01,0.01,0.01); mid=vec3(0.08,0.08,0.07);
    tint=vec3(0.25,0.24,0.22); limiter=0.12;
  }
  vec3 c=mix(dark,mid,smoothstep(-0.5,1.0,y));
  float b1=smoothstep(-0.5,0.0,y);
  c+=tint*(0.12+0.14*smoothstep(0.0,0.8,y))*b1;
  float b2=smoothstep(0.7,0.78,y)*(1.0-smoothstep(0.85,0.92,y));
  c+=tint*0.15*b2;
  c+=dark*0.4*smoothstep(-0.8,-0.3,y)*(1.0-smoothstep(-0.05,0.15,y));
  c*=0.90+0.10*(sin(rd.x*3.0+rd.z*1.5)*0.5+0.5);
  c=min(c,vec3(limiter));
  return c;
}
void main(){
  vec3 N=getNorm(uv);
  float asp=res.x/res.y;
  vec3 V=normalize(vec3((uv-0.5)*vec2(asp,1.0)*0.3,-1.0));
  vec3 R=reflect(V,N);
  float NdotV=max(dot(N,-V),0.0);
  float fLo=uLightMode==1?0.75:0.65;
  float fHi=uLightMode==1?0.90:0.75;
  float fresnel=mix(fLo,fHi,1.0-NdotV);
  vec3 c=env(R)*fresnel;
  c=(c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);
  c=pow(clamp(c,0.0,1.0),vec3(1.0/2.2));
  if(uLightMode==0){ c=min(c,vec3(0.20)); }
  fc=vec4(c,1);
}`;

const SIM = 512;

// ---- Icons (inline SVG) ----
function IconArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}
function IconMusic() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}
function IconCheck() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;
}
function IconDisc() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconBug() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>;
}
function IconAlert() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background, #0a0a0a)" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#788898" }} />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lightModeRef = useRef(false);

  // Step 1: Profile
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [distributors, setDistributors] = useState<string[]>([]);
  const [otherDistributor, setOtherDistributor] = useState("");

  // Invite context: legal name from pending split (fetched via sign_token)
  const [inviteLegalName, setInviteLegalName] = useState<string | null>(null);

  // Step 2: Spotify
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [artistImage, setArtistImage] = useState("");
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  // Step 3: Catalog
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);

  const { walletAddress } = useEnsureEmbeddedWallet();

  const loggedInWithSpotify = privyUser?.linkedAccounts?.some(
    (account) => account.type === "spotify_oauth"
  ) ?? false;

  const totalSteps = loggedInWithSpotify ? 2 : 3;

  function toggleRole(value: UserRole) {
    setRoles((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  }

  function toggleDistributor(value: string) {
    setDistributors((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  // Check spotify_error or spotify_connected from URL
  useEffect(() => {
    const err = searchParams.get("spotify_error");
    if (err) {
      setSpotifyError(
        err === "no_code"
          ? "Spotify authorization was denied or cancelled."
          : "Failed to connect to Spotify. Please try again."
      );
    }
    const justConnected = searchParams.get("spotify_connected");
    if (justConnected) {
      setSpotifyConnected(true);
    }
  }, [searchParams]);

  // Wallet creation + DB persistence is handled by useEnsureEmbeddedWallet hook

  // Sync theme from next-themes (and pull wavcash-theme from landing page if needed)
  useEffect(() => {
    if (!ready) return;
    // If the landing page saved a theme to wavcash-theme, sync it into next-themes
    try {
      const landingTheme = localStorage.getItem("wavcash-theme");
      if (landingTheme && landingTheme !== resolvedTheme) {
        setNextTheme(landingTheme);
        return; // resolvedTheme will update, re-triggering this effect
      }
    } catch {}

    const isLight = resolvedTheme === "light";
    lightModeRef.current = isLight;
    rootRef.current?.setAttribute("data-theme", isLight ? "light" : "dark");
  }, [ready, resolvedTheme]);

  // ---- Mercury surface ----
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;
    gl.getExtension("EXT_color_buffer_float");

    function mkShader(src: string, type: number) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src); gl!.compileShader(s);
      return gl!.getShaderParameter(s, gl!.COMPILE_STATUS) ? s : null;
    }
    function mkProg(vs: string, fs: string) {
      const v = mkShader(vs, gl!.VERTEX_SHADER);
      const f = mkShader(fs, gl!.FRAGMENT_SHADER);
      if (!v || !f) return null;
      const p = gl!.createProgram()!;
      gl!.attachShader(p, v); gl!.attachShader(p, f);
      gl!.linkProgram(p);
      return gl!.getProgramParameter(p, gl!.LINK_STATUS) ? p : null;
    }
    function U(p: WebGLProgram, ...names: string[]) {
      const o: Record<string, WebGLUniformLocation | null> = {};
      for (const n of names) o[n] = gl!.getUniformLocation(p, n);
      return o;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const pDrop = mkProg(VERT, FRAG_DROP);
    const pUpdate = mkProg(VERT, FRAG_UPDATE);
    const pRender = mkProg(VERT, FRAG_RENDER);
    if (!pDrop || !pUpdate || !pRender) return;

    const uDrop = U(pDrop, "src", "center", "radius", "strength");
    const uUpdate = U(pUpdate, "src", "texel");
    const uRender = U(pRender, "hmap", "texel", "res", "time", "uLightMode");

    function mkTex() {
      const t = gl!.createTexture();
      gl!.bindTexture(gl!.TEXTURE_2D, t);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA32F, SIM, SIM, 0, gl!.RGBA, gl!.FLOAT, null);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      return t;
    }
    function mkFBO(t: WebGLTexture | null) {
      const f = gl!.createFramebuffer();
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, f);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, t, 0);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      return f;
    }

    const tex = [mkTex(), mkTex()];
    const fbo = [mkFBO(tex[0]), mkFBO(tex[1])];
    let cR = 0, cW = 1;
    function swap() { const t = cR; cR = cW; cW = t; }

    function runDrop(cx: number, cy: number, rad: number, str: number) {
      gl!.viewport(0, 0, SIM, SIM);
      gl!.useProgram(pDrop);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo[cW]);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
      gl!.uniform1i(uDrop.src, 0);
      gl!.uniform2f(uDrop.center, cx, cy);
      gl!.uniform1f(uDrop.radius, rad);
      gl!.uniform1f(uDrop.strength, str);
      gl!.bindVertexArray(vao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      swap();
    }
    function runUpdate() {
      gl!.viewport(0, 0, SIM, SIM);
      gl!.useProgram(pUpdate);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo[cW]);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
      gl!.uniform1i(uUpdate.src, 0);
      gl!.uniform2f(uUpdate.texel, 1.0 / SIM, 1.0 / SIM);
      gl!.bindVertexArray(vao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      swap();
    }

    let mx = 0.5, my = 0.5, pmx = 0.5, pmy = 0.5;
    let smoothStr = 0, lastMove = 0;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX / window.innerWidth;
      my = 1.0 - e.clientY / window.innerHeight;
      lastMove = performance.now();
    };
    const onTouchMove = (e: TouchEvent) => {
      mx = e.touches[0].clientX / window.innerWidth;
      my = 1.0 - e.touches[0].clientY / window.innerHeight;
      lastMove = performance.now();
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove, { passive: true });

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(canvas!.clientWidth * dpr);
      canvas!.height = Math.round(canvas!.clientHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    const t0 = performance.now();
    let frame = 0;
    let rafId: number;

    function loop() {
      rafId = requestAnimationFrame(loop);
      const now = performance.now();
      const time = (now - t0) * 0.001;
      frame++;

      const dx = mx - pmx, dy = my - pmy;
      const vel = Math.sqrt(dx * dx + dy * dy) * 60;
      pmx = mx; pmy = my;

      const moving = (now - lastMove) < 150;
      const rawStr = moving ? 0.15 + Math.min(vel, 3.0) * 0.15 : 0.0;
      if (rawStr >= smoothStr) smoothStr = rawStr;
      else smoothStr += (rawStr - smoothStr) * 0.04;

      if (smoothStr > 0.001) runDrop(mx, my, 0.015, smoothStr);
      runUpdate();
      if (!moving && frame % 90 === 0) {
        runDrop(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, 0.035, 0.04);
      }

      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.useProgram(pRender);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
      gl!.uniform1i(uRender.hmap, 0);
      gl!.uniform2f(uRender.texel, 1.0 / SIM, 1.0 / SIM);
      gl!.uniform2f(uRender.res, canvas!.width, canvas!.height);
      gl!.uniform1f(uRender.time, time);
      gl!.uniform1i(uRender.uLightMode, lightModeRef.current ? 1 : 0);
      gl!.bindVertexArray(vao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", resize);
    };
  }, [ready]);

  // ---- Business logic ----
  async function handleDevBypass() {
    setLoading(true);
    setError(null);
    try {
      await authFetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || "Dev Artist",
          legal_name: legalName || displayName || "Dev Artist",
          country: country || "NG",
          role: roles.length > 0 ? roles.join(",") : "artist",
          distributor: null,
          wallet_address: walletAddress,
        }),
      });
      const res = await authFetch("/api/user/dev-bypass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artist_name: displayName || "Dev Artist",
          mock_tracks: MOCK_TRACKS,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTracks(MOCK_TRACKS);
        setArtistName(data.artist?.name || displayName || "Dev Artist");
        setSpotifyConnected(true);
        if (!displayName) setDisplayName("Dev Artist");
        if (!country) setCountry("NG");
        if (roles.length === 0) setRoles(["artist"]);
      }
    } catch {
      setError("Dev bypass failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit() {
    const nameWordCount = legalName.trim().split(/\s+/).filter(Boolean).length;
    if (!displayName || !legalName || nameWordCount < 2 || nameWordCount > 3 || !country || roles.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          legal_name: legalName,
          country,
          role: roles.join(","),
          distributor: distributors.length > 0
            ? distributors.map((d) => d === "Other" && otherDistributor ? otherDistributor : d).join(",")
            : null,
          wallet_address: walletAddress,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }
      if (loggedInWithSpotify || spotifyConnected) {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  function handleConnectSpotify() {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${window.location.origin}/api/spotify/callback`;
    const scopes = "user-read-private user-read-email user-follow-read";
    const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=onboarding`;
    window.location.href = url;
  }

  // Check if returning from Spotify OAuth
  useEffect(() => {
    if (!ready || !authenticated) return;

    async function checkState() {
      try {
        const res = await authFetch("/api/user");
        if (!res.ok) return;
        const profile = await res.json();
        if (!profile) return;

        // Wallet persistence is handled by useEnsureEmbeddedWallet hook

        if (profile.display_name) setDisplayName(profile.display_name);
        if (profile.legal_name) setLegalName(profile.legal_name);
        if (profile.country) setCountry(profile.country);
        if (profile.role) {
          const savedRoles = profile.role.split(",") as UserRole[];
          setRoles(savedRoles);
        }

        // If arriving via invite, fetch the contributor's legal_name from the split
        const signToken = searchParams.get("sign_token");
        if (signToken) {
          try {
            const signRes = await fetch(`/api/sign/${signToken}`);
            if (signRes.ok) {
              const signData = await signRes.json();
              if (signData.contributor?.legal_name) {
                setInviteLegalName(signData.contributor.legal_name);
              }
            }
          } catch {}
        }

        let fetchedTracks: CatalogTrack[] = [];
        if (profile.spotify_connected) {
          setSpotifyConnected(true);
          const artistRes = await authFetch("/api/user/artists");
          if (artistRes.ok) {
            const artists = await artistRes.json();
            if (artists && artists.length > 0) {
              setArtistName(artists[0].name);
              setArtistImage(artists[0].image_url || "");
              const trackRes = await authFetch(`/api/user/artists/${artists[0].id}/tracks`);
              if (trackRes.ok) {
                const trackRows = await trackRes.json();
                if (trackRows) {
                  fetchedTracks = trackRows;
                  setTracks(trackRows);
                }
              }
            }
          }
        }

        if (profile.display_name && profile.country && profile.role) {
          if (profile.spotify_connected || loggedInWithSpotify) {
            setStep(3);
          } else {
            setStep(2);
          }
        }
      } catch {}
    }
    checkState();
  }, [ready, authenticated]);

  async function handleFinish() {
    setLoading(true);
    const signTokenParam = searchParams.get("sign_token");
    const dashboardUrl = signTokenParam
      ? `/dashboard?sign_token=${signTokenParam}`
      : "/dashboard";
    try {
      await authFetch("/api/user/complete-onboarding", { method: "POST" });
      router.push(dashboardUrl);
    } catch {
      router.push(dashboardUrl);
    }
  }

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background, #0a0a0a)" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#788898" }} />
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OB_CSS }} />
      <div ref={rootRef} className="ob-root" data-theme={resolvedTheme === "light" ? "light" : "dark"}>
        <canvas ref={canvasRef} />

        {/* Glass Card Overlay */}
        <div className="ui-overlay">
          <div style={{ width: "100%", maxWidth: 480 }}>
            {/* Progress bar */}
            <div className="progress-bar">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div key={s} className={`progress-dot ${s <= step ? "active" : "inactive"}`} />
              ))}
            </div>

            {/* Step 1: Profile */}
            {step === 1 && (
              <div className="glass-card">
                <h2 className="card-title">Tell us about yourself</h2>
                <p className="card-desc">This helps us customize your dashboard and connect you to the right CMOs.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Name */}
                  <div>
                    <label className="input-label">Stage name / Artist name</label>
                    <input
                      className="glass-input"
                      placeholder="e.g. Burna Boy"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  {/* Legal name */}
                  <div>
                    <label className="input-label">Legal name</label>
                    <input
                      className="glass-input"
                      placeholder="e.g. Damini Ogulu"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                    />
                    {(() => {
                      const words = legalName.trim().split(/\s+/).filter(Boolean);
                      if (legalName.trim().length > 0 && words.length < 2) {
                        return <p className="error-text">Please enter first and last name</p>;
                      }
                      if (words.length > 3) {
                        return <p className="error-text">Maximum 3 names allowed</p>;
                      }
                      return null;
                    })()}
                    {inviteLegalName && legalName && legalName.trim().toLowerCase() !== inviteLegalName.trim().toLowerCase() && (
                      <p className="warning-text">
                        This doesn&apos;t match the legal name on your pending Split agreement ({inviteLegalName}). Please double-check with the agreement creator.
                      </p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="input-label">Primary country</label>
                    <select
                      className="glass-select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="" disabled>Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Roles */}
                  <div>
                    <label className="input-label">Role(s)</label>
                    <div className="chip-group">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => toggleRole(r.value)}
                          className={`chip ${roles.includes(r.value) ? "selected" : ""}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Distributors */}
                  <div>
                    <label className="input-label">Distributor(s) <span className="optional">(optional)</span></label>
                    <div className="chip-group">
                      {DISTRIBUTORS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDistributor(d)}
                          className={`chip ${distributors.includes(d) ? "selected" : ""}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    {distributors.includes("Other") && (
                      <input
                        className="glass-input"
                        placeholder="Enter distributor name"
                        value={otherDistributor}
                        onChange={(e) => setOtherDistributor(e.target.value)}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>

                  {error && <p className="error-text">{error}</p>}

                  <button
                    className="btn-primary"
                    onClick={handleProfileSubmit}
                    disabled={!displayName || !legalName || (() => { const w = legalName.trim().split(/\s+/).filter(Boolean).length; return w < 2 || w > 3; })() || !country || roles.length === 0 || loading}
                  >
                    {loading ? "Saving..." : "Continue"} <IconArrowRight />
                  </button>

                  <button
                    className="btn-ghost"
                    onClick={() => loggedInWithSpotify ? setStep(3) : setStep(2)}
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Connect Spotify */}
            {step === 2 && !loggedInWithSpotify && (
              <div className="glass-card">
                <h2 className="card-title">Connect your Spotify</h2>
                <p className="card-desc">Import your catalog automatically. We&apos;ll pull your tracks and ISRCs to start calculating your royalties.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {spotifyError && (
                    <div className="error-box">
                      <IconAlert />
                      <span>{spotifyError}</span>
                    </div>
                  )}

                  {spotifyConnected ? (
                    <div className="connected-card">
                      <div className="avatar">
                        {artistImage ? (
                          <img src={artistImage} alt={artistName} />
                        ) : (
                          <IconMusic />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{artistName}</p>
                        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Connected to Spotify</p>
                      </div>
                      <IconCheck />
                    </div>
                  ) : (
                    <>
                      <button className="btn-spotify" onClick={handleConnectSpotify}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                        Connect Spotify
                      </button>
                      {DEV_BYPASS && (
                        <button className="btn-dev" onClick={handleDevBypass} disabled={loading}>
                          <IconBug /> {loading ? "Inserting mock data..." : "Dev: Skip with mock data"}
                        </button>
                      )}
                    </>
                  )}

                  <div className="btn-row">
                    {!spotifyConnected && (
                      <button className="btn-outline" onClick={() => setStep(3)}>
                        Skip for now
                      </button>
                    )}
                    <button className="btn-primary" onClick={() => setStep(3)}>
                      Continue <IconArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Catalog / Complete */}
            {step === 3 && (
              <div className="glass-card">
                <h2 className="card-title">
                  {tracks.length > 0 ? "Your catalog is ready" : "You\u2019re all set"}
                </h2>
                <p className="card-desc">
                  {tracks.length > 0
                    ? `${tracks.length} tracks imported. Your dashboard is ready.`
                    : "Connect Spotify later from Settings to import your catalog."}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tracks.length > 0 && (
                    <div className="track-list">
                      {tracks.slice(0, 20).map((track) => (
                        <div key={track.isrc} className="track-item">
                          <div className="track-art">
                            {track.album_art_url ? (
                              <img src={track.album_art_url} alt={track.title} />
                            ) : (
                              <IconMusic />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</p>
                            <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{track.isrc}</p>
                          </div>
                        </div>
                      ))}
                      {tracks.length > 20 && (
                        <p style={{ fontSize: 13, textAlign: "center", color: "var(--text-tertiary)", padding: "8px 0" }}>
                          + {tracks.length - 20} more tracks
                        </p>
                      )}
                    </div>
                  )}

                  <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                    {loading ? "Setting up..." : "Go to my dashboard"} <IconArrowRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

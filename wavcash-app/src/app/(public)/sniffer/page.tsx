"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

/* ================================================================
   Interfaces
   ================================================================ */

interface DspBreakdown {
  platform: string;
  estimated_streams: number;
  rate: number;
  estimated_earnings: number;
}

interface TrackResult {
  title: string;
  isrc: string | null;
  album: string;
  album_art_url: string | null;
  popularity: number;
  estimated_monthly_streams: number;
  dsp_breakdown: DspBreakdown[];
  total_monthly_estimated: number;
}

interface SnifferResponse {
  artist: {
    name: string;
    image_url: string | null;
    genres: string[];
    popularity: number;
  };
  tracks: TrackResult[];
  total_annual_estimate: number;
  total_monthly_estimate: number;
  disclaimer: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  youtube_music: "YouTube Music",
  amazon_music: "Amazon Music",
  tidal: "Tidal",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num: number) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

/* ================================================================
   Mock data for dev bypass
   ================================================================ */

const MOCK_TRACKS: TrackResult[] = [
  {
    title: "Last Last",
    isrc: "USRC17607839",
    album: "Love, Damini",
    album_art_url: "",
    popularity: 85,
    estimated_monthly_streams: 2250000,
    dsp_breakdown: [
      { platform: "spotify", estimated_streams: 1350000, rate: 0.0035, estimated_earnings: 4725.0 },
      { platform: "apple_music", estimated_streams: 337500, rate: 0.006, estimated_earnings: 2025.0 },
      { platform: "youtube_music", estimated_streams: 270000, rate: 0.002, estimated_earnings: 540.0 },
      { platform: "amazon_music", estimated_streams: 180000, rate: 0.004, estimated_earnings: 720.0 },
      { platform: "tidal", estimated_streams: 112500, rate: 0.009, estimated_earnings: 1012.5 },
    ],
    total_monthly_estimated: 9022.5,
  },
  {
    title: "City Boys",
    isrc: "USRC17607840",
    album: "Love, Damini",
    album_art_url: "",
    popularity: 72,
    estimated_monthly_streams: 640000,
    dsp_breakdown: [
      { platform: "spotify", estimated_streams: 384000, rate: 0.0035, estimated_earnings: 1344.0 },
      { platform: "apple_music", estimated_streams: 96000, rate: 0.006, estimated_earnings: 576.0 },
      { platform: "youtube_music", estimated_streams: 76800, rate: 0.002, estimated_earnings: 153.6 },
      { platform: "amazon_music", estimated_streams: 51200, rate: 0.004, estimated_earnings: 204.8 },
      { platform: "tidal", estimated_streams: 32000, rate: 0.009, estimated_earnings: 288.0 },
    ],
    total_monthly_estimated: 2566.4,
  },
  {
    title: "Kilometre",
    isrc: "USRC17607841",
    album: "Twice As Tall",
    album_art_url: "",
    popularity: 68,
    estimated_monthly_streams: 460000,
    dsp_breakdown: [
      { platform: "spotify", estimated_streams: 276000, rate: 0.0035, estimated_earnings: 966.0 },
      { platform: "apple_music", estimated_streams: 69000, rate: 0.006, estimated_earnings: 414.0 },
      { platform: "youtube_music", estimated_streams: 55200, rate: 0.002, estimated_earnings: 110.4 },
      { platform: "amazon_music", estimated_streams: 36800, rate: 0.004, estimated_earnings: 147.2 },
      { platform: "tidal", estimated_streams: 23000, rate: 0.009, estimated_earnings: 207.0 },
    ],
    total_monthly_estimated: 1844.6,
  },
  {
    title: "Ye",
    isrc: "USRC17607842",
    album: "African Giant",
    album_art_url: "",
    popularity: 65,
    estimated_monthly_streams: 325000,
    dsp_breakdown: [
      { platform: "spotify", estimated_streams: 195000, rate: 0.0035, estimated_earnings: 682.5 },
      { platform: "apple_music", estimated_streams: 48750, rate: 0.006, estimated_earnings: 292.5 },
      { platform: "youtube_music", estimated_streams: 39000, rate: 0.002, estimated_earnings: 78.0 },
      { platform: "amazon_music", estimated_streams: 26000, rate: 0.004, estimated_earnings: 104.0 },
      { platform: "tidal", estimated_streams: 16250, rate: 0.009, estimated_earnings: 146.25 },
    ],
    total_monthly_estimated: 1303.25,
  },
  {
    title: "On the Low",
    isrc: "USRC17607843",
    album: "African Giant",
    album_art_url: "",
    popularity: 60,
    estimated_monthly_streams: 190000,
    dsp_breakdown: [
      { platform: "spotify", estimated_streams: 114000, rate: 0.0035, estimated_earnings: 399.0 },
      { platform: "apple_music", estimated_streams: 28500, rate: 0.006, estimated_earnings: 171.0 },
      { platform: "youtube_music", estimated_streams: 22800, rate: 0.002, estimated_earnings: 45.6 },
      { platform: "amazon_music", estimated_streams: 15200, rate: 0.004, estimated_earnings: 60.8 },
      { platform: "tidal", estimated_streams: 9500, rate: 0.009, estimated_earnings: 85.5 },
    ],
    total_monthly_estimated: 761.9,
  },
];

const MOCK_MONTHLY = MOCK_TRACKS.reduce((s, t) => s + t.total_monthly_estimated, 0);

const MOCK_SNIFFER_RESULT: SnifferResponse = {
  artist: {
    name: "Burna Boy",
    image_url: "",
    genres: ["afrobeats", "afropop", "nigerian pop"],
    popularity: 88,
  },
  tracks: MOCK_TRACKS,
  total_annual_estimate: Math.round(MOCK_MONTHLY * 12 * 100) / 100,
  total_monthly_estimate: Math.round(MOCK_MONTHLY * 100) / 100,
  disclaimer:
    "Estimates based on verified published per-stream rates and track performance indicators. Create an account to upload your statements and see your real gap.",
};

/* ================================================================
   Scoped CSS
   ================================================================ */

const SNIFFER_CSS = `
.sniffer-root {
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
.sniffer-root[data-theme="light"] {
  --bg-body: #F8F6F3;
  --text-primary: #1A1A1A;
  --text-secondary: #5A5A5A;
  --text-tertiary: #888;
  --accent: #D4883A;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
}
/* Canvas */
.sniffer-root canvas {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;
  will-change: transform;
}

/* Content area */
.sniffer-root .ui-content {
  position: relative; z-index: 10;
  max-width: 720px; margin: 0 auto; padding: 48px 24px 80px;
}

/* Glass badge */
.sniffer-root .glass-badge {
  display: inline-block; padding: 5px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 600; letter-spacing: 1px;
  text-transform: uppercase; color: var(--accent);
  border: 1px solid rgba(212,136,58,0.3); border-radius: 99px;
  background: rgba(212,136,58,0.06);
}

/* Glass card */
.sniffer-root .glass-card {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  padding: 24px 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  transition: transform 0.5s ease, border-color 0.5s ease;
}
.sniffer-root .glass-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212,136,58,0.25);
}
.sniffer-root[data-theme="light"] .glass-card {
  background: rgba(215,210,203,0.35);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}

/* Glass input */
.sniffer-root .glass-input {
  width: 100%; padding: 14px 18px;
  background: rgba(232,236,240,0.08);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; outline: none;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sniffer-root .glass-input::placeholder { color: var(--text-tertiary); transition: color 0.5s ease; }
.sniffer-root .glass-input:hover {
  border-color: rgba(212,136,58,0.25);
  background: rgba(212,136,58,0.03);
}
.sniffer-root .glass-input:hover::placeholder { color: var(--accent); }
.sniffer-root .glass-input:focus {
  border-color: rgba(212,136,58,0.4);
  background: rgba(212,136,58,0.04);
  box-shadow: 0 0 0 3px rgba(212,136,58,0.1), 0 8px 30px rgba(0,0,0,0.2);
  transform: translateY(-1px);
}
.sniffer-root .glass-input:focus::placeholder { color: var(--accent); }
.sniffer-root[data-theme="light"] .glass-input {
  background: rgba(0,0,0,0.06);
  border-color: rgba(0,0,0,0.10);
}
.sniffer-root[data-theme="light"] .glass-input:hover {
  border-color: rgba(212,136,58,0.3);
  background: rgba(212,136,58,0.04);
}
.sniffer-root[data-theme="light"] .glass-input:focus {
  border-color: rgba(212,136,58,0.5);
  background: rgba(212,136,58,0.06);
}

/* Primary button */
.sniffer-root .btn-primary {
  padding: 13px 24px;
  background: var(--accent); color: #000;
  border: none; border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  cursor: none !important;
  transition: all 0.5s ease;
  box-shadow: 0 2px 8px rgba(212,136,58,0.2);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  text-decoration: none;
  white-space: nowrap;
}
.sniffer-root .btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,136,58,0.3), 0 0 0 1px rgba(212,136,58,0.15);
}
.sniffer-root .btn-primary:active:not(:disabled) { transform: translateY(0); }
.sniffer-root .btn-primary:disabled { opacity: 0.5; }

/* CTA button (matches docs nav-cta) */
.sniffer-root .btn-cta {
  padding: 13px 24px;
  background: #fff; color: #000;
  border: none; border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  cursor: none !important; letter-spacing: 0.2px;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
  box-shadow: 0 0 0 0 rgba(255,255,255,0);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  text-decoration: none; white-space: nowrap;
}
.sniffer-root .btn-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.sniffer-root .btn-cta:active { transform: scale(0.98); }
.sniffer-root[data-theme="light"] .btn-cta {
  background: #1A1A1A; color: #F8F6F3;
}
.sniffer-root[data-theme="light"] .btn-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}

/* Dev bypass button */
.sniffer-root .btn-dev {
  width: 100%; padding: 12px 20px;
  background: transparent;
  border: 1px dashed rgba(212,136,58,0.5);
  border-radius: 10px;
  color: var(--accent);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  cursor: none !important;
  transition: all 0.4s ease;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.sniffer-root .btn-dev:hover { background: rgba(212,136,58,0.08); }
.sniffer-root .btn-dev:disabled { opacity: 0.5; }

/* Stat grid */
.sniffer-root .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* Glass table */
.sniffer-root .glass-table { width: 100%; border-collapse: collapse; }
.sniffer-root .glass-table th {
  text-align: left; padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: var(--accent);
  border-bottom: 1px solid var(--border-subtle);
}
.sniffer-root .glass-table th.text-right { text-align: right; }
.sniffer-root .glass-table td {
  padding: 12px 14px; font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(232,236,240,0.06);
  transition: all 0.5s ease;
}
.sniffer-root .glass-table td.text-right { text-align: right; }
.sniffer-root .glass-table tbody tr { transition: background 0.5s ease; }
.sniffer-root .glass-table tbody tr:hover { background: rgba(212,136,58,0.04); }
.sniffer-root .glass-table tbody tr:hover td { color: var(--text-primary); }
.sniffer-root .glass-table tbody tr:last-child td { border-bottom: none; }
.sniffer-root[data-theme="light"] .glass-table td {
  border-bottom-color: rgba(0,0,0,0.06);
}

/* Error box */
.sniffer-root .error-box {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 12px 16px; border-radius: 12px;
  background: rgba(229,62,62,0.08);
  border: 1px solid rgba(229,62,62,0.15);
  font-size: 13px; color: #e53e3e;
}

/* CTA card */
.sniffer-root .cta-card {
  background: rgba(212,136,58,0.06);
  border: 1px solid rgba(212,136,58,0.25);
  border-radius: 16px; padding: 32px;
  text-align: center;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: border-color 0.5s ease;
}
.sniffer-root .cta-card:hover {
  border-color: rgba(212,136,58,0.45);
}

/* Disclaimer */
.sniffer-root .disclaimer {
  font-size: 12px; color: var(--text-tertiary);
  text-align: center; font-style: italic;
  line-height: 1.6;
}

/* Spinner */
.sniffer-root .spinner {
  width: 18px; height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: sniffer-spin 0.6s linear infinite;
}
@keyframes sniffer-spin { to { transform: rotate(360deg); } }
`;

/* ================================================================
   Shaders (identical to onboarding / login)
   ================================================================ */

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

/* ================================================================
   Inline SVG Icons
   ================================================================ */

function IconMusic() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}
function IconSearch() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}
function IconArrowRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}
function IconAlert() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function IconBug() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>;
}

/* ================================================================
   Component
   ================================================================ */

export default function SnifferPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background, #0a0a0a)" }}>
        <div style={{ width: 24, height: 24, border: "2px solid #788898", borderTopColor: "transparent", borderRadius: "50%", animation: "sniffer-spin 0.6s linear infinite" }} />
      </div>
    }>
      <SnifferContent />
    </Suspense>
  );
}

function SnifferContent() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SnifferResponse | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lightModeRef = useRef(false);

  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { ready, authenticated } = usePrivy();
  const isLoggedIn = ready && authenticated;

  // ---- Business logic ----
  async function doSearch(query: string) {
    if (!query.trim()) return;
    setUrl(query);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sniffer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyUrl: query.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setUrl(q);
      doSearch(q);
    }
  }, [searchParams]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    doSearch(url);
  }

  function handleDevBypass() {
    setUrl("https://open.spotify.com/artist/mock-dev-artist");
    setLoading(true);
    setError(null);
    setResult(null);
    setTimeout(() => {
      setResult(MOCK_SNIFFER_RESULT);
      setLoading(false);
    }, 800);
  }

  // ---- Theme sync ----
  useEffect(() => {
    try {
      const landingTheme = localStorage.getItem("wavcash-theme");
      if (landingTheme && landingTheme !== resolvedTheme) {
        setNextTheme(landingTheme);
        return;
      }
    } catch {}

    const isLight = resolvedTheme === "light";
    lightModeRef.current = isLight;
    rootRef.current?.setAttribute("data-theme", isLight ? "light" : "dark");
  }, [resolvedTheme]);

  // ---- Mercury surface ----
  useEffect(() => {
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
  }, []);

  // ---- Render ----
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SNIFFER_CSS }} />
      <div ref={rootRef} className="sniffer-root" data-theme={resolvedTheme === "light" ? "light" : "dark"}>
        <canvas ref={canvasRef} />

        {/* Glass Nav — reuses dash-header* classes from globals.css */}
        <nav className="dash-header" style={{ position: "sticky", top: 0 }}>
          <Link href="/" className="dash-header-logo">
            <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
              <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            </svg>
            WavCash
          </Link>
          <div className="dash-header-right">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-cta" style={{ display: "inline-block", textDecoration: "none" }}>My Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="dash-header-link">Sign in</Link>
                <Link href="/login" className="dash-header-cta">Get Started</Link>
              </>
            )}
          </div>
        </nav>

        {/* Scrollable Content */}
        <div className="ui-content">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span className="glass-badge">Free &mdash; No account required</span>
            <h1 style={{
              fontFamily: "'General Sans', sans-serif",
              fontSize: "clamp(36px, 5vw, 52px)",
              fontWeight: 700,
              letterSpacing: "-1.5px",
              marginTop: 16,
              marginBottom: 12,
            }}>
              Royalty Sniffer
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
              Paste your Spotify artist link and see what your music is earning across every platform.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 12, marginBottom: DEV_BYPASS ? 12 : 40 }}>
            <input
              className="glass-input"
              placeholder="Paste your Spotify artist link..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !url.trim()}
            >
              {loading ? <span className="spinner" /> : <><IconSearch /> Sniff</>}
            </button>
          </form>

          {/* Dev bypass */}
          {DEV_BYPASS && (
            <button
              className="btn-dev"
              onClick={handleDevBypass}
              disabled={loading}
              style={{ marginBottom: 40 }}
            >
              <IconBug /> {loading ? "Loading mock data..." : "Dev: Run with mock data"}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="error-box" style={{ marginBottom: 24 }}>
              <IconAlert />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Artist card */}
              <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 28px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontFamily: "'General Sans', sans-serif", fontSize: 24, fontWeight: 700 }}>
                    {result.artist.name}
                  </h2>
                  {result.artist.genres.length > 0 && (
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                      {result.artist.genres.slice(0, 3).join(" \u00B7 ")}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 24, fontWeight: 700, color: "var(--accent)",
                  }}>
                    {formatCurrency(result.total_annual_estimate)}
                  </p>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "1.5px",
                  }}>
                    Est. last 12 months
                  </p>
                </div>
              </div>

              {/* Stat cards */}
              <div className="stat-grid">
                <div className="glass-card" style={{ textAlign: "center", padding: "20px 16px" }}>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "1.5px",
                    marginBottom: 4,
                  }}>
                    Monthly estimate
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>
                    {formatCurrency(result.total_monthly_estimate)}
                  </p>
                </div>
                <div className="glass-card" style={{ textAlign: "center", padding: "20px 16px" }}>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10, fontWeight: 700,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase", letterSpacing: "1.5px",
                    marginBottom: 4,
                  }}>
                    Tracks analyzed
                  </p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>
                    {result.tracks.length}
                  </p>
                </div>
              </div>

              {/* Track breakdown */}
              <div className="glass-card">
                <h3 style={{
                  fontFamily: "'General Sans', sans-serif",
                  fontSize: 16, fontWeight: 600, marginBottom: 16,
                }}>
                  Track Breakdown
                </h3>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Track</th>
                      <th className="text-right">Est. Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.tracks.map((track, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {track.album_art_url ? (
                              <img
                                src={track.album_art_url}
                                alt={track.title}
                                style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{
                                width: 36, height: 36, borderRadius: 6, flexShrink: 0,
                                background: "rgba(212,136,58,0.1)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <IconMusic />
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontWeight: 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</p>
                              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                                {track.isrc && (
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{track.isrc}</span>
                                )}
                                {track.isrc && " \u00B7 "}
                                ~{formatNumber(track.estimated_monthly_streams)} streams/mo
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, whiteSpace: "nowrap" }}>
                          {formatCurrency(track.total_monthly_estimated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Platform breakdown */}
              <div className="glass-card">
                <h3 style={{
                  fontFamily: "'General Sans', sans-serif",
                  fontSize: 16, fontWeight: 600, marginBottom: 16,
                }}>
                  Platform Breakdown
                </h3>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th className="text-right">Rate/Stream</th>
                      <th className="text-right">Est. Streams</th>
                      <th className="text-right">Est. Monthly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(PLATFORM_LABELS).map((platform) => {
                      const totals = result.tracks.reduce(
                        (acc, track) => {
                          const dsp = track.dsp_breakdown.find(
                            (d) => d.platform === platform
                          );
                          if (dsp) {
                            acc.streams += dsp.estimated_streams;
                            acc.earnings += dsp.estimated_earnings;
                            acc.rate = dsp.rate;
                          }
                          return acc;
                        },
                        { streams: 0, earnings: 0, rate: 0 }
                      );

                      return (
                        <tr key={platform}>
                          <td style={{ fontWeight: 500, fontSize: 14 }}>
                            {PLATFORM_LABELS[platform]}
                          </td>
                          <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-tertiary)" }}>
                            ${totals.rate.toFixed(4)}
                          </td>
                          <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                            {formatNumber(totals.streams)}
                          </td>
                          <td className="text-right" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500 }}>
                            {formatCurrency(totals.earnings)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Disclaimer */}
              <p className="disclaimer">
                Estimates based on verified published per-stream rates and track performance indicators.
                <br />
                Create an account to upload your statements and see your real gap.
              </p>

              {/* CTA */}
              <div className="cta-card">
                <h3 style={{
                  fontFamily: "'General Sans', sans-serif",
                  fontSize: 20, fontWeight: 700, marginBottom: 8,
                }}>
                  Claim your earnings
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
                  {isLoggedIn
                    ? "Upload your statements, detect missing money, and register with CMOs."
                    : "Create a free account to upload your statements, detect missing money, and register with CMOs."}
                </p>
                <Link href={isLoggedIn ? "/dashboard" : "/login"} className="btn-cta" style={{ padding: "12px 24px" }}>
                  {isLoggedIn ? "My Dashboard" : "Create free account"} <IconArrowRight />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";

/* ================================================================
   Scoped CSS
   ================================================================ */

const DOCS_CSS = `
/* ---- Theme variables (scoped) ---- */
.docs-root {
  --accent: #D4883A;
  --text-primary: #E8ECF0;
  --text-secondary: #9AA8B4;
  --text-tertiary: #788898;
  --bg-surface: rgba(232,236,240,0.06);
  --border-subtle: rgba(232,236,240,0.12);
  --bg-btn-primary: #fff;
  --text-btn-primary: #000;
  --nav-underline: #fff;
  font-family: 'Plus Jakarta Sans', 'General Sans', -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--text-primary);
  line-height: 1.7;
  min-height: 100vh;
  position: relative;
}
.docs-root[data-theme="light"] {
  --text-primary: #1A1A1A;
  --text-secondary: #5A5A5A;
  --text-tertiary: #888;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
  --bg-btn-primary: #1A1A1A;
  --text-btn-primary: #F8F6F3;
  --nav-underline: #1A1A1A;
}

/* Canvas */
.docs-root canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; }

/* ---- TOP NAV ---- */
.docs-root .top-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: background 0.6s ease, border-color 0.6s ease;
}
.docs-root .nav-logo {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color 0.8s ease;
}
.docs-root .nav-logo:hover { color: var(--accent); }
.docs-root .nav-logo svg { color: inherit; transition: transform 0.8s ease, color 0.8s ease; }
.docs-root .nav-logo:hover svg { transform: scale(1.08); }
.docs-root .nav-links { display: flex; gap: 0; align-items: center; }
.docs-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; background: none; border: none;
  position: relative; padding: 4px 16px; transition: color 0.8s ease;
}
.docs-root .nav-link::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px;
  background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.docs-root .nav-link:hover { color: var(--accent); }
.docs-root .nav-link:hover::after { width: 0; }
.docs-root .nav-link.active { color: var(--accent); }
.docs-root .nav-link.active::after { width: 100%; background: var(--accent); }
.docs-root .nav-right { display: flex; align-items: center; gap: 0; }
.docs-root .nav-hit {
  display: flex;
  align-items: center;
  padding: 0 16px;
}
.docs-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-secondary); transition: all 0.5s ease;
}
.docs-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.docs-root .theme-toggle svg { width: 16px; height: 16px; transition: transform 0.5s ease; }
.docs-root .theme-toggle:hover svg { transform: rotate(15deg) scale(1.1); }
.docs-root .icon-sun { display: block; }
.docs-root .icon-moon { display: none; }
.docs-root[data-theme="light"] .icon-sun { display: none; }
.docs-root[data-theme="light"] .icon-moon { display: block; }
.docs-root .nav-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-btn-primary); background: var(--bg-btn-primary);
  border: none; border-radius: 8px; padding: 10px 22px;
  letter-spacing: 0.2px;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
}
.docs-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.docs-root .nav-cta:active { transform: scale(0.98); }

/* ---- SIDEBAR TOC ---- */
.docs-root .sidebar {
  position: fixed; top: 64px; left: 0; width: 260px;
  height: calc(100vh - 64px); padding: 72px 24px 32px;
  overflow-y: auto; scrollbar-width: none; z-index: 50;
  background: var(--bg-surface);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-subtle);
  transform: translateX(-100%);
  transition: transform 0.35s ease, background 0.6s ease, border-color 0.6s ease;
}
.docs-root .sidebar.open { transform: translateX(0); }
.docs-root .sidebar::-webkit-scrollbar { display: none; }
.docs-root .toc-list { list-style: none; padding: 0; margin: 0; }
.docs-root .toc-item { margin-bottom: 2px; }
.docs-root .toc-link {
  display: flex; align-items: baseline; gap: 10px;
  padding: 6px 8px; border-radius: 6px; text-decoration: none;
  color: var(--text-tertiary); font-size: 12px; font-weight: 500;
  transition: all 0.3s ease; line-height: 1.4;
}
.docs-root .toc-link:hover { color: var(--text-secondary); background: var(--bg-surface); }
.docs-root .toc-link.active { color: var(--accent); background: rgba(212,136,58,0.06); }
.docs-root .toc-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 700; opacity: 0.7;
  min-width: 14px; color: var(--accent);
}

/* ---- SIDEBAR TOGGLE ---- */
.docs-root .sidebar-toggle {
  display: block; position: fixed; top: 100px; left: 40px; z-index: 55;
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 8px 14px; color: var(--text-tertiary);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; transition: all 0.5s ease;
}
.docs-root .sidebar-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}

/* ---- MAIN CONTENT ---- */
.docs-root .main { padding: 0 40px; max-width: 860px; margin: 0 auto; position: relative; z-index: 1; }
.docs-root .content { max-width: 780px; margin: 0 auto; }

/* ---- COVER ---- */
.docs-root .cover {
  min-height: 100vh; display: flex; flex-direction: column;
  justify-content: center; align-items: center; text-align: center;
  padding-top: 64px;
}
.docs-root .cover-title {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(42px, 6vw, 64px); font-weight: 700;
  letter-spacing: -2.5px; line-height: 1.05; margin-bottom: 20px;
}
.docs-root .cover-subtitle {
  font-size: 18px; color: var(--text-secondary);
  max-width: 560px; line-height: 1.6; margin-bottom: 48px; text-align: center;
}
.docs-root .cover-meta {
  display: flex; gap: 32px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: var(--accent); opacity: 0.5;
}

/* ---- SCROLL INDICATOR ---- */
.docs-root .scroll-indicator {
  position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: var(--accent); z-index: 90; opacity: 0.6;
  transition: opacity 0.5s ease, color 0.6s ease;
}
.docs-root[data-theme="light"] .scroll-indicator { color: var(--text-primary); }
.docs-root .scroll-indicator.hidden { opacity: 0; pointer-events: none; }
.docs-root .scroll-indicator span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: 2px; text-transform: uppercase;
}
.docs-root .scroll-arrow {
  width: 16px; height: 16px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
}
@keyframes docs-scroll-nudge {
  0%, 8% { transform: translateX(-50%) translateY(0); }
  4% { transform: translateX(-50%) translateY(6px); }
  12%, 100% { transform: translateX(-50%) translateY(0); }
}
.docs-root .scroll-indicator.nudge { animation: docs-scroll-nudge 10s ease-in-out infinite; }

/* ---- SECTIONS ---- */
.docs-root .wp-section { padding: 56px 0; border-top: 1px solid rgba(212,136,58,0.25); }
.docs-root .section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--accent); opacity: 0.7; margin-bottom: 10px;
}
.docs-root .section-title {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(28px, 4vw, 36px); font-weight: 700;
  letter-spacing: -1.5px; line-height: 1.15; margin-bottom: 32px;
}
.docs-root .section-subtitle {
  font-family: 'General Sans', sans-serif;
  font-size: 20px; font-weight: 600; letter-spacing: -0.5px;
  margin-bottom: 16px; margin-top: 40px;
}
.docs-root .section-subtitle:first-of-type { margin-top: 0; }

/* Body text */
.docs-root .body-text {
  font-size: 15px; line-height: 1.75; color: var(--text-secondary);
  margin-bottom: 20px; text-align: justify;
}
.docs-root .body-text:last-child { margin-bottom: 0; }

/* Code blocks */
.docs-root .code-block {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; line-height: 1.65;
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: 20px 24px; margin: 20px 0;
  overflow-x: auto; color: var(--text-secondary);
  transition: border-color 0.5s ease, box-shadow 0.5s ease;
  white-space: pre;
}
.docs-root .code-block:hover {
  border-color: rgba(212,136,58,0.25);
  box-shadow: 0 2px 12px rgba(212,136,58,0.06);
}

/* Timeline */
.docs-root .timeline { position: relative; padding-left: 24px; margin: 24px 0; }
.docs-root .timeline::before {
  content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px;
  width: 1px; background: var(--border-subtle);
}
.docs-root .timeline-item { position: relative; padding: 12px 0; transition: transform 0.5s ease; }
.docs-root .timeline-item:hover { transform: translateX(4px); }
.docs-root .timeline-item:hover .timeline-phase { opacity: 1; }
.docs-root .timeline-item:hover .timeline-focus { color: var(--accent); }
.docs-root .timeline-item::before {
  content: ''; position: absolute; left: -23px; top: 18px;
  width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
}
.docs-root .timeline-phase {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--accent); margin-bottom: 4px;
}
.docs-root .timeline-focus {
  font-family: 'General Sans', sans-serif;
  font-size: 15px; font-weight: 600; margin-bottom: 6px; transition: color 0.5s ease;
}
.docs-root .timeline-desc { font-size: 13px; color: var(--text-tertiary); line-height: 1.6; text-align: justify; }

/* Data tables */
.docs-root .table-wrap { overflow-x: auto; margin: 24px 0; -webkit-overflow-scrolling: touch; }
.docs-root .spec-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 500px; }
.docs-root .spec-table th {
  text-align: left; font-family: 'JetBrains Mono', monospace;
  font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--accent); opacity: 0.7;
  padding: 10px 14px; border-bottom: 1px solid rgba(212,136,58,0.25); white-space: nowrap;
}
.docs-root .spec-table td {
  padding: 10px 14px; border-bottom: 1px solid rgba(212,136,58,0.08);
  vertical-align: top; color: var(--text-secondary); line-height: 1.5; transition: color 0.5s ease;
}
.docs-root .spec-table tbody tr { transition: background 0.5s ease; }
.docs-root .spec-table tbody tr:hover { background: rgba(212,136,58,0.04); }
.docs-root .spec-table tbody tr:hover td { color: var(--text-primary); }
.docs-root .spec-table .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

/* Footer */
.docs-root .wp-footer { padding: 100px 0 60px; }
.docs-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.docs-root .footer-col-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.docs-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease;
}
.docs-root .footer-link:hover { color: var(--accent); }
.docs-root .social-col { display: flex; flex-direction: column; gap: 10px; }
.docs-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.docs-root .social-icon:hover { color: var(--accent); }

/* Responsive */
@media (max-width: 768px) {
  .docs-root .top-nav { padding: 12px 20px; }
  .docs-root .nav-links { display: none; }
  .docs-root .nav-hit:has(.nav-cta) { display: none; }
  .docs-root .nav-cta { display: none; }
  .docs-root .main { padding: 0 20px; }
  .docs-root .cover-title { letter-spacing: -1.5px; }
  .docs-root .cover-meta { flex-direction: column; gap: 8px; }
  .docs-root .section-title { margin-bottom: 24px; }
  .docs-root .spec-table { font-size: 12px; }
}
`;

/* ================================================================
   Shaders (identical to sniffer / onboarding / login)
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
   WavCash Logo SVG (reusable)
   ================================================================ */

function WavLogo({ w = 26, h = 22 }: { w?: number; h?: number }) {
  return (
    <svg width={w} height={h} viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

/* ================================================================
   TOC Data
   ================================================================ */

const TOC = [
  { id: "executive-summary", num: "1", label: "Executive Summary" },
  { id: "the-problem", num: "2", label: "The Problem" },
  { id: "the-solution", num: "3", label: "The Solution" },
  { id: "phase-2", num: "4", label: "Phase 2 and Beyond" },
  { id: "technical", num: "5", label: "Technical Architecture" },
  { id: "pricing", num: "6", label: "Pricing" },
  { id: "conclusion", num: "7", label: "Conclusion" },
];

/* ================================================================
   Component
   ================================================================ */

export default function DocsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { ready, authenticated } = usePrivy();
  const isLoggedIn = ready && authenticated;

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightModeRef = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("executive-summary");
  const [scrolled, setScrolled] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // ---- Theme sync ----
  useEffect(() => {
    try {
      const stored = localStorage.getItem("wavcash-theme");
      if (stored && stored !== resolvedTheme) {
        setNextTheme(stored);
        return;
      }
    } catch {}

    const isLight = resolvedTheme === "light";
    lightModeRef.current = isLight;
    rootRef.current?.setAttribute("data-theme", isLight ? "light" : "dark");

  }, [resolvedTheme]);

  function toggleTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setNextTheme(next);
    try { localStorage.setItem("wavcash-theme", next); } catch {}
  }

  // ---- Scroll spy + scroll indicator ----
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".docs-root .wp-section, .docs-root .cover");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((s) => { if (s.id) observer.observe(s); });

    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
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
      gl!.viewport(0, 0, SIM, SIM); gl!.useProgram(pDrop);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo[cW]);
      gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
      gl!.uniform1i(uDrop.src, 0); gl!.uniform2f(uDrop.center, cx, cy);
      gl!.uniform1f(uDrop.radius, rad); gl!.uniform1f(uDrop.strength, str);
      gl!.bindVertexArray(vao); gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4); swap();
    }
    function runUpdate() {
      gl!.viewport(0, 0, SIM, SIM); gl!.useProgram(pUpdate);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo[cW]);
      gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
      gl!.uniform1i(uUpdate.src, 0); gl!.uniform2f(uUpdate.texel, 1 / SIM, 1 / SIM);
      gl!.bindVertexArray(vao); gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4); swap();
    }

    let mx = 0.5, my = 0.5, pmx = 0.5, pmy = 0.5, smoothStr = 0, lastMove = 0;

    const onMM = (e: MouseEvent) => { mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; lastMove = performance.now(); };
    const onTM = (e: TouchEvent) => { mx = e.touches[0].clientX / innerWidth; my = 1 - e.touches[0].clientY / innerHeight; lastMove = performance.now(); };
    document.addEventListener("mousemove", onMM);
    document.addEventListener("touchmove", onTM, { passive: true });

    function resize() {
      const d = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(canvas!.clientWidth * d);
      canvas!.height = Math.round(canvas!.clientHeight * d);
    }
    resize();
    window.addEventListener("resize", resize);

    const t0 = performance.now();
    let frame = 0, rafId: number;
    let revealed = false;

    function loop() {
      rafId = requestAnimationFrame(loop);
      const now = performance.now(), time = (now - t0) * 0.001; frame++;
      const dx = mx - pmx, dy = my - pmy, vel = Math.sqrt(dx * dx + dy * dy) * 60;
      pmx = mx; pmy = my;
      const moving = (now - lastMove) < 150;
      const rawStr = moving ? 0.15 + Math.min(vel, 3) * 0.15 : 0;
      if (rawStr >= smoothStr) smoothStr = rawStr; else smoothStr += (rawStr - smoothStr) * 0.04;
      if (smoothStr > 0.001) runDrop(mx, my, 0.015, smoothStr);
      runUpdate();
      if (!moving && frame % 90 === 0) runDrop(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, 0.035, 0.04);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.useProgram(pRender);
      gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
      gl!.uniform1i(uRender.hmap, 0); gl!.uniform2f(uRender.texel, 1 / SIM, 1 / SIM);
      gl!.uniform2f(uRender.res, canvas!.width, canvas!.height);
      gl!.uniform1f(uRender.time, time); gl!.uniform1i(uRender.uLightMode, lightModeRef.current ? 1 : 0);
      gl!.bindVertexArray(vao); gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

      if (!revealed) {
        revealed = true;
        document.body.style.opacity = "1";
      }
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMM);
      document.removeEventListener("touchmove", onTM);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ---- Render ----
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DOCS_CSS }} />

      <div ref={rootRef} className="docs-root" data-theme="dark">
        <canvas ref={canvasRef} />

        {/* Top nav */}
        <nav className="top-nav">
          <Link href="/" className="nav-logo">
            <WavLogo />
            WavCash
          </Link>
          <div className="nav-links">
            <button className="nav-link" type="button" onClick={() => router.push("/sniffer")}>Royalty Sniffer</button>
            <button className="nav-link" type="button">Splits</button>
            <button className="nav-link" type="button">Reclaim</button>
            <button className="nav-link" type="button">Pricing</button>
          </div>
          <div className="nav-right">
            <div className="nav-hit">
              <button className="theme-toggle" type="button" aria-label="Toggle theme" onClick={toggleTheme}>
                <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              </button>
            </div>
            <div className="nav-hit">
              <button className="nav-cta" type="button" onClick={() => router.push(isLoggedIn ? "/dashboard" : "/login")}>{isLoggedIn ? "My Dashboard" : "Get Started"}</button>
            </div>
          </div>
        </nav>

        {/* Sidebar toggle */}
        <button className="sidebar-toggle" type="button" aria-label="Toggle table of contents" onClick={() => setSidebarOpen((o) => !o)}>
          Table of Contents
        </button>

        {/* Sidebar TOC */}
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <ul className="toc-list">
            {TOC.map((item) => (
              <li key={item.id} className="toc-item">
                <a
                  href={`#${item.id}`}
                  className={`toc-link ${activeSection === item.id ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span className="toc-num">{item.num}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Scroll indicator */}
        <div className={`scroll-indicator ${scrolled ? "hidden" : "nudge"}`}>
          <span>Scroll down</span>
          <div className="scroll-arrow" />
        </div>

        {/* Main content */}
        <div className="main">
          <div className="content">

            {/* Cover */}
            <section className="cover" id="cover">
              <div style={{ marginBottom: 24 }}>
                <WavLogo w={48} h={38} />
              </div>
              <h1 className="cover-title">WavCash<br />White Paper</h1>
              <p className="cover-subtitle">Royalty intelligence and payment infrastructure for music rights holders in Africa and Latin America.</p>
              <div className="cover-meta">
                <span>wav.cash</span>
                <span>February 2026</span>
              </div>
            </section>

            {/* Executive Summary */}
            <section className="wp-section" id="executive-summary">
              <div className="section-label">Executive Summary</div>
              <h2 className="section-title">The gap between what the fastest-growing music markets earn and what their rights holders receive</h2>
              <p className="body-text">Music rights holders in Africa and Latin America are operating blind. Streaming revenues in these regions grew 22.5 to 22.6 percent in 2024, among the fastest rates anywhere in the world. The infrastructure built to track, verify, and distribute the money those streams generate was designed for different markets, different eras, and different rights holders. The result is a structural gap between what the fastest-growing music markets earn and what their rights holders actually receive.</p>
              <p className="body-text">WavCash is royalty intelligence and payment infrastructure built to close that gap. It aggregates streaming data across every major DSP, calculates what rights holders are owed using tamper-proof verified data, surfaces the difference between expected and actual payouts, guides registration with Collective Management Organizations, and in Phase 2 settles instantly to local currency via M-Pesa, PIX, Paystack, bank transfer, or USDC.</p>
              <p className="body-text">The platform serves all music rights holders: artists, producers, songwriters, session musicians, publishers, and anyone else with a legal stake in a musical work. Independent artists are the primary acquisition channel and the face of the product. Every feature is built for the broader rights holder ecosystem, and the Enterprise tier is designed for labels, managers, and publishers handling multiple catalogs.</p>
            </section>

            {/* Part 1: The Problem */}
            <section className="wp-section" id="the-problem">
              <div className="section-label">Part 1</div>
              <h2 className="section-title">The Problem</h2>

              <h3 className="section-subtitle">Fragmentation by Design</h3>
              <p className="body-text">A rights holder in Lagos, Nairobi, or Sao Paulo today earns royalties from multiple sources that have nothing to do with each other. Their distributor pays master recording royalties on a monthly or quarterly schedule. Their Collective Management Organization may or may not have their registration on file, and if it does, pays out every six to twelve months after significant administrative delay. YouTube Content ID earnings operate on a separate schedule. Sync licensing deals pay whenever a placement closes.</p>
              <p className="body-text">Each income stream has its own portal, its own statement format, and its own currency conversion. A rights holder managing even a small catalog across two distributors and one CMO is navigating at minimum three separate dashboards with no unified view of their total earnings.</p>

              <h3 className="section-subtitle">The Registration Gap</h3>
              <p className="body-text">A significant share of royalties go uncollected in Africa and Latin America because rights holders have never registered their works with the relevant CMOs. In Nigeria, publishing activity accounts for a small fraction of total music industry revenue precisely because rights holders are not registered with organizations like MCSN or COSON. The registration process itself is a barrier. Each CMO has different requirements, different forms, different documentation, and different submission channels. For a producer in Lagos managing multiple tracks across multiple artists, navigating six different CMO processes in four different countries is prohibitive.</p>

              <h3 className="section-subtitle">The Settlement Problem</h3>
              <p className="body-text">Even when royalties are collected and verified, the last mile fails. Converting USD or EUR royalties to Nigerian naira, Kenyan shillings, or Brazilian reais through traditional banking infrastructure involves three to five percent in conversion costs and processing times measured in days or weeks. For rights holders who depend on royalty income to fund their next project, a two-to-six month payment cycle followed by a slow and expensive conversion is not a financial system. It is a friction machine.</p>
              <p className="body-text">The payment infrastructure to solve this problem already exists. PIX covers 175 million users across Brazil and processes transactions in seconds. M-Pesa serves over 34 million active users in Kenya alone. Paystack handles approximately 20 percent of all online transactions in Nigeria. For rights holders who prefer to hold or transact in stablecoins, USDC settlement on AVAX C-Chain is also available. What is missing is the collection and intelligence layer that connects royalty income to these payment systems.</p>
            </section>

            {/* Part 2: The Solution */}
            <section className="wp-section" id="the-solution">
              <div className="section-label">Part 2</div>
              <h2 className="section-title">The Solution</h2>

              <h3 className="section-subtitle">Royalty Intelligence, Not Royalty Accounting</h3>
              <p className="body-text">The fundamental insight behind WavCash is the difference between intelligence and accounting. Accounting tells you what arrived. Intelligence tells you what should have arrived. Existing tools in the market handle accounting. WavCash leads with intelligence.</p>
              <p className="body-text">The oracle layer sits at the center of the product. It fetches stream counts from every major DSP using track ISRCs, applies published per-stream rates verified independently through Chainlink data feeds, and calculates estimated royalties in real time. Rights holders see what they should be earning before any payment arrives. When payments do arrive, via CSV upload and automatic sync in Phase 3, the platform compares actuals against oracle estimates and flags discrepancies.</p>

              <h3 className="section-subtitle">Data Architecture and Trust</h3>
              <p className="body-text">The royalty oracle pipeline runs offchain for cost efficiency. Stream count data is fetched via DSP APIs through a daily batch job and stored in a managed database. Per-stream rates are sourced from independently verified onchain data feeds and stored in a rates registry on AVAX C-Chain.</p>
              <p className="body-text">WavCash uses a hybrid approach: the pipeline itself runs offchain, while trust is enforced through a daily onchain attestation. Once per day, after the full data snapshot is complete, WavCash writes a single cryptographic merkle root of the entire dataset to AVAX C-Chain. If any number in the underlying data were altered, the hash would not match the onchain record. Tampering is detectable and the verification is permanently and publicly auditable.</p>

              <h3 className="section-subtitle">Splits by WavCash</h3>
              <p className="body-text">Every song has multiple contributors. Producers, co-writers, featured artists, session musicians, and engineers all have legitimate claims on a track&#39;s earnings. In practice, these arrangements are governed by verbal agreements, WhatsApp messages, and informal trust. When money arrives, disputes arise. Splits by WavCash creates legally binding, onchain co-ownership records before any money arrives.</p>
              <p className="body-text">When a track is finished, the rights holder creates a Split agreement: adding each contributor by email with legal name required, or by WavCash ID, a unique platform identifier that auto-populates contributor details. Each contributor is assigned a role and a percentage. The agreement is sent for signatures. An agreement does not become Active until all contributors have signed.</p>
              <p className="body-text">A WavCash Split is a permanent legal and onchain record. It establishes who owns what. When royalties arrive for that track, distribution to contributors happens manually or through the creator&#39;s own arrangements.</p>
              <p className="body-text">In Phase 2, when virtual account infrastructure activates, automatic redistribution turns on. When royalties arrive for a registered ISRC, WavCash detects the incoming payment, checks whether an active Split agreement exists, and automatically distributes each contributor&#39;s share to their preferred settlement method: local currency, or USDC. The creating rights holder forwards nothing manually. The contract executes.</p>
              <p className="body-text">The key architectural fact is that distributors pay the full royalty amount to whoever registered the track. The distributor has no knowledge of private split arrangements. WavCash operates as the redistribution layer between the distributor payout and the individual contributors.</p>

              <h3 className="section-subtitle">Reclaim: CMO Registration Guide</h3>
              <p className="body-text">Reclaim is a guided registration tool that helps rights holders navigate CMO registration in their territory. WavCash prepares the complete submission package: pre-filled forms using catalog data and profile data already stored in the system. Rights holders review the package, upload required documents, and receive step-by-step instructions for submitting through the CMO&#39;s own channel.</p>
              <p className="body-text">WavCash does not submit to CMOs directly. CMOs do not have public submission APIs and registration happens through portals, email, or physical mail. WavCash prepares. The rights holder submits. Status tracking and reminder emails keep the process moving.</p>
              <p className="body-text">Reclaim covers MCSN and COSON (Nigeria), PAVRISK and KAMP (Kenya), SAMRO, CAPASSO, and SAMPRA (South Africa), ECAD, ABRAMUS, and UBC (Brazil), and GHAMRO (Ghana). Each registration wizard includes a per-track payout toggle, default on, that configures routing of distributor royalties through WavCash for instant local settlement or USDC.</p>

              <h3 className="section-subtitle">Enterprise Multi-Seat Dashboard</h3>
              <p className="body-text">Enterprise accounts serve any rights holder or organization managing three or more artists or works: managers, small labels, independent publishers, and collective groups. Enterprise is not limited to traditional label structures.</p>
              <p className="body-text">Enterprise provides consolidated roster visibility: total earnings across all artists, Reclaim status per artist per CMO, active Splits across the roster, and team seat management. In Phase 2, Enterprise adds the full label tooling suite: bulk payout management, white-label royalty statements, automatic split redistribution across the roster, and onboarding of artists on the label&#39;s behalf. Enterprise customers arriving at the moment payment rails activate bring their entire roster into the payout infrastructure from day one, generating immediate transaction volume.</p>
            </section>

            {/* Part 3: Phase 2 and Beyond */}
            <section className="wp-section" id="phase-2">
              <div className="section-label">Part 3</div>
              <h2 className="section-title">Phase 2 and Beyond</h2>

              <h3 className="section-subtitle">Virtual Account Infrastructure</h3>
              <p className="body-text">Phase 2 activates the payment layer through virtual account infrastructure issued in rights holders&#39; names, rolling out across Africa and Latin America through market-specific Banking-as-a-Service partners.</p>
              <p className="body-text">Each WavCash account receives a dedicated virtual account in the rights holder&#39;s name. The account details are never surfaced in the product UI. The account simply receives royalties.</p>
              <p className="body-text">When a distributor pays royalties into this account, WavCash detects the incoming payment, identifies the ISRC, checks for active Split agreements, and routes to the rights holder&#39;s preferred settlement method: M-Pesa, PIX, Paystack, bank transfer, or USDC.e on AVAX C-Chain. Rights holders who prefer stablecoin settlement get the same instant clearance without any FX conversion cost.</p>

              <h3 className="section-subtitle">Product Roadmap</h3>
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-phase">MVP</div>
                  <div className="timeline-focus">Royalty Intelligence</div>
                  <div className="timeline-desc">Oracle dashboard, Royalty Sniffer, Reclaim guide, onchain Splits, Enterprise roster</div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-phase">Phase 2</div>
                  <div className="timeline-focus">Payments + Enterprise Tools</div>
                  <div className="timeline-desc">Virtual accounts (Nigeria, Brazil, Ghana, South Africa), distributor payout rail, CMO payout rail, full Enterprise suite, local currency and USDC settlement</div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-phase">Phase 3</div>
                  <div className="timeline-focus">Distribution Intelligence</div>
                  <div className="timeline-desc">Distributor OAuth, Kenya rail, Ghana activation, earnings forecasting, catalog health score</div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-phase">Phase 4</div>
                  <div className="timeline-focus">Territory Expansion</div>
                  <div className="timeline-desc">Colombia, Argentina, Tanzania</div>
                </div>
              </div>
            </section>

            {/* Part 4: Technical Architecture */}
            <section className="wp-section" id="technical">
              <div className="section-label">Part 4</div>
              <h2 className="section-title">Technical Architecture</h2>

              <h3 className="section-subtitle">Oracle Architecture</h3>
              <p className="body-text">WavCash uses a hybrid offchain and onchain approach. Stream count data is fetched from DSP APIs via a daily offchain cron job and stored in a managed database. Per-stream rates are sourced from Chainlink Data Feeds and stored onchain in a rates registry on AVAX C-Chain, ensuring that the rate inputs are independently verifiable and not controlled by WavCash. Once per day, a single cryptographic merkle root of the entire dataset is written to AVAX C-Chain in one transaction, creating a tamper-proof permanent record for every rights holder, every track, and every DSP.</p>

              <h3 className="section-subtitle">Onchain Contracts</h3>
              <div className="code-block">{`DataAttestation.sol    Receives daily merkle root writes. Stores timestamp,
                       root hash, snapshot ID. Public verification function.

RatesRegistry.sol      Stores per-stream rates fed by Chainlink. Quarterly
                       updates. Authoritative rate source for oracle.

SplitFactory.sol       Deploys individual Split contracts. Maintains registry
                       of all agreements.

Split.sol              Per-agreement contract. ISRC, contributor addresses,
                       share allocations, status enum.
                       Functions: sign(), amend(), void().`}</div>
            </section>

            {/* Part 5: Pricing */}
            <section className="wp-section" id="pricing">
              <div className="section-label">Part 5</div>
              <h2 className="section-title">Pricing</h2>

              <h3 className="section-subtitle">Subscription Tiers</h3>
              <div className="table-wrap">
                <table className="spec-table">
                  <thead>
                    <tr><th>Tier</th><th>Annual Price</th><th>Monthly Price</th><th>Seats</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Basic</td><td className="mono">$6.99/month</td><td className="mono">$9.99/month</td><td className="mono">1</td></tr>
                    <tr><td>Premium</td><td className="mono">$11.99/month</td><td className="mono">$14.99/month</td><td className="mono">1</td></tr>
                    <tr><td>Enterprise (3-seat)</td><td className="mono">$45/month</td><td className="mono">$55/month</td><td className="mono">3</td></tr>
                    <tr><td>Enterprise (5-seat)</td><td className="mono">$75/month</td><td className="mono">$85/month</td><td className="mono">5</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Conclusion */}
            <section className="wp-section" id="conclusion">
              <div className="section-label">Conclusion</div>
              <h2 className="section-title">Your music. Your money. Finally.</h2>
              <p className="body-text">The global music industry is worth $29.6 billion and growing. The fastest-growing markets are Africa and Latin America. The rights holders in those markets are building global careers on infrastructure that was not designed for them: opaque, slow, fragmented, and expensive.</p>
              <p className="body-text">WavCash is transparent by design, fast by architecture, and built from the ground up for the rights holder in Lagos, Sao Paulo, or Nairobi who deserves to know exactly how their music is earning and to have full control over how they receive that money.</p>
              <p className="body-text">The oracle is tamper-proof. The splits are permanent. The payment rails are local. Settlements land in local currency or USDC, whichever the rights holder prefers. WavCash is for everyone: artists, producers, songwriters, session musicians, publishers, and the managers and labels who work with them all.</p>
            </section>

            {/* Footer */}
            <div className="wp-footer">
              <div className="footer-grid">
                <div>
                  <div className="footer-col-title">Legal</div>
                  <a href="/terms" className="footer-link">Terms</a>
                  <a href="/privacy" className="footer-link">Privacy Policy</a>
                </div>
                <div>
                  <div className="footer-col-title">Docs</div>
                  <a href="/docs" className="footer-link">FAQs</a>
                  <a href="/docs" className="footer-link">White paper</a>
                </div>
                <div>
                  <div className="footer-col-title">Social</div>
                  <div className="social-col">
                    <a href="https://x.com/wavcash" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="X (Twitter)">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </a>
                    <a href="mailto:hello@wavcash.com" className="social-icon" aria-label="Email">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

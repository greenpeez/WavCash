"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

/* ================================================================
   WavCash Landing Page — Mercury Surface
   Ported 1:1 from wavcash-landing.html
   ================================================================ */

const LANDING_CSS = `
/* ---- SCOPED THEME CUSTOM PROPERTIES ---- */
.landing-root {
  --bg-body: #0a0a0a;
  --text-primary: #E8ECF0;
  --text-secondary: #9AA8B4;
  --text-tertiary: #788898;
  --text-badge: #A0A4A8;
  --text-btn-primary: #000;
  --bg-btn-primary: #fff;
  --bg-surface: rgba(232,236,240,0.06);
  --border-subtle: rgba(232,236,240,0.12);
  --border-badge: rgba(255,255,255,0.12);
  --bg-badge: rgba(255,255,255,0.06);
  --h1-g1: #fff;
  --h1-g2: #ddd;
  --h1-g3: #aaa;
  --p-g1: #9AA8B4;
  --p-g2: #8A98A6;
  --p-g3: #7A8898;
  --accent: #D4883A;
  --nav-underline: #fff;
  --btn-primary-shadow: rgba(255,255,255,0.1);
  --btn-primary-active-shadow: rgba(255,255,255,0.08);
  --search-bg: rgba(232,236,240,0.04);
  --search-focus-shadow: rgba(0,0,0,0.3);
}
html[data-theme="light"] .landing-root {
  --bg-body: #F8F6F3;
  --text-primary: #1A1A1A;
  --text-secondary: #5A5A5A;
  --text-tertiary: #888;
  --text-badge: #777;
  --text-btn-primary: #F8F6F3;
  --bg-btn-primary: #1A1A1A;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
  --border-badge: rgba(0,0,0,0.10);
  --bg-badge: rgba(0,0,0,0.04);
  --h1-g1: #1A1A1A;
  --h1-g2: #333;
  --h1-g3: #555;
  --p-g1: #5A5A5A;
  --p-g2: #6A6A6A;
  --p-g3: #7A7A7A;
  --nav-underline: #1A1A1A;
  --btn-primary-shadow: rgba(0,0,0,0.08);
  --btn-primary-active-shadow: rgba(0,0,0,0.06);
  --search-bg: rgba(0,0,0,0.03);
  --search-focus-shadow: rgba(0,0,0,0.08);
}

.landing-root {
  width: 100%; height: 100vh; overflow: hidden;
  background: var(--bg-body);
  position: relative;
  font-family: 'Plus Jakarta Sans', var(--font-plus-jakarta), -apple-system, sans-serif;
  color: var(--text-primary);
  transition: background 0.6s ease, color 0.6s ease;
}

.landing-root canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; background: var(--bg-body); }

/* ---- UI OVERLAY ---- */
.landing-root .ui-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 10; pointer-events: none;
  display: flex; flex-direction: column;
  transition: color 0.6s ease;
}
.landing-root .ui-overlay * { pointer-events: auto; }

/* ---- TOP NAV ---- */
.landing-root .nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px; width: 100%;
  background: transparent;
}
.landing-root .nav-logo {
  font-family: 'General Sans', var(--font-general-sans), sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  transition: color 0.8s ease;
  text-decoration: none;
}
.landing-root .nav-logo:hover { color: var(--accent); }
.landing-root .nav-logo svg { transition: transform 0.8s ease; }
.landing-root .nav-logo:hover svg { transform: scale(1.08); }
.landing-root .nav-logo svg path,
.landing-root .nav-logo svg line { transition: stroke 0.8s ease; }
.landing-root .nav-logo:hover svg path,
.landing-root .nav-logo:hover svg line { stroke: var(--accent); }

.landing-root .nav-links {
  display: flex; gap: 0; align-items: center;
}
.landing-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; cursor: none !important;
  position: relative; padding: 4px 16px;
  transition: color 0.8s ease;
  background: none; border: none;
  font-family: inherit;
}
.landing-root .nav-link::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px; background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.landing-root .nav-link:hover { color: var(--accent); }
.landing-root .nav-link:hover::after { width: 100%; background: var(--accent); }

/* ---- COLLAPSIBLE NAV MENU ---- */
.landing-root .nav-product-toggle {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  cursor: none !important; position: relative; padding: 4px 16px;
  background: none; border: none; font-family: inherit;
  white-space: nowrap; overflow: hidden;
  max-width: 80px;
  transform: translateX(0);
  opacity: 1; filter: blur(0);
  transition: max-width 0.5s cubic-bezier(0.4,0,0.2,1),
              padding 0.5s cubic-bezier(0.4,0,0.2,1),
              opacity 0.4s ease, filter 0.4s ease,
              transform 0.4s ease, color 0.8s ease;
}
.landing-root .nav-product-toggle::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px; background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.landing-root .nav-product-toggle:hover { color: var(--accent); }
.landing-root .nav-product-toggle:hover::after { width: 100%; background: var(--accent); }
.landing-root .nav-product-toggle.open {
  max-width: 0; padding: 0;
  opacity: 0; filter: blur(6px);
  transform: translateX(-20px);
  pointer-events: none;
}
.landing-root .nav-menu-items {
  display: flex; gap: 0; align-items: center;
  overflow: hidden;
  max-width: 0; opacity: 0;
  transition: max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
  white-space: nowrap;
}
.landing-root .nav-menu-items.open {
  max-width: 600px; opacity: 1;
}

.landing-root .nav-cta {
  font-size: 13px; font-weight: 600; color: var(--text-btn-primary);
  background: var(--bg-btn-primary); border: none; border-radius: 8px;
  padding: 10px 22px; cursor: none !important; letter-spacing: 0.2px;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
  box-shadow: 0 0 0 0 rgba(255,255,255,0);
  font-family: inherit;
}
.landing-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.landing-root .nav-cta:active { transform: scale(0.98); }

/* ---- HERO CENTER ---- */
.landing-root .hero {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 0 40px 80px;
  gap: 24px;
}
.landing-root .hero-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--bg-badge); border: 1px solid var(--border-badge);
  border-radius: 100px; padding: 6px 16px;
  font-size: 12px; font-weight: 600; color: var(--text-badge);
  letter-spacing: 0.8px; text-transform: uppercase;
  transition: all 0.8s ease;
}
.landing-root .hero-badge:hover {
  background: rgba(212,136,58,0.10);
  border-color: rgba(212,136,58,0.35);
  color: var(--accent);
  transform: translateY(-1px);
}
.landing-root .hero-badge:hover .dot { background: var(--accent); }
.landing-root .hero-badge .dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text-badge);
  animation: lp-pulse-dot 2s ease-in-out infinite;
}
@keyframes lp-pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.7); }
}

.landing-root .hero h1 {
  font-family: 'General Sans', var(--font-general-sans), sans-serif;
  font-size: clamp(42px, 6vw, 72px);
  font-weight: 700; line-height: 1.05;
  letter-spacing: -2px;
}
.landing-root .hero h1 .hw {
  background: linear-gradient(135deg, var(--h1-g1) 0%, var(--h1-g2) 40%, var(--h1-g3) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: lp-gradient-shift 8s ease infinite;
}
@keyframes lp-gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.landing-root .hero p {
  font-size: clamp(16px, 2vw, 20px);
  color: var(--text-secondary); max-width: 520px; line-height: 1.6;
  font-weight: 400;
}
.landing-root .hero p .hw {
  background: linear-gradient(135deg, var(--p-g1) 0%, var(--p-g2) 40%, var(--p-g3) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: lp-gradient-shift-p 10s ease infinite;
}
@keyframes lp-gradient-shift-p {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.landing-root .hero-actions {
  display: flex; gap: 16px; margin-top: 8px;
  align-items: center;
}
.landing-root .btn-primary {
  font-family: 'Plus Jakarta Sans', var(--font-plus-jakarta), sans-serif;
  font-size: 15px; font-weight: 600; color: var(--text-btn-primary);
  background: var(--bg-btn-primary); border: none; border-radius: 10px;
  padding: 14px 32px; cursor: none !important;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
  box-shadow: 0 2px 8px var(--btn-primary-shadow);
}
.landing-root .btn-primary:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.landing-root .btn-primary:active { transform: translateY(0px); box-shadow: 0 1px 4px var(--btn-primary-active-shadow); }

.landing-root .btn-secondary {
  font-family: 'Plus Jakarta Sans', var(--font-plus-jakarta), sans-serif;
  font-size: 15px; font-weight: 500; color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: 10px;
  padding: 13px 28px; cursor: none !important;
  transition: all 0.5s ease;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.landing-root .btn-secondary:hover {
  background: rgba(212,136,58,0.08);
  border-color: rgba(212,136,58,0.35);
  color: var(--accent);
  transform: translateY(-1px);
}
.landing-root .btn-secondary:active { transform: scale(0.98); }

/* ---- FLOATING INPUT DEMO ---- */
.landing-root .search-demo {
  position: relative; width: 100%; max-width: 460px;
  margin-top: 4px;
}
.landing-root .search-input {
  width: 100%;
  font-family: 'Plus Jakarta Sans', var(--font-plus-jakarta), sans-serif;
  font-size: 14px; color: var(--text-primary);
  background: var(--search-bg);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 14px 20px 14px 44px;
  outline: none;
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.landing-root .search-input::placeholder { color: var(--text-tertiary); transition: color 0.5s ease; }
.landing-root .search-input:hover {
  border-color: rgba(212,136,58,0.25);
  background: rgba(212,136,58,0.03);
}
.landing-root .search-input:hover::placeholder { color: var(--accent); }
.landing-root .search-input:focus {
  border-color: rgba(212,136,58,0.4);
  background: rgba(212,136,58,0.04);
  box-shadow: 0 0 0 3px rgba(212,136,58,0.1), 0 8px 30px var(--search-focus-shadow);
  transform: translateY(-1px);
}
.landing-root .search-input:focus::placeholder { color: var(--accent); }
.landing-root .search-icon {
  position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
  color: var(--text-tertiary); transition: color 0.5s ease;
  pointer-events: none;
}
.landing-root .search-input:hover ~ .search-icon { color: var(--accent); }
.landing-root .search-input:focus ~ .search-icon { color: var(--accent); }

/* ---- AMBER ACCENT WORDS ---- */
.landing-root .word-royalties,
.landing-root .word-visible { position: relative; }
.landing-root .flare-svg {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none; overflow: visible;
}
.landing-root .hw { display: inline; }
.landing-root .hero-badge .hw { transition: color 1s ease; }
.landing-root .hero-badge .hw:hover { color: var(--accent); }

/* ---- NAV HIT WRAPPERS ---- */
.landing-root .nav-hit {
  display: flex;
  align-items: center;
  padding: 0 16px;
}

/* ---- THEME TOGGLE ---- */
.landing-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px;
  cursor: none !important; display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  transition: all 0.5s ease;
  font-family: inherit;
}
.landing-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.landing-root .theme-toggle svg { width: 16px; height: 16px; transition: transform 0.5s ease; }
.landing-root .theme-toggle:hover svg { transform: rotate(15deg) scale(1.1); }
.landing-root .theme-toggle .icon-sun { display: block; }
.landing-root .theme-toggle .icon-moon { display: none; }
html[data-theme="light"] .landing-root .theme-toggle .icon-sun { display: none; }
html[data-theme="light"] .landing-root .theme-toggle .icon-moon { display: block; }

/* ---- SITE FOOTER ---- */
.landing-root .site-footer {
  width: 100%; padding: 0 40px 32px;
  pointer-events: auto;
}
.landing-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.landing-root .footer-grid > div {
  display: flex; flex-direction: column; align-items: center;
}
.landing-root .footer-col-title {
  font-family: 'JetBrains Mono', var(--font-jetbrains), monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.landing-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease; background: none; border: none;
  padding: 0; font-family: inherit;
}
.landing-root .footer-link:hover { color: var(--accent); }
.landing-root .social-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.landing-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.landing-root .social-icon:hover { color: var(--accent); }
`;

/* ================================================================
   WEBGL2 SHADER SOURCES
   ================================================================ */

const VERT = `#version 300 es
layout(location = 0) in vec2 pos;
out vec2 uv;
void main() {
  uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0, 1);
}`;

const FRAG_DROP = `#version 300 es
precision highp float;
uniform sampler2D src;
uniform vec2 center;
uniform float radius;
uniform float strength;
in vec2 uv;
out vec4 dst;
void main() {
  vec4 s = texture(src, uv);
  float dist = distance(uv, center);
  float mound = exp(-dist * dist / (radius * radius));
  s.r += mound * strength * 0.04;
  dst = s;
}`;

const FRAG_UPDATE = `#version 300 es
precision highp float;
uniform sampler2D src;
uniform vec2 texel;
in vec2 uv;
out vec4 dst;
void main() {
  vec4 s = texture(src, uv);
  float n = texture(src, uv + vec2(0, texel.y)).r;
  float south = texture(src, uv - vec2(0, texel.y)).r;
  float e = texture(src, uv + vec2(texel.x, 0)).r;
  float w = texture(src, uv - vec2(texel.x, 0)).r;
  float avg = (n + south + e + w) * 0.25;
  s.g += (avg - s.r) * 0.18;
  s.g *= 0.945;
  s.r += s.g;
  s.r *= 0.9992;
  vec2 a = smoothstep(vec2(0), vec2(0.01), uv);
  vec2 b = smoothstep(vec2(0), vec2(0.01), 1.0 - uv);
  float edge = a.x * a.y * b.x * b.y;
  s.rg *= edge;
  dst = s;
}`;

const FRAG_RENDER = `#version 300 es
precision highp float;
uniform sampler2D hmap;
uniform vec2 texel;
uniform vec2 res;
uniform float time;
uniform int uLightMode;
in vec2 uv;
out vec4 fc;
vec3 getNorm(vec2 p) {
  float l = texture(hmap, p - vec2(texel.x, 0)).r;
  float r = texture(hmap, p + vec2(texel.x, 0)).r;
  float u = texture(hmap, p + vec2(0, texel.y)).r;
  float d = texture(hmap, p - vec2(0, texel.y)).r;
  float ns = uLightMode == 1 ? 2.0 : 1.0;
  return normalize(vec3((l - r) * ns, (d - u) * ns, 1.0));
}
vec3 env(vec3 rd) {
  float y = rd.y;
  vec3 dark, mid, tint;
  float limiter;
  if (uLightMode == 1) {
    dark = vec3(0.62, 0.62, 0.62);
    mid  = vec3(0.78, 0.78, 0.77);
    tint = vec3(0.92, 0.91, 0.89);
    limiter = 0.93;
  } else {
    dark = vec3(0.01, 0.01, 0.01);
    mid  = vec3(0.08, 0.08, 0.07);
    tint = vec3(0.25, 0.24, 0.22);
    limiter = 0.12;
  }
  vec3 c = mix(dark, mid, smoothstep(-0.5, 1.0, y));
  float b1 = smoothstep(-0.5, 0.0, y);
  c += tint * (0.12 + 0.14 * smoothstep(0.0, 0.8, y)) * b1;
  float b2 = smoothstep(0.7, 0.78, y) * (1.0 - smoothstep(0.85, 0.92, y));
  c += tint * 0.15 * b2;
  c += dark * 0.4 * smoothstep(-0.8, -0.3, y) * (1.0 - smoothstep(-0.05, 0.15, y));
  c *= 0.90 + 0.10 * (sin(rd.x * 3.0 + rd.z * 1.5) * 0.5 + 0.5);
  c = min(c, vec3(limiter));
  return c;
}
void main() {
  vec3 N = getNorm(uv);
  float asp = res.x / res.y;
  vec3 V = normalize(vec3((uv - 0.5) * vec2(asp, 1.0) * 0.3, -1.0));
  vec3 R = reflect(V, N);
  float NdotV = max(dot(N, -V), 0.0);
  float fLo = uLightMode == 1 ? 0.75 : 0.65;
  float fHi = uLightMode == 1 ? 0.90 : 0.75;
  float fresnel = mix(fLo, fHi, 1.0 - NdotV);
  vec3 c = env(R) * fresnel;
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  if (uLightMode == 0) { c = min(c, vec3(0.20)); }
  fc = vec4(c, 1);
}`;

const SIM = 512;

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lightModeRef = useRef(false);
  const router = useRouter();
  const cleanupRef = useRef<(() => void) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    lightModeRef.current = !lightModeRef.current;
    const val = lightModeRef.current ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", val);
    document.documentElement.style.background = lightModeRef.current ? "#F8F6F3" : "#0a0a0a";
    try { localStorage.setItem("wavcash-theme", val); localStorage.setItem("theme", val); } catch {}
  }, []);

  // Read persisted theme on mount — sync lightModeRef + html attributes for client-side nav
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wavcash-theme") || localStorage.getItem("theme");
      const isLight = saved === "light";
      lightModeRef.current = isLight;
      document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
      document.documentElement.style.background = isLight ? "#F8F6F3" : "#0a0a0a";
      document.body.style.background = isLight ? "#F8F6F3" : "#0a0a0a";
    } catch {}
  }, []);

  // Close nav menu on click outside
  useEffect(() => {
    if (!navOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const navLinks = document.querySelector(".landing-root .nav-links");
      if (navLinks && !navLinks.contains(e.target as Node)) {
        setNavOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [navOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ---- GL context ----
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) return;
    gl.getExtension("EXT_color_buffer_float");


    // ---- Compile helpers ----
    function mkShader(src: string, type: number) {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) return null;
      return s;
    }
    function mkProg(vs: string, fs: string) {
      const v = mkShader(vs, gl!.VERTEX_SHADER);
      const f = mkShader(fs, gl!.FRAGMENT_SHADER);
      if (!v || !f) return null;
      const p = gl!.createProgram();
      if (!p) return null;
      gl!.attachShader(p, v);
      gl!.attachShader(p, f);
      gl!.linkProgram(p);
      if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) return null;
      return p;
    }

    // ---- Quad VAO ----
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // ---- Programs ----
    const pDrop = mkProg(VERT, FRAG_DROP);
    const pUpdate = mkProg(VERT, FRAG_UPDATE);
    const pRender = mkProg(VERT, FRAG_RENDER);
    if (!pDrop || !pUpdate || !pRender) return;

    function U(p: WebGLProgram, ...names: string[]) {
      const o: Record<string, WebGLUniformLocation | null> = {};
      for (const n of names) o[n] = gl!.getUniformLocation(p, n);
      return o;
    }
    const uDrop = U(pDrop, "src", "center", "radius", "strength");
    const uUpdate = U(pUpdate, "src", "texel");
    const uRender = U(pRender, "hmap", "texel", "res", "time", "uLightMode");

    // ---- Ping-pong textures + FBOs ----
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

    // ---- Sim functions ----
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

    // ---- Cursor tracking ----
    let mx = 0.5, my = 0.5, pmx = 0.5, pmy = 0.5;
    let smoothStr = 0;
    let lastMove = 0;
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

    // ---- Resize ----
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(canvas!.clientWidth * dpr);
      canvas!.height = Math.round(canvas!.clientHeight * dpr);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---- First frame (synchronous — mercury visible before paint) ----
    function renderFrame(time: number) {
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
    renderFrame(0);

    // Reveal page — first frame is already painted
    document.body.style.opacity = "1";

    // ---- Render loop ----
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

      renderFrame(time);
    }
    rafId = requestAnimationFrame(loop);

    // ---- Amber accent: ignite words ----
    function getHoverBase(type: string) {
      if (type === "h1") {
        return lightModeRef.current
          ? [[26, 26, 26], [51, 51, 51], [85, 85, 85]]
          : [[255, 255, 255], [221, 221, 221], [170, 170, 170]];
      }
      return lightModeRef.current
        ? [[90, 90, 90], [106, 106, 106], [122, 122, 122]]
        : [[154, 168, 180], [138, 152, 166], [122, 136, 152]];
    }
    function getFlareColor(opacity: number) {
      return lightModeRef.current
        ? `rgba(248,246,243,${opacity})`
        : `rgba(255,255,255,${opacity})`;
    }
    function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }
    function easeIO(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    interface FlareTarget { svgText: SVGTextElement; totalLength: number; startTime: number }
    const flareTargets: FlareTarget[] = [];

    function createFlare(el: Element) {
      // Remove any previously appended flare SVGs (React strict mode re-runs)
      el.querySelectorAll(".flare-svg").forEach(s => s.remove());

      // Read only the direct text node, NOT child SVG textContent
      let text = "";
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) { text += node.textContent; }
      }
      text = text.trim();
      if (!text) return null;

      const rect = el.getBoundingClientRect();
      const h1 = el.closest("h1");
      if (!h1) return null;
      const cs = getComputedStyle(h1);
      const spanCS = getComputedStyle(el);
      const fontSize = parseFloat(spanCS.fontSize);
      const fontFamily = cs.fontFamily;
      const fontWeight = cs.fontWeight;
      const letterSpacing = cs.letterSpacing;

      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("class", "flare-svg");
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);

      const defs = document.createElementNS(ns, "defs");
      const filter = document.createElementNS(ns, "filter");
      const filterId = "flare-glow-" + text.replace(/[^a-z]/gi, "");
      filter.setAttribute("id", filterId);
      filter.setAttribute("x", "-50%"); filter.setAttribute("y", "-50%");
      filter.setAttribute("width", "200%"); filter.setAttribute("height", "200%");
      const blur = document.createElementNS(ns, "feGaussianBlur");
      blur.setAttribute("stdDeviation", "3"); blur.setAttribute("result", "blur");
      const merge = document.createElementNS(ns, "feMerge");
      const m1 = document.createElementNS(ns, "feMergeNode"); m1.setAttribute("in", "blur");
      const m2 = document.createElementNS(ns, "feMergeNode"); m2.setAttribute("in", "SourceGraphic");
      merge.appendChild(m1); merge.appendChild(m2);
      filter.appendChild(blur); filter.appendChild(merge);
      defs.appendChild(filter); svg.appendChild(defs);

      const svgText = document.createElementNS(ns, "text") as SVGTextElement;
      svgText.setAttribute("x", "0");
      svgText.setAttribute("y", String(fontSize * 1.0));
      svgText.setAttribute("font-family", fontFamily);
      svgText.setAttribute("font-weight", fontWeight);
      svgText.setAttribute("font-size", fontSize + "px");
      if (letterSpacing && letterSpacing !== "normal") svgText.setAttribute("letter-spacing", letterSpacing);
      svgText.setAttribute("fill", "none");
      svgText.setAttribute("stroke", getFlareColor(0.9));
      svgText.setAttribute("stroke-width", "0.8");
      svgText.setAttribute("filter", `url(#${filterId})`);
      svgText.textContent = text;
      svg.appendChild(svgText);
      el.appendChild(svg);

      const estimatedLength = text.length * fontSize * 3;
      const dashLen = estimatedLength * 0.08;
      const gapLen = estimatedLength - dashLen;
      svgText.setAttribute("stroke-dasharray", `${dashLen} ${gapLen}`);
      svgText.setAttribute("stroke-dashoffset", String(estimatedLength));
      svgText.style.opacity = "0";

      return { svg, svgText, totalLength: estimatedLength, dashLen, gapLen };
    }

    let flareRafId: number;
    function flareLoop(now: number) {
      flareRafId = requestAnimationFrame(flareLoop);
      for (const f of flareTargets) {
        const elapsed = now - f.startTime;
        const cycle = 10000;
        const pos = elapsed % cycle;
        const traceTime = 2500;
        if (pos < traceTime) {
          const phase = pos / traceTime;
          const offset = f.totalLength - (phase * f.totalLength * 2);
          f.svgText.setAttribute("stroke-dashoffset", String(offset));
          const fade = phase < 0.1 ? phase / 0.1 : phase > 0.85 ? (1 - phase) / 0.15 : 1.0;
          f.svgText.setAttribute("stroke", getFlareColor(parseFloat((fade * 0.9).toFixed(2))));
        } else {
          f.svgText.setAttribute("stroke", getFlareColor(0));
        }
      }
    }
    flareRafId = requestAnimationFrame(flareLoop);

    function igniteWord(selector: string, delay: number, flareDelay: number) {
      setTimeout(() => {
        const el = document.querySelector(selector);
        if (!el) return;
        const from = getHoverBase("h1");
        const to = [[212, 136, 58], [212, 136, 58], [212, 136, 58]];
        const dur = 2000;
        const start = performance.now();
        (el as HTMLElement).style.animation = "none";
        (el as HTMLElement).style.backgroundSize = "100% 100%";
        const flare = createFlare(el);

        function startFlare() {
          if (!flare) return;
          flare.svgText.style.opacity = "1";
          flare.svgText.style.transition = "opacity 0.6s ease";
          flareTargets.push({ svgText: flare.svgText, totalLength: flare.totalLength, startTime: performance.now() });
        }
        function tick(now: number) {
          const t = Math.min((now - start) / dur, 1);
          const e = easeIO(t);
          const c0 = `rgb(${lerp(from[0][0], to[0][0], e)},${lerp(from[0][1], to[0][1], e)},${lerp(from[0][2], to[0][2], e)})`;
          const c1 = `rgb(${lerp(from[1][0], to[1][0], e)},${lerp(from[1][1], to[1][1], e)},${lerp(from[1][2], to[1][2], e)})`;
          const c2 = `rgb(${lerp(from[2][0], to[2][0], e)},${lerp(from[2][1], to[2][1], e)},${lerp(from[2][2], to[2][2], e)})`;
          (el as HTMLElement).style.background = `linear-gradient(135deg, ${c0} 0%, ${c1} 40%, ${c2} 100%)`;
          (el as HTMLElement).style.webkitBackgroundClip = "text";
          (el as HTMLElement).style.backgroundClip = "text";
          if (t < 1) requestAnimationFrame(tick);
          else {
            (el as HTMLElement).style.background = "#D4883A";
            (el as HTMLElement).style.webkitBackgroundClip = "text";
            (el as HTMLElement).style.backgroundClip = "text";
            (el as HTMLElement).style.webkitTextFillColor = "transparent";
            if (flareDelay > 0) setTimeout(startFlare, flareDelay);
            else startFlare();
          }
        }
        requestAnimationFrame(tick);
      }, delay);
    }
    igniteWord(".landing-root .word-royalties", 1000, 3500);
    igniteWord(".landing-root .word-visible", 4500, 300);

    // ---- Per-word gradient hover ----
    const amber = [212, 136, 58];
    const DUR = 750;
    function attachHover(selector: string, baseType: string) {
      document.querySelectorAll(selector).forEach((span) => {
        let raf: number | null = null, progress = 0, direction = 0, lastTime = 0;
        function paint(t: number) {
          const base = getHoverBase(baseType);
          const e = easeIO(t);
          const c0 = `rgb(${lerp(base[0][0], amber[0], e)},${lerp(base[0][1], amber[1], e)},${lerp(base[0][2], amber[2], e)})`;
          const c1 = `rgb(${lerp(base[1][0], amber[0], e)},${lerp(base[1][1], amber[1], e)},${lerp(base[1][2], amber[2], e)})`;
          const c2 = `rgb(${lerp(base[2][0], amber[0], e)},${lerp(base[2][1], amber[1], e)},${lerp(base[2][2], amber[2], e)})`;
          (span as HTMLElement).style.background = `linear-gradient(135deg, ${c0} 0%, ${c1} 40%, ${c2} 100%)`;
          (span as HTMLElement).style.backgroundSize = "100% 100%";
          (span as HTMLElement).style.webkitBackgroundClip = "text";
          (span as HTMLElement).style.backgroundClip = "text";
          (span as HTMLElement).style.webkitTextFillColor = "transparent";
        }
        function animate(now: number) {
          if (!lastTime) lastTime = now;
          const dt = now - lastTime; lastTime = now;
          progress += direction * (dt / DUR);
          progress = Math.max(0, Math.min(1, progress));
          paint(progress);
          if ((direction > 0 && progress < 1) || (direction < 0 && progress > 0)) {
            raf = requestAnimationFrame(animate);
          } else {
            raf = null; lastTime = 0;
            if (progress <= 0) {
              (span as HTMLElement).style.background = "";
              (span as HTMLElement).style.backgroundSize = "";
              (span as HTMLElement).style.webkitBackgroundClip = "";
              (span as HTMLElement).style.backgroundClip = "";
              (span as HTMLElement).style.webkitTextFillColor = "";
            }
          }
        }
        span.addEventListener("mouseenter", () => {
          direction = 1;
          (span as HTMLElement).style.animation = "none";
          if (!raf) { lastTime = 0; raf = requestAnimationFrame(animate); }
        });
        span.addEventListener("mouseleave", () => {
          direction = -1;
          if (!raf) { lastTime = 0; raf = requestAnimationFrame(animate); }
        });
      });
    }
    attachHover(".landing-root .hero h1 .hw:not(.word-royalties):not(.word-visible)", "h1");
    attachHover(".landing-root .hero p .hw", "p");

    // ---- Keyboard shortcuts ----
    const onKeyDown = (e: KeyboardEvent) => {
      const inInput = (e.target as Element).tagName === "INPUT" || (e.target as Element).tagName === "TEXTAREA";
      if (!inInput && (e.key === "l" || e.key === "L")) {
        toggleTheme();
      }
      if (e.key === "/") {
        e.preventDefault();
        (document.querySelector(".landing-root .search-input") as HTMLInputElement)?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(flareRafId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", resize);
      // Remove flare SVGs added to the DOM
      document.querySelectorAll(".landing-root .flare-svg").forEach(s => s.remove());
      // Reset inline styles on ignited words so re-run starts clean
      document.querySelectorAll(".landing-root .word-royalties, .landing-root .word-visible").forEach(el => {
        (el as HTMLElement).style.cssText = "";
      });
      flareTargets.length = 0;
      cleanupRef.current?.();
    };
  }, [toggleTheme]);

  const { ready, authenticated } = usePrivy();
  const isLoggedIn = ready && authenticated;

  const goSniffer = () => router.push("/sniffer");
  const goSnifferWithQuery = () => {
    if (searchQuery.trim()) {
      router.push(`/sniffer?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/sniffer");
    }
  };
  const goCta = () => router.push(isLoggedIn ? "/dashboard" : "/login");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div ref={rootRef} className="landing-root">
        {/* WebGL Canvas */}
        <canvas ref={canvasRef} id="c" />

        {/* UI Overlay */}
        <div className="ui-overlay">
          {/* Nav */}
          <nav className="nav">
            <a href="/" className="nav-logo">
              <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
                <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
              </svg>
              <span className="hw">WavCash</span>
            </a>
            <div className="nav-links">
              <div className={`nav-menu-items${navOpen ? " open" : ""}`}>
                <button className="nav-link" type="button" onClick={goSniffer}>Royalty Sniffer</button>
                <button className="nav-link" type="button">Splits</button>
                <button className="nav-link" type="button">Reclaim</button>
                <button className="nav-link" type="button">Pricing</button>
              </div>
              <button className={`nav-product-toggle${navOpen ? " open" : ""}`} type="button" onClick={() => setNavOpen(true)}>
                Explore
              </button>
              <div className="nav-hit">
                <button className="theme-toggle" type="button" aria-label="Toggle light mode" onClick={toggleTheme}>
                  <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                  <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                </button>
              </div>
              <div className="nav-hit">
                <button className="nav-cta" type="button" onClick={goCta}>{isLoggedIn ? "My Dashboard" : "Get Started"}</button>
              </div>
            </div>
          </nav>

          {/* Hero */}
          <div className="hero">
            <div className="hero-badge">
              <span className="dot" />
              <span className="hw">Now</span> <span className="hw">in</span> <span className="hw">Private</span> <span className="hw">Beta</span>
            </div>

            <h1>
              <span className="hw">Your</span>{" "}
              <span className="hw word-royalties">royalties,</span>
              <br />
              <span className="hw">finally</span>{" "}
              <span className="hw word-visible">visible.</span>
            </h1>

            <p>
              <span className="hw">Instant</span>{" "}
              <span className="hw">verification.</span>{" "}
              <span className="hw">Transparent</span>{" "}
              <span className="hw">payouts.</span>{" "}
              <span className="hw">Built</span>{" "}
              <span className="hw">for</span>{" "}
              <span className="hw">independent</span>{" "}
              <span className="hw">artists</span>{" "}
              <span className="hw">across</span>{" "}
              <span className="hw">Africa</span>{" "}
              <span className="hw">and</span>{" "}
              <span className="hw">Latin</span>{" "}
              <span className="hw">America.</span>
            </p>

            <div className="search-demo">
              <input
                className="search-input"
                type="text"
                placeholder="Search any ISRC, artist, or track..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") goSnifferWithQuery(); }}
              />
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>

            <div className="hero-actions">
              <button className="btn-primary" type="button" onClick={goCta}>{isLoggedIn ? "My Dashboard" : "Claim Your Royalties"}</button>
              <button className="btn-secondary" type="button" onClick={goSniffer}>See How It Works</button>
            </div>
          </div>

          {/* Footer */}
          <div className="site-footer">
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
    </>
  );
}

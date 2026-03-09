"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";

/* ================================================================
   Scoped CSS
   ================================================================ */

const SPLITS_CSS = `
/* ---- Theme variables (scoped) ---- */
.splits-root {
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
.splits-root[data-theme="light"] {
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
.splits-root canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; }

/* ---- TOP NAV ---- */
.splits-root .top-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: background 0.6s ease, border-color 0.6s ease;
}
.splits-root .nav-logo {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color 0.8s ease;
}
.splits-root .nav-logo:hover { color: var(--accent); }
.splits-root .nav-logo svg { color: inherit; transition: transform 0.8s ease, color 0.8s ease; }
.splits-root .nav-logo:hover svg { transform: scale(1.08); }
.splits-root .nav-links { display: flex; gap: 0; align-items: center; }
.splits-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; background: none; border: none;
  position: relative; padding: 4px 16px; transition: color 0.8s ease;
  font-family: inherit;
}
.splits-root .nav-link::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px;
  background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.splits-root .nav-link:hover { color: var(--accent); }
.splits-root .nav-link:hover::after { width: 0; }
.splits-root .nav-link.active { color: var(--accent); }
.splits-root .nav-link.active::after { width: 100%; background: var(--accent); }
.splits-root .nav-right { display: flex; align-items: center; gap: 0; }
.splits-root .nav-hit {
  display: flex; align-items: center; padding: 0 16px;
}
.splits-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-secondary); transition: all 0.5s ease;
}
.splits-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.splits-root .theme-toggle svg { width: 16px; height: 16px; transition: transform 0.5s ease; }
.splits-root .theme-toggle:hover svg { transform: rotate(15deg) scale(1.1); }
.splits-root .icon-sun { display: block; }
.splits-root .icon-moon { display: none; }
.splits-root[data-theme="light"] .icon-sun { display: none; }
.splits-root[data-theme="light"] .icon-moon { display: block; }
.splits-root .nav-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-btn-primary); background: var(--bg-btn-primary);
  border: none; border-radius: 8px; padding: 10px 22px;
  letter-spacing: 0.2px;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
}
.splits-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.splits-root .nav-cta:active { transform: scale(0.98); }

/* ---- MAIN CONTENT ---- */
.splits-root .main { padding: 0 40px; max-width: 1080px; margin: 0 auto; position: relative; z-index: 1; }

/* ---- HERO ---- */
.splits-root .hero {
  min-height: 100vh; display: flex; flex-direction: column;
  justify-content: center; align-items: center; text-align: center;
  padding-top: 64px; gap: 24px;
}
.splits-root .hero h1 {
  font-family: 'General Sans', var(--font-general-sans), sans-serif;
  font-size: clamp(42px, 5.5vw, 64px);
  font-weight: 700; line-height: 1.05;
  letter-spacing: -2px;
}
.splits-root .hero p {
  font-size: clamp(16px, 2vw, 20px);
  color: var(--text-secondary); line-height: 1.6;
}
.splits-root .hero-actions {
  display: flex; gap: 16px; align-items: center;
}

/* ---- BUTTONS ---- */
.splits-root .btn-primary {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; font-weight: 600; color: var(--text-btn-primary);
  background: var(--bg-btn-primary); border: none; border-radius: 10px;
  padding: 14px 32px;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
  box-shadow: 0 2px 8px rgba(255,255,255,0.1);
}
.splits-root[data-theme="light"] .btn-primary { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.splits-root .btn-primary:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.splits-root .btn-primary:active { transform: translateY(0); }
.splits-root .btn-ghost {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px; font-weight: 500; color: var(--text-secondary);
  background: none; border: none; padding: 14px 4px;
  transition: color 0.5s ease;
}
.splits-root .btn-ghost:hover { color: var(--accent); }

/* ---- SECTIONS ---- */
.splits-root .sp-section {
  padding: 100px 0; border-top: 1px solid rgba(212,136,58,0.15);
}
.splits-root .section-title {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(28px, 4vw, 40px); font-weight: 700;
  letter-spacing: -1.5px; line-height: 1.15; margin-bottom: 32px;
}
.splits-root .body-text {
  font-size: 15px; line-height: 1.75; color: var(--text-secondary);
  margin-bottom: 20px; max-width: 680px;
}
.splits-root .body-text:last-child { margin-bottom: 0; }
.splits-root .inline-link {
  color: var(--accent); text-decoration: none; font-weight: 500;
  transition: opacity 0.3s ease;
}
.splits-root .inline-link:hover { opacity: 0.8; }

/* ---- GLASS CARD ---- */
.splits-root .glass-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  padding: 28px;
  transition: border-color 0.5s ease, box-shadow 0.5s ease;
}
.splits-root[data-theme="light"] .glass-card {
  background: rgba(255,255,255,0.35);
  border-color: rgba(0,0,0,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}
.splits-root .glass-card:hover {
  border-color: rgba(212,136,58,0.25);
  box-shadow: 0 2px 12px rgba(212,136,58,0.06);
}

/* ---- HERO PRODUCT MOCK ---- */
.splits-root .mock-card {
  width: 100%; max-width: 400px;
  padding: 24px;
}
.splits-root .mock-title-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.splits-root .mock-title {
  font-family: 'General Sans', sans-serif;
  font-size: 14px; font-weight: 600;
}
.splits-root .mock-badge {
  display: inline-block;
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 1px;
  padding: 2px 8px; border-radius: 4px;
  background: rgba(16,185,129,0.15);
  color: #059669; flex-shrink: 0;
}
.splits-root[data-theme="dark"] .mock-badge { color: #34d399; }
.splits-root .mock-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0;
  border-top: 1px solid var(--border-subtle);
  font-size: 13px;
}
.splits-root .mock-check {
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(16,185,129,0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.splits-root .mock-name { font-weight: 500; text-align: left; }
.splits-root .mock-detail { color: var(--text-tertiary); font-size: 12px; text-align: left; }
.splits-root .mock-pct {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px; font-weight: 600; color: var(--accent);
}

/* ---- FROZEN CARD (Section 2) ---- */
.splits-root .frozen-card {
  max-width: 360px;
  background: rgba(100,160,220,0.04);
  border-color: rgba(100,160,220,0.15);
}
.splits-root[data-theme="light"] .frozen-card {
  background: rgba(100,160,220,0.06);
  border-color: rgba(100,160,220,0.15);
}
.splits-root .frozen-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(28px, 4vw, 36px); font-weight: 700;
  margin: 8px 0 4px;
}
.splits-root .frozen-label {
  font-size: 13px; color: var(--text-tertiary); line-height: 1.5;
}

/* ---- TIMELINE (Section 3 — docs roadmap style) ---- */
.splits-root .timeline { position: relative; padding-left: 24px; margin: 32px 0; }
.splits-root .timeline::before {
  content: ''; position: absolute; left: 4px; top: 8px; bottom: 8px;
  width: 1px; background: var(--border-subtle);
}
.splits-root .timeline-item { position: relative; padding: 16px 0; transition: transform 0.5s ease; }
.splits-root .timeline-item:hover { transform: translateX(4px); }
.splits-root .timeline-item:hover .timeline-phase { opacity: 1; }
.splits-root .timeline-item:hover .timeline-focus { color: var(--accent); }
.splits-root .timeline-item::before {
  content: ''; position: absolute; left: -23px; top: 24px;
  width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
}
.splits-root .timeline-phase {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--accent); margin-bottom: 4px;
}
.splits-root .timeline-focus {
  font-family: 'General Sans', sans-serif;
  font-size: 17px; font-weight: 600; margin-bottom: 6px; transition: color 0.5s ease;
}
.splits-root .timeline-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.65; max-width: 520px; }

/* ---- USE CASES (Section 4) ---- */
.splits-root .use-cases-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  margin-bottom: 32px;
}
.splits-root .use-case-title {
  font-family: 'General Sans', sans-serif;
  font-size: 16px; font-weight: 600; margin-bottom: 16px;
}
.splits-root .use-case-list { list-style: none; padding: 0; margin: 0; }
.splits-root .use-case-list li {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 14px; color: var(--text-secondary);
  margin-bottom: 10px; line-height: 1.5;
}
.splits-root .check-icon {
  width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;
  color: var(--accent);
}

/* ---- TRUST VISUAL (Section 5) ---- */
.splits-root .trust-card { max-width: 480px; padding: 0; overflow: hidden; }
.splits-root .trust-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}
.splits-root .trust-verified {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600;
  color: #059669;
}
.splits-root[data-theme="dark"] .trust-verified { color: #34d399; }
.splits-root .trust-addr {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--text-tertiary);
}
.splits-root .trust-contributors { padding: 16px 20px; }
.splits-root .trust-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; font-size: 13px;
}
.splits-root .trust-check {
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(16,185,129,0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.splits-root .trust-signed {
  font-size: 11px; font-weight: 600; color: #059669;
  margin-left: auto;
}
.splits-root[data-theme="dark"] .trust-signed { color: #34d399; }

/* Activity timeline inside trust card */
.splits-root .trust-activity {
  padding: 12px 20px 16px; border-top: 1px solid var(--border-subtle);
}
.splits-root .trust-event {
  display: flex; gap: 10px;
}
.splits-root .trust-event-dot-col {
  display: flex; flex-direction: column; align-items: center;
}
.splits-root .trust-event-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--border-subtle); margin-top: 5px; flex-shrink: 0;
}
.splits-root .trust-event-line {
  width: 1px; flex: 1; background: var(--border-subtle);
}
.splits-root .trust-event-content {
  display: flex; align-items: center; justify-content: space-between;
  flex: 1; padding-bottom: 10px; gap: 12px;
}
.splits-root .trust-event-badge {
  font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.splits-root .badge-activated {
  background: rgba(16,185,129,0.15);
  color: #059669; border: 1px solid rgba(16,185,129,0.30);
}
.splits-root[data-theme="dark"] .badge-activated { color: #34d399; border-color: rgba(52,211,153,0.30); }
.splits-root .badge-payment {
  background: rgba(16,185,129,0.15);
  color: #059669; border: 1px solid rgba(16,185,129,0.30);
}
.splits-root[data-theme="dark"] .badge-payment { color: #34d399; border-color: rgba(52,211,153,0.30); }
.splits-root .trust-event-label { font-size: 13px; margin-left: 8px; }
.splits-root .trust-event-date {
  font-size: 12px; color: var(--text-primary); flex-shrink: 0;
}

/* ---- PRICING (Section 6) ---- */
.splits-root .pricing-big {
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(60px, 8vw, 80px); font-weight: 700;
  color: var(--accent); line-height: 1;
}
.splits-root .pricing-sub {
  font-size: 18px; color: var(--text-secondary); margin-bottom: 20px;
}

/* ---- FINAL CTA (Section 7) ---- */
.splits-root .final-cta {
  text-align: center; padding: 100px 20px;
}
.splits-root .final-cta-card {
  background: rgba(232,236,240,0.08);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  padding: 80px 40px;
  max-width: 800px; margin: 0 auto;
}
.splits-root[data-theme="light"] .final-cta-card {
  background: rgba(255,255,255,0.4);
  border-color: rgba(0,0,0,0.08);
}
.splits-root .final-cta-card h2 {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(28px, 4vw, 40px); font-weight: 700;
  letter-spacing: -1.5px; line-height: 1.15; margin-bottom: 12px;
}
.splits-root .final-cta-card p {
  font-size: 16px; color: var(--text-secondary); max-width: 480px;
  margin: 0 auto 32px; line-height: 1.6;
}

/* ---- FOOTER ---- */
.splits-root .sp-footer { padding: 100px 0 60px; }
.splits-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.splits-root .footer-grid > div {
  display: flex; flex-direction: column; align-items: center;
}
.splits-root .footer-col-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.splits-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease;
}
.splits-root .footer-link:hover { color: var(--accent); }
.splits-root .social-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.splits-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.splits-root .social-icon:hover { color: var(--accent); }

/* ---- RESPONSIVE ---- */
@media (max-width: 768px) {
  .splits-root .top-nav { padding: 12px 20px; }
  .splits-root .nav-links { display: none; }
  .splits-root .nav-hit:has(.nav-cta) { display: none; }
  .splits-root .main { padding: 0 20px; }
  .splits-root .sp-section { padding: 60px 0; }
  .splits-root .use-cases-grid { grid-template-columns: 1fr; }
  .splits-root .hero h1 { letter-spacing: -1.5px; }
  .splits-root .section-title { margin-bottom: 24px; }
  .splits-root .hero-actions { flex-direction: column; width: 100%; }
  .splits-root .hero-actions .btn-primary { width: 100%; text-align: center; }
  .splits-root .section-with-visual { flex-direction: column !important; }
  .splits-root .section-with-visual > div { max-width: 100% !important; }
  .splits-root .footer-grid { flex-direction: column; align-items: center; gap: 32px; }
}
`;

/* ================================================================
   Shaders (identical to docs / login)
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
   Check Icon SVG
   ================================================================ */

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ================================================================
   Component
   ================================================================ */

export default function SplitsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { ready, authenticated } = usePrivy();
  const isLoggedIn = ready && authenticated;

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightModeRef = useRef(false);

  // ---- Theme sync ----
  useEffect(() => {
    if (!resolvedTheme) return;

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

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setNextTheme(next);
    try { localStorage.setItem("wavcash-theme", next); } catch {}
  }, [resolvedTheme, setNextTheme]);

  const goCta = useCallback(() => {
    router.push(isLoggedIn ? "/dashboard/splits" : "/login");
  }, [isLoggedIn, router]);

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
      gl!.uniform1i(uDrop.src, 0);
      gl!.uniform2f(uDrop.center, cx, cy);
      gl!.uniform1f(uDrop.radius, rad);
      gl!.uniform1f(uDrop.strength, str);
      gl!.bindVertexArray(vao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      swap();
    }
    function runUpdate() {
      gl!.viewport(0, 0, SIM, SIM); gl!.useProgram(pUpdate);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo[cW]);
      gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, tex[cR]);
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
    let revealed = false;

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

      if (!revealed) {
        revealed = true;
        document.body.style.opacity = "1";
      }
    }
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SPLITS_CSS }} />
      <div ref={rootRef} className="splits-root">
        {/* WebGL Canvas */}
        <canvas ref={canvasRef} />

        {/* Top Nav */}
        <nav className="top-nav">
          <Link href="/" className="nav-logo">
            <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
              <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
              <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
            </svg>
            WavCash
          </Link>
          <div className="nav-links">
            <Link href="/sniffer" className="nav-link">Royalty Sniffer</Link>
            <Link href="/splits" className="nav-link active">Splits</Link>
            <Link href="/reclaim" className="nav-link">Reclaim</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
          </div>
          <div className="nav-right">
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

        {/* Main content */}
        <div className="main">

          {/* ======== Section 1: Hero ======== */}
          <section className="hero">
            <h1>Split the money<br />Skip the drama</h1>

            <p>Lock in your royalty agreement and get automatic payouts<br />Every contributor, every percentage, on the record</p>

            <div className="hero-actions">
              <button className="btn-primary" type="button" onClick={goCta}>Create a Split</button>
              <button className="btn-ghost" type="button" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                See how it works &darr;
              </button>
            </div>

            {/* Product mock card */}
            <div className="glass-card mock-card">
              <div className="mock-title-row">
                <div className="mock-title">Midnight Sessions: Split Agreement</div>
                <div className="mock-badge">Active</div>
              </div>
              <div className="mock-row">
                <div className="mock-check">
                  <CheckIcon className="check-icon" style={{ width: 14, height: 14, color: "#059669" }} />
                </div>
                <div>
                  <div className="mock-name">João Rodrigues</div>
                  <div className="mock-detail">Songwriter</div>
                </div>
                <div className="mock-pct">60%</div>
              </div>
              <div className="mock-row">
                <div className="mock-check">
                  <CheckIcon className="check-icon" style={{ width: 14, height: 14, color: "#059669" }} />
                </div>
                <div>
                  <div className="mock-name">Emeka Okonkwo</div>
                  <div className="mock-detail">Producer</div>
                </div>
                <div className="mock-pct">20%</div>
              </div>
              <div className="mock-row">
                <div className="mock-check">
                  <CheckIcon className="check-icon" style={{ width: 14, height: 14, color: "#059669" }} />
                </div>
                <div>
                  <div className="mock-name">Afolabi Benson</div>
                  <div className="mock-detail">Producer</div>
                </div>
                <div className="mock-pct">20%</div>
              </div>
            </div>
          </section>

          {/* ======== Section 2: Stakes ======== */}
          <section className="sp-section">
            <h2 className="section-title">Settle it before the first stream</h2>

            <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }} className="section-with-visual">
              <div style={{ flex: 1, minWidth: 280 }}>
                <p className="body-text">Every song has multiple creators. Producers, co-writers, featured artists, engineers. Splits are often governed by verbal agreements, DMs, and informal trust.</p>
                <p className="body-text">When money arrives, disputes follow, friendships break, projects stall, and payouts on catalogs get frozen while people argue over who owns what.</p>
                <p className="body-text">Agreement should be put in writing before anyone gets paid. WavCash makes that effortless.</p>
                <a href="#how-it-works" className="inline-link" onClick={(e) => { e.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }}>
                  Get Started &rarr;
                </a>
              </div>

              {/* Frozen royalties card */}
              <div className="glass-card frozen-card" style={{ flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-tertiary)" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-tertiary)" }}>On Hold</span>
                </div>
                <div className="frozen-amount">$4,280.00</div>
                <div className="frozen-label">Royalties on hold</div>
              </div>
            </div>
          </section>

          {/* ======== Section 3: How It Works ======== */}
          <section className="sp-section" id="how-it-works">
            <h2 className="section-title">Binding agreements in minutes</h2>

            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-phase">Step 1</div>
                <div className="timeline-focus">Fill in the details</div>
                <div className="timeline-desc">Add contributors, set percentages, choose your terms. Our wizard handles the legal language.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-phase">Step 2</div>
                <div className="timeline-focus">Invite &amp; sign</div>
                <div className="timeline-desc">Each contributor gets a signing link. Signatures are timestamped and locked permanently and transparently.</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-phase">Step 3</div>
                <div className="timeline-focus">Get paid automatically</div>
                <div className="timeline-desc">When royalties come in, payouts split automatically to each contributor&apos;s account.</div>
              </div>
            </div>

            <button className="btn-primary" type="button" style={{ marginTop: 16 }} onClick={goCta}>Create a Split</button>
          </section>

          {/* ======== Section 4: Use Cases ======== */}
          <section className="sp-section">
            <h2 className="section-title">Built for everyone in the room</h2>

            <div className="use-cases-grid">
              <div className="glass-card">
                <div className="use-case-title">If you&apos;re a rights holder</div>
                <ul className="use-case-list">
                  <li><CheckIcon className="check-icon" />Lock in your split before release day</li>
                  <li><CheckIcon className="check-icon" />Get a legally binding, timestamped record</li>
                  <li><CheckIcon className="check-icon" />Automatic payouts when royalties arrive</li>
                  <li><CheckIcon className="check-icon" />Invite contributors by email or WavCash ID</li>
                  <li><CheckIcon className="check-icon" />Track signature status in real time</li>
                </ul>
              </div>
              <div className="glass-card">
                <div className="use-case-title">If you&apos;re running a label or roster</div>
                <ul className="use-case-list">
                  <li><CheckIcon className="check-icon" />Manage splits across your entire catalog</li>
                  <li><CheckIcon className="check-icon" />Onboard artists with pre-filled agreements</li>
                  <li><CheckIcon className="check-icon" />Enterprise dashboard for multi-seat teams</li>
                  <li><CheckIcon className="check-icon" />Bulk payout management (coming soon)</li>
                  <li><CheckIcon className="check-icon" />White-label royalty statements</li>
                </ul>
              </div>
            </div>

            <p className="body-text" style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
              Whether you&apos;re splitting one track or a hundred, we&apos;ve got you.
            </p>
            <button type="button" className="inline-link" style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer" }} onClick={goCta}>
              Get Started &rarr;
            </button>
          </section>

          {/* ======== Section 5: Trust ======== */}
          <section className="sp-section">
            <h2 className="section-title">Agreements that hold up when it matters</h2>

            <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }} className="section-with-visual">
              <div style={{ flex: 1, minWidth: 280 }}>
                <p className="body-text">Every WavCash Split is a permanent legal record. Once all contributors sign, the agreement is deployed to the blockchain. It cannot be altered, deleted, or disputed after the fact.</p>
                <p className="body-text">Signatures are timestamped. The contract address is publicly verifiable. If anyone ever questions who owns what, the record is there: permanent, transparent, and tamper-proof.</p>
                <button className="btn-primary" type="button" style={{ marginTop: 16 }} onClick={goCta}>Create Your First Split</button>
              </div>

              {/* Trust visual card */}
              <div className="glass-card trust-card" style={{ flexShrink: 0 }}>
                {/* Verified Record header */}
                <div className="trust-header">
                  <div className="trust-verified">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Verified Record
                  </div>
                  <span className="trust-addr">0x1a2b...9f4e</span>
                </div>

                {/* Contributors */}
                <div className="trust-contributors">
                  <div className="trust-row">
                    <div className="trust-check">
                      <CheckIcon className="check-icon" style={{ width: 14, height: 14, color: "#059669" }} />
                    </div>
                    <div>
                      <div className="mock-name">João Rodrigues</div>
                      <div className="mock-detail">Songwriter</div>
                    </div>
                    <span className="trust-signed">Signed</span>
                  </div>
                  <div className="trust-row">
                    <div className="trust-check">
                      <CheckIcon className="check-icon" style={{ width: 14, height: 14, color: "#059669" }} />
                    </div>
                    <div>
                      <div className="mock-name">Emeka Okonkwo</div>
                      <div className="mock-detail">Producer</div>
                    </div>
                    <span className="trust-signed">Signed</span>
                  </div>
                  <div className="trust-row">
                    <div className="trust-check">
                      <CheckIcon className="check-icon" style={{ width: 14, height: 14, color: "#059669" }} />
                    </div>
                    <div>
                      <div className="mock-name">Afolabi Benson</div>
                      <div className="mock-detail">Producer</div>
                    </div>
                    <span className="trust-signed">Signed</span>
                  </div>
                </div>

                {/* Activity timeline */}
                <div className="trust-activity">
                  {/* Event: Activated */}
                  <div className="trust-event">
                    <div className="trust-event-dot-col">
                      <div className="trust-event-dot" />
                      <div className="trust-event-line" />
                    </div>
                    <div className="trust-event-content">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="trust-event-badge badge-activated">Activated</span>
                        <span className="trust-event-label">Agreement activated</span>
                      </div>
                      <span className="trust-event-date">Mar 8</span>
                    </div>
                  </div>
                  {/* Event: Payment */}
                  <div className="trust-event">
                    <div className="trust-event-dot-col">
                      <div className="trust-event-dot" />
                    </div>
                    <div className="trust-event-content" style={{ paddingBottom: 0 }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="trust-event-badge badge-payment">Payment</span>
                        <span className="trust-event-label">12,000 USDC distributed</span>
                      </div>
                      <span className="trust-event-date">Mar 8</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ======== Section 6: Pricing ======== */}
          <section className="sp-section" style={{ textAlign: "center" }}>
            <h2 className="section-title">Transparent pricing, always</h2>
            <div className="pricing-big">2.5%</div>
            <div className="pricing-sub">when royalties are distributed</div>
            <p className="body-text" style={{ margin: "0 auto 32px", textAlign: "center" }}>
              No hidden charges. No minimum balances.
            </p>
            <button className="btn-primary" type="button" onClick={goCta}>Get Started</button>
          </section>

          {/* ======== Section 7: Final CTA ======== */}
          <section className="final-cta">
            <div className="final-cta-card">
              <h2>Your next session could be a hit</h2>
              <p>Make sure you&apos;ll have the paperwork ready when it happens.</p>
              <button className="btn-primary" type="button" onClick={goCta}>Get Started</button>
            </div>
          </section>

          {/* ======== Footer ======== */}
          <div className="sp-footer">
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
                  <a href="mailto:hello@wav.cash" className="social-icon" aria-label="Email">
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

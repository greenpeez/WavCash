"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

/* ================================================================
   Scoped CSS
   ================================================================ */

const PRICING_CSS = `
/* ---- RESET & VARS ---- */
.pricing-root {
  --accent: #D4883A;
  --accent-dim: rgba(212,136,58,0.12);
  --accent-border: rgba(212,136,58,0.28);
  --text-primary: #E8ECF0;
  --text-secondary: #9AA8B4;
  --text-tertiary: #788898;
  --bg-surface: rgba(232,236,240,0.06);
  --border-subtle: rgba(232,236,240,0.12);
  --bg-btn-primary: #fff;
  --text-btn-primary: #000;
  --green: #4CAF84;
  --green-dim: rgba(76,175,132,0.10);
  --nav-underline: rgba(232,236,240,0.25);
}
.pricing-root[data-theme="light"] {
  --text-primary: #1A1A1A;
  --text-secondary: #5A6670;
  --text-tertiary: #8895A0;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
  --bg-btn-primary: #000;
  --text-btn-primary: #fff;
  --accent-dim: rgba(212,136,58,0.08);
  --accent-border: rgba(212,136,58,0.22);
  --green: #1D7A4A;
  --nav-underline: rgba(0,0,0,0.18);
}

.pricing-root {
  position: relative; min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-primary); overflow-x: hidden;
}
.pricing-root *, .pricing-root *::before, .pricing-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}
.pricing-root canvas {
  position: fixed; inset: 0; width: 100%; height: 100%;
  z-index: 0; pointer-events: none;
}

/* ---- NAV (matches sniffer) ---- */
.pricing-root .top-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: background 0.6s ease, border-color 0.6s ease;
}
.pricing-root .nav-logo {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color 0.8s ease;
}
.pricing-root .nav-logo:hover { color: var(--accent); }
.pricing-root .nav-logo svg { color: inherit; transition: transform 0.8s ease, color 0.8s ease; }
.pricing-root .nav-logo:hover svg { transform: scale(1.08); }
.pricing-root .nav-links { display: flex; gap: 0; align-items: center; }
.pricing-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; background: none; border: none;
  position: relative; padding: 4px 16px; transition: color 0.8s ease;
  font-family: inherit;
}
.pricing-root .nav-link::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px;
  background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.pricing-root .nav-link:hover { color: var(--accent); }
.pricing-root .nav-link:hover::after { width: 0; }
.pricing-root .nav-link.active { color: var(--accent); }
.pricing-root .nav-link.active::after { width: 100%; background: var(--accent); }
.pricing-root .nav-right { display: flex; align-items: center; gap: 0; }
.pricing-root .nav-hit { display: flex; align-items: center; padding: 0 16px; }
.pricing-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.5s ease;
}
.pricing-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.pricing-root .theme-toggle svg { width: 16px; height: 16px; transition: transform 0.5s ease; }
.pricing-root .theme-toggle:hover svg { transform: rotate(15deg) scale(1.1); }
.pricing-root .icon-sun { display: block; }
.pricing-root .icon-moon { display: none; }
.pricing-root[data-theme="light"] .icon-sun { display: none; }
.pricing-root[data-theme="light"] .icon-moon { display: block; }
.pricing-root .nav-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-btn-primary); background: var(--bg-btn-primary);
  border: none; border-radius: 8px; padding: 10px 22px;
  letter-spacing: 0.2px; cursor: pointer;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
}
.pricing-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.pricing-root .nav-cta:active { transform: scale(0.98); }

/* ---- MAIN ---- */
.pricing-root .main {
  position: relative; z-index: 1;
  max-width: 1100px; margin: 0 auto;
  padding: 0 40px;
}

/* ---- HERO ---- */
.pricing-root .hero {
  padding: 140px 0 40px; text-align: center;
}
.pricing-root .hero h1 {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(32px, 5vw, 52px); font-weight: 700;
  letter-spacing: -2px; line-height: 1.1; margin-bottom: 16px;
}
.pricing-root .hero p {
  font-size: 16px; color: var(--text-secondary);
  line-height: 1.6; max-width: 420px; margin: 0 auto;
}

/* ---- BILLING TOGGLE ---- */
.pricing-root .billing-toggle {
  display: inline-flex; align-items: center;
  background: var(--bg-surface);
  -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: 10px; padding: 4px; margin-top: 32px; gap: 2px;
}
.pricing-root .billing-btn {
  font-family: inherit;
  font-size: 13px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
  padding: 8px 20px; border-radius: 8px;
  border: 1px solid transparent; background: transparent;
  color: var(--text-secondary);
  cursor: pointer; -webkit-user-select: none; user-select: none;
  position: relative; z-index: 2;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  display: flex; align-items: center; gap: 8px;
}
.pricing-root .billing-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  color: var(--accent);
}
.pricing-root .billing-btn .save-badge {
  font-size: 13px; color: var(--green); letter-spacing: 1.5px;
}

/* ---- TIER CARDS ---- */
.pricing-root .tiers {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 16px; margin-top: 48px;
}
.pricing-root .tier-card {
  background: var(--bg-surface);
  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: 16px; padding: 28px 24px;
  transition: all 0.5s ease; position: relative;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.pricing-root .tier-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212,136,58,0.25);
  box-shadow: 0 4px 20px rgba(212,136,58,0.08);
}
.pricing-root .tier-card.highlighted {
  background: var(--accent-dim);
  border: 2px solid var(--accent-border);
  border-top: 3px solid var(--accent);
}
.pricing-root .tier-seats {
  font-family: inherit;
  font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--text-tertiary); margin-bottom: 8px;
}
.pricing-root .tier-card.highlighted .tier-seats { color: var(--accent); }
.pricing-root .tier-name {
  font-family: 'General Sans', sans-serif;
  font-size: 22px; font-weight: 700; letter-spacing: -0.5px;
  margin-bottom: 6px;
}
.pricing-root .tier-price {
  font-family: inherit;
  font-size: 34px; font-weight: 600; letter-spacing: -1px;
  margin-bottom: 4px;
}
.pricing-root .tier-card.highlighted .tier-price { color: var(--accent); }
.pricing-root .tier-price span {
  font-size: 14px; font-weight: 400; color: var(--text-tertiary);
  letter-spacing: 0;
}
.pricing-root .tier-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  width: auto; padding: 12px 32px; border-radius: 8px; margin-top: auto;
  border: none;
  background: var(--bg-btn-primary); color: var(--text-btn-primary);
  cursor: pointer; transition: all 0.5s ease;
}
.pricing-root .tier-cta:hover {
  background: var(--accent); color: #000;
  border-color: var(--accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(212,136,58,0.2);
}
.pricing-root .tier-card.highlighted .tier-cta {
  background: var(--accent); color: #000;
  border-color: var(--accent); font-weight: 700;
}
.pricing-root .tier-card.highlighted .tier-cta:hover {
  box-shadow: 0 4px 20px rgba(212,136,58,0.3);
  transform: translateY(-1px);
}
.pricing-root .tier-billing-note {
  font-family: inherit;
  font-size: 11px; color: var(--text-tertiary);
  text-align: center; margin-top: 8px; letter-spacing: 0.5px;
}

/* ---- SEAT TOGGLE (Enterprise card) ---- */
.pricing-root .seat-toggle {
  display: inline-flex; align-items: center; width: fit-content;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 3px; margin-bottom: 12px; gap: 2px;
}
.pricing-root .seat-btn {
  font-family: inherit;
  font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  padding: 5px 12px; border-radius: 6px;
  border: 1px solid transparent; background: transparent;
  color: var(--text-tertiary);
  cursor: pointer; -webkit-user-select: none; user-select: none;
  position: relative; z-index: 2;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}
.pricing-root .seat-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent-border);
  color: var(--accent);
}

/* ---- FEATURE COMPARISON ---- */
.pricing-root .features-section {
  margin-top: 80px; padding-bottom: 40px;
}
.pricing-root .features-title {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(24px, 3.5vw, 36px); font-weight: 700;
  letter-spacing: -1.5px; text-align: center; margin-bottom: 48px;
}
.pricing-root .feature-group-title {
  font-family: inherit;
  font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase;
  color: var(--accent); display: flex; align-items: center; gap: 12px;
  padding: 28px 16px 14px;
}
.pricing-root .feature-group-title span { white-space: nowrap; }
.pricing-root .feature-group-line {
  flex: 1; height: 1px; background: var(--border-subtle);
}
.pricing-root .feature-row {
  display: grid; grid-template-columns: 2fr repeat(3, 1fr);
  align-items: center; padding: 16px 16px;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 6px;
  transition: background 0.15s ease;
}
.pricing-root .feature-row:hover {
  background: rgba(232,236,240,0.025);
}
.pricing-root[data-theme="light"] .feature-row:hover {
  background: rgba(0,0,0,0.02);
}
.pricing-root .feature-label {
  font-size: 16px; font-weight: 500; line-height: 1.4;
  margin-bottom: 3px;
}
.pricing-root .feature-desc {
  font-size: 14px; color: var(--text-secondary);
  line-height: 1.5; max-width: 360px;
}
.pricing-root .feature-cell {
  display: flex; justify-content: center; align-items: center;
}
.pricing-root .feature-check {
  width: 22px; height: 22px; color: var(--green);
}
.pricing-root .feature-dash {
  width: 16px; height: 2px; background: var(--text-tertiary);
  border-radius: 1px; opacity: 0.4;
}

/* Tier column headers for feature table */
.pricing-root .feature-header {
  display: grid; grid-template-columns: 2fr repeat(3, 1fr);
  align-items: end; padding: 0 16px 16px;
  border-bottom: 1px solid var(--border-subtle);
}
.pricing-root .feature-header-label {
  font-family: inherit;
  font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
  color: var(--text-secondary);
}
.pricing-root .feature-header-tier {
  text-align: center;
  font-family: inherit;
  font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--text-secondary); font-weight: 600;
}
.pricing-root .feature-header-tier.highlighted { color: var(--accent); }

/* ---- FINAL CTA ---- */
.pricing-root .final-cta { padding: 60px 0 40px; text-align: center; }
.pricing-root .final-cta-card {
  background: var(--bg-surface);
  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: 20px; padding: 80px 40px;
  max-width: 800px; margin: 0 auto;
}
.pricing-root[data-theme="light"] .final-cta-card {
  background: rgba(255,255,255,0.4);
  border-color: rgba(0,0,0,0.08);
}
.pricing-root .final-cta-card h2 {
  font-family: 'General Sans', sans-serif;
  font-size: clamp(28px, 4vw, 40px); font-weight: 700;
  letter-spacing: -1.5px; line-height: 1.15; margin-bottom: 32px;
}

/* ---- BUTTONS ---- */
.pricing-root .btn-primary {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600; padding: 12px 32px; border-radius: 10px;
  background: var(--bg-btn-primary); color: var(--text-btn-primary);
  border: none; cursor: pointer;
  transition: all 0.5s ease;
}
.pricing-root .btn-primary:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25);
}

/* ---- FOOTER ---- */
.pricing-root .sp-footer { padding: 100px 0 60px; }
.pricing-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.pricing-root .footer-grid > div {
  display: flex; flex-direction: column; align-items: center;
}
.pricing-root .footer-col-title {
  font-family: inherit;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.pricing-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease;
}
.pricing-root .footer-link:hover { color: var(--accent); }
.pricing-root .social-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.pricing-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.pricing-root .social-icon:hover { color: var(--accent); }

/* ---- RESPONSIVE ---- */
@media (max-width: 900px) {
  .pricing-root .tiers { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; }
}
@media (max-width: 768px) {
  .pricing-root .top-nav { padding: 12px 20px; }
  .pricing-root .nav-links { display: none; }
  .pricing-root .nav-hit:has(.nav-cta) { display: none; }
  .pricing-root .main { padding: 0 20px; }
  .pricing-root .hero { padding: 100px 0 32px; }
  .pricing-root .hero h1 { letter-spacing: -1.5px; }
  .pricing-root .features-section { overflow-x: auto; }
  .pricing-root .feature-header,
  .pricing-root .feature-row { min-width: 560px; }
  .pricing-root .footer-grid { flex-direction: column; align-items: center; gap: 32px; }
}
`;

/* ================================================================
   Shaders (identical to splits / docs / login)
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
   Data
   ================================================================ */

const TIERS = [
  {
    id: "basic",
    name: "Basic",
    price: { annual: "$6.99", monthly: "$9.99" },
    highlight: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: { annual: "$11.99", monthly: "$14.99" },
    highlight: true,
  },
];

const ENTERPRISE = {
  id: "enterprise",
  name: "Enterprise",
  options: [
    { seats: "3 seats", price: { annual: "$45", monthly: "$55" } },
    { seats: "5 seats", price: { annual: "$75", monthly: "$85" } },
  ],
};

/* Feature values: [basic, premium, enterprise] */
const SECTIONS = [
  {
    title: "Royalty Intelligence",
    rows: [
      { label: "Royalty Sniffer", desc: "Check estimated earnings for your catalog", values: [true, true, true] },
      { label: "Royalty dashboard", desc: "All your earnings in one place", values: [true, true, true] },
      { label: "Statement upload", desc: "Upload distributor statements to sync your earnings", values: [true, true, true] },
      { label: "Earnings history", desc: "Full track-level history of every payout received", values: [true, true, true] },
      { label: "Verified estimates", desc: "See what you should be earning based on real-time data", values: [false, true, true] },
      { label: "Discrepancy alerts", desc: "Get notified when actual payouts don't match expected amounts", values: [false, true, true] },
    ],
  },
  {
    title: "CMO Registration",
    rows: [
      { label: "Registration guides", desc: "Step-by-step guides for collection societies", values: [true, true, true] },
      { label: "Pre-filled forms", desc: "Submission packages built from your catalog", values: [false, true, true] },
      { label: "Multi-territory registration", desc: "Prepare packages for multiple territories at once", values: [false, false, true] },
    ],
  },
  {
    title: "Splits",
    rows: [
      { label: "Split agreements", desc: "Create binding co-ownership agreements per track", values: [true, true, true] },
      { label: "Contributor invites", desc: "Add contributors by email", values: [true, true, true] },
      { label: "Digital signing", desc: "All contributors sign before the agreement activates", values: [true, true, true] },
      { label: "Catalog management", desc: "Manage splits across your full catalog from one view", values: [true, true, true] },
    ],
  },
  {
    title: "Reporting",
    rows: [
      { label: "Earnings breakdown", desc: "Per-track view of earnings across every distributor", values: [true, true, true] },
      { label: "Catalog health score", desc: "Registration completeness, split coverage, and payout status at a glance", values: [false, true, true] },
      { label: "White-label statements", desc: "Generate branded royalty statements for your artists", values: [false, false, true] },
      { label: "Roster analytics", desc: "Consolidated earnings across all artists and tracks", values: [false, false, true] },
    ],
  },
  {
    title: "Account",
    rows: [
      { label: "Verification records", desc: "View permanent proof of co-ownership agreements", values: [true, true, true] },
      { label: "Team management", desc: "Add and remove team members with role-based access", values: [false, false, true] },
      { label: "Artist roster", desc: "Manage all artists under your label or company", values: [false, false, true] },
      { label: "Priority support", desc: "Dedicated support and direct access to the WavCash team", values: [false, true, true] },
    ],
  },
];

const FEATURE_COLUMNS = [
  { label: "Basic", highlighted: false },
  { label: "Premium", highlighted: true },
  { label: "Enterprise", highlighted: false },
];

/* ================================================================
   Icons
   ================================================================ */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ================================================================
   Component
   ================================================================ */

export default function PricingPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();
  const { ready, authenticated } = usePrivy();
  const isLoggedIn = ready && authenticated;

  const [billing, setBilling] = useState<"annual" | "monthly">("annual");
  const [entSeatIdx, setEntSeatIdx] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightModeRef = useRef(false);

  const entOption = ENTERPRISE.options[entSeatIdx];

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
    router.push(isLoggedIn ? "/dashboard" : "/login");
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
      <style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />
      <div ref={rootRef} className="pricing-root">
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
            <Link href="/splits" className="nav-link">Splits</Link>
            <Link href="/reclaim" className="nav-link">Reclaim</Link>
            <Link href="/pricing" className="nav-link active">Pricing</Link>
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

          {/* ======== Hero ======== */}
          <section className="hero">
            <h1>The right plan for<br />every creator</h1>
            <p>Pick the plan that fits your catalog.</p>

            {/* Billing toggle */}
            <div className="billing-toggle" data-cursor="collapse">
              <button
                type="button"
                className={`billing-btn ${billing === "annual" ? "active" : ""}`}
                onClick={() => setBilling("annual")}
              >
                Annual
                <span className="save-badge">Save 30%</span>
              </button>
              <button
                type="button"
                className={`billing-btn ${billing === "monthly" ? "active" : ""}`}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </button>
            </div>
          </section>

          {/* ======== Tier Cards ======== */}
          <div className="tiers">
            {TIERS.map((tier) => (
              <div key={tier.id} className={`tier-card ${tier.highlight ? "highlighted" : ""}`}>
                <div className="tier-name">{tier.name}</div>
                <div className="tier-price">
                  {tier.price[billing]}
                  <span>/mo</span>
                </div>
                <button type="button" className="tier-cta" onClick={goCta}>
                  Get Started
                </button>
                <div className="tier-billing-note">
                  {billing === "annual" ? "billed annually" : "billed monthly"}
                </div>
              </div>
            ))}

            {/* Enterprise card with seat toggle */}
            <div className="tier-card">
              <div className="seat-toggle" data-cursor="collapse">
                {ENTERPRISE.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`seat-btn ${entSeatIdx === i ? "active" : ""}`}
                    onClick={() => setEntSeatIdx(i)}
                  >
                    {opt.seats}
                  </button>
                ))}
              </div>
              <div className="tier-name">{ENTERPRISE.name}</div>
              <div className="tier-price">
                {entOption.price[billing]}
                <span>/mo</span>
              </div>
              <button type="button" className="tier-cta" onClick={goCta}>
                Get Started
              </button>
              <div className="tier-billing-note">
                {billing === "annual" ? "billed annually" : "billed monthly"}
              </div>
            </div>
          </div>

          {/* ======== Feature Comparison ======== */}
          <div className="features-section">
            <h2 className="features-title">Compare plans</h2>

            {/* Column headers */}
            <div className="feature-header">
              <div className="feature-header-label">Features</div>
              {FEATURE_COLUMNS.map((col) => (
                <div key={col.label} className={`feature-header-tier ${col.highlighted ? "highlighted" : ""}`}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Sections */}
            {SECTIONS.map((section, si) => (
              <div key={si}>
                <div className="feature-group-title">
                  <span>{section.title}</span>
                  <div className="feature-group-line" />
                </div>
                {section.rows.map((row, ri) => (
                  <div key={ri} className="feature-row">
                    <div>
                      <div className="feature-label">{row.label}</div>
                      <div className="feature-desc">{row.desc}</div>
                    </div>
                    {row.values.map((val, ti) => (
                      <div key={ti} className="feature-cell">
                        {val ? (
                          <CheckIcon className="feature-check" />
                        ) : (
                          <div className="feature-dash" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ======== Final CTA ======== */}
          <section className="final-cta">
            <div className="final-cta-card">
              <h2>Start tracking your royalties today</h2>
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
                <a href="/faq" className="footer-link">FAQs</a>
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

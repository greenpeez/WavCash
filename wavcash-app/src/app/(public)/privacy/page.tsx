"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

/* ================================================================
   Scoped CSS
   ================================================================ */

const PRIVACY_CSS = `
/* ---- RESET & VARS ---- */
.privacy-root {
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
  --nav-underline: rgba(232,236,240,0.25);
}
.privacy-root[data-theme="light"] {
  --text-primary: #1A1A1A;
  --text-secondary: #5A6670;
  --text-tertiary: #8895A0;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
  --bg-btn-primary: #000;
  --text-btn-primary: #fff;
  --accent-dim: rgba(212,136,58,0.08);
  --accent-border: rgba(212,136,58,0.22);
  --nav-underline: rgba(0,0,0,0.18);
}

.privacy-root {
  position: relative; min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-primary); overflow-x: hidden;
}
.privacy-root *, .privacy-root *::before, .privacy-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}
.privacy-root canvas {
  position: fixed; inset: 0; width: 100%; height: 100%;
  z-index: 0; pointer-events: none;
}

/* ---- NAV (matches pricing/sniffer) ---- */
.privacy-root .top-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: background 0.6s ease, border-color 0.6s ease;
}
.privacy-root .nav-logo {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color 0.8s ease;
}
.privacy-root .nav-logo:hover { color: var(--accent); }
.privacy-root .nav-logo svg { color: inherit; transition: transform 0.8s ease, color 0.8s ease; }
.privacy-root .nav-logo:hover svg { transform: scale(1.08); }
.privacy-root .nav-links { display: flex; gap: 0; align-items: center; }
.privacy-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; background: none; border: none;
  position: relative; padding: 4px 16px; transition: color 0.8s ease;
  font-family: inherit;
}
.privacy-root .nav-link::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px;
  background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.privacy-root .nav-link:hover { color: var(--accent); }
.privacy-root .nav-link:hover::after { width: 0; }
.privacy-root .nav-link.active { color: var(--accent); }
.privacy-root .nav-link.active::after { width: 100%; background: var(--accent); }
.privacy-root .nav-right { display: flex; align-items: center; gap: 0; }
.privacy-root .nav-hit { display: flex; align-items: center; padding: 0 16px; }
.privacy-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.5s ease;
}
.privacy-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.privacy-root .theme-toggle svg { width: 16px; height: 16px; transition: transform 0.5s ease; }
.privacy-root .theme-toggle:hover svg { transform: rotate(15deg) scale(1.1); }
.privacy-root .icon-sun { display: block; }
.privacy-root .icon-moon { display: none; }
.privacy-root[data-theme="light"] .icon-sun { display: none; }
.privacy-root[data-theme="light"] .icon-moon { display: block; }
.privacy-root .nav-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-btn-primary); background: var(--bg-btn-primary);
  border: none; border-radius: 8px; padding: 10px 22px;
  letter-spacing: 0.2px; cursor: pointer;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
}
.privacy-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.privacy-root .nav-cta:active { transform: scale(0.98); }

/* ---- MAIN ---- */
.privacy-root .main {
  position: relative; z-index: 1;
  max-width: 1100px; margin: 0 auto;
  padding: 0 40px;
}

/* ---- PROSE CONTAINER ---- */
.privacy-root .prose-container {
  max-width: 760px; margin: 0 auto;
  padding: 140px 0 80px;
}
.privacy-root .prose-card {
  background: var(--bg-surface);
  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: 20px; padding: 64px 56px;
}
.privacy-root[data-theme="light"] .prose-card {
  background: rgba(255,255,255,0.4);
  border-color: rgba(0,0,0,0.08);
}

/* ---- TYPOGRAPHY ---- */
.privacy-root .prose-card h1 {
  font-family: 'General Sans', sans-serif;
  font-size: 32px; font-weight: 700;
  letter-spacing: -1px; line-height: 1.2;
  margin-bottom: 8px;
}
.privacy-root .prose-card .effective-date {
  font-size: 14px; color: var(--text-tertiary);
  margin-bottom: 48px; line-height: 1.6;
}
.privacy-root .prose-card h2 {
  font-family: 'General Sans', sans-serif;
  font-size: 22px; font-weight: 700;
  letter-spacing: -0.5px; line-height: 1.3;
  margin-top: 48px; margin-bottom: 16px;
  color: var(--text-primary);
}
.privacy-root .prose-card h3 {
  font-size: 17px; font-weight: 600;
  line-height: 1.4;
  margin-top: 32px; margin-bottom: 12px;
  color: var(--text-primary);
}
.privacy-root .prose-card p {
  font-size: 15px; color: var(--text-secondary);
  line-height: 1.75; margin-bottom: 16px;
}
.privacy-root .prose-card ul {
  list-style: disc;
  padding-left: 24px;
  margin-bottom: 16px;
}
.privacy-root .prose-card ul li {
  font-size: 15px; color: var(--text-secondary);
  line-height: 1.75; margin-bottom: 6px;
}
.privacy-root .prose-card a {
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.3s ease;
}
.privacy-root .prose-card a:hover {
  opacity: 0.8;
  text-decoration: underline;
}
.privacy-root .prose-card strong {
  color: var(--text-primary);
  font-weight: 600;
}

/* ---- TABLES ---- */
.privacy-root .prose-card .table-wrap {
  overflow-x: auto;
  margin: 16px 0 24px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}
.privacy-root .prose-card table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.6;
}
.privacy-root .prose-card thead th {
  background: var(--bg-surface);
  color: var(--text-primary);
  font-weight: 600; font-size: 13px;
  text-align: left;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}
.privacy-root .prose-card tbody td {
  padding: 12px 16px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}
.privacy-root .prose-card tbody tr:last-child td {
  border-bottom: none;
}
.privacy-root .prose-card tbody tr:hover {
  background: rgba(232,236,240,0.025);
}
.privacy-root[data-theme="light"] .prose-card tbody tr:hover {
  background: rgba(0,0,0,0.02);
}

/* ---- FOOTER ---- */
.privacy-root .sp-footer { padding: 100px 0 60px; }
.privacy-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.privacy-root .footer-grid > div {
  display: flex; flex-direction: column; align-items: center;
}
.privacy-root .footer-col-title {
  font-family: inherit;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.privacy-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease;
}
.privacy-root .footer-link:hover { color: var(--accent); }
.privacy-root .social-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.privacy-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.privacy-root .social-icon:hover { color: var(--accent); }

/* ---- RESPONSIVE ---- */
@media (max-width: 768px) {
  .privacy-root .top-nav { padding: 12px 20px; }
  .privacy-root .nav-links { display: none; }
  .privacy-root .nav-hit:has(.nav-cta) { display: none; }
  .privacy-root .main { padding: 0 20px; }
  .privacy-root .prose-container { padding: 100px 0 60px; }
  .privacy-root .prose-card { padding: 40px 24px; }
  .privacy-root .prose-card h1 { font-size: 26px; }
  .privacy-root .prose-card h2 { font-size: 19px; margin-top: 36px; }
  .privacy-root .footer-grid { flex-direction: column; align-items: center; gap: 32px; }
}
`;

/* ================================================================
   Shaders (identical to pricing / splits / docs / login)
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
   Component
   ================================================================ */

export default function PrivacyPage() {
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
      <style dangerouslySetInnerHTML={{ __html: PRIVACY_CSS }} />
      <div ref={rootRef} className="privacy-root">
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
          <div className="prose-container">
            <div className="prose-card">

              <h1>Privacy Policy &amp; Data Disclosure</h1>
              <div className="effective-date">
                Last Updated: March 10, 2026<br />
                Effective Date: March 10, 2026
              </div>

              {/* ======== Section 1 ======== */}
              <h2>1. Introduction and Who We Are</h2>
              <p>
                Welcome to WavCash (the &ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
                The Platform is operated by Sama Studios LLC, a New Mexico limited liability company.
              </p>
              <p>
                We provide tools for music creators, songwriters, producers, and collaborators to create, sign,
                and manage music royalty split sheet agreements and related documents.
              </p>
              <p>
                <strong>Data Controller:</strong> Sama Studios LLC is the data controller for all personal
                information processed through the Platform.
              </p>
              <p><strong>Contact:</strong></p>
              <ul>
                <li>Email: <a href="mailto:privacy@wav.cash">privacy@wav.cash</a></li>
                <li>Data rights requests: <a href="mailto:privacy@wav.cash">privacy@wav.cash</a></li>
                <li>Web form: <a href="/data-request">wav.cash/data-request</a></li>
              </ul>
              <p>
                <strong>EU/EEA Establishment:</strong> Sama Studios LLC is established in the EU by virtue of
                operating from Portugal. No separate EU representative is required under Article 27 GDPR.
                Privacy inquiries may be directed to <a href="mailto:privacy@wav.cash">privacy@wav.cash</a>.
              </p>
              <p>
                <strong>UK Representative (UK GDPR):</strong> Sama Studios LLC does not currently have a
                designated UK representative. If you are a UK resident with a privacy inquiry or complaint,
                please contact <a href="mailto:privacy@wav.cash">privacy@wav.cash</a>. We are in the process
                of appointing a formal UK representative as required under UK GDPR Article 27 and will update
                this Policy when that appointment is made.
              </p>
              <p>
                <strong>Data Protection Officer:</strong> Sama Studios LLC has not appointed a formal DPO as we
                do not currently meet the mandatory appointment thresholds under Article 37 GDPR. Privacy
                inquiries may be directed to <a href="mailto:privacy@wav.cash">privacy@wav.cash</a>.
              </p>

              {/* ======== Section 2 ======== */}
              <h2>2. Scope of This Policy</h2>
              <p>This Privacy Policy applies to:</p>
              <ul>
                <li>All users who access or use the Platform, including free and paid accounts</li>
                <li>Visitors to our website at <a href="https://wav.cash">https://wav.cash</a></li>
                <li>All personal information submitted in connection with creating, viewing, signing, or managing agreements on the Platform</li>
                <li>Third parties whose personal information is submitted by a Platform user (for example, a co-writer added to a split sheet by another user)</li>
              </ul>
              <p>
                If you are a third party whose information has been submitted to the Platform by another user,
                please contact us at <a href="mailto:privacy@wav.cash">privacy@wav.cash</a> to exercise your data rights.
              </p>
              <p>This Policy does not apply to third-party websites or services linked from the Platform.</p>

              {/* ======== Section 3 ======== */}
              <h2>3. What Personal Information We Collect</h2>
              <p>We collect the following categories of personal information.</p>

              <h3>3.1 Information You Provide Directly</h3>
              <p><strong>Identity Information:</strong></p>
              <ul>
                <li>Full legal name</li>
                <li>Stage name or artist alias</li>
              </ul>
              <p><strong>Contact Information:</strong></p>
              <ul>
                <li>Email address</li>
                <li>Mailing address</li>
                <li>Phone number (if provided)</li>
              </ul>
              <p><strong>Professional and Music Industry Information:</strong></p>
              <ul>
                <li>Performing Rights Organization (PRO) affiliation (e.g., ASCAP, BMI, SESAC, SOCAN, PRS)</li>
                <li>IPI/CAE number (PRO-issued identifier)</li>
                <li>Publishing company name</li>
                <li>Role on musical works (e.g., songwriter, producer)</li>
                <li>ISRC and ISWC codes associated with works</li>
              </ul>
              <p><strong>Agreement Content:</strong></p>
              <ul>
                <li>Ownership percentages and royalty splits entered into agreements</li>
                <li>Digital signatures (name, timestamp, and IP address at time of signing)</li>
                <li>Agreement dates and identifiers</li>
              </ul>
              <p><strong>Account Information:</strong></p>
              <ul>
                <li>Username and password (stored in hashed and encrypted form)</li>
                <li>Account preferences and settings</li>
              </ul>

              <h3>3.2 Information Collected Automatically</h3>
              <p>When you use the Platform, we automatically collect:</p>
              <ul>
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Device identifiers</li>
                <li>Pages visited and features used</li>
                <li>Time and date of access</li>
                <li>Referring URL</li>
                <li>Session duration</li>
              </ul>
              <p>
                We use Google Analytics for usage analytics. Google Analytics may set cookies on your device.
                You can opt out of Google Analytics across all websites using the Google Analytics Opt-out
                Browser Add-on. See Section 8 for further detail on cookies and how to manage them.
              </p>

              <h3>3.3 Information From Third Parties</h3>
              <p>We may receive personal information about you from:</p>
              <ul>
                <li>Other Platform users who add you as a collaborator or co-signatory on an agreement</li>
                <li>PROs or music industry databases, if you choose to connect such services</li>
              </ul>

              <h3>3.4 Special Categories of Data</h3>
              <p>
                We do not intentionally collect data revealing racial or ethnic origin, political opinions,
                religious beliefs, health or medical data, biometric identification data, sexual orientation,
                or government-issued identification numbers such as Social Security Numbers or Tax IDs.
              </p>
              <p>
                If you believe sensitive data has been inadvertently submitted to the Platform, contact us
                at <a href="mailto:privacy@wav.cash">privacy@wav.cash</a> and we will delete it promptly.
              </p>

              {/* ======== Section 4 ======== */}
              <h2>4. Why We Collect Your Data and Our Legal Basis</h2>
              <p>For each purpose we process your data, we rely on one of the following legal bases under GDPR.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Purpose</th>
                      <th>Data Used</th>
                      <th>Legal Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Creating and managing your account</td><td>Name, email, password</td><td>Contract (to provide the service)</td></tr>
                    <tr><td>Generating and storing split sheet agreements</td><td>All agreement content, party information</td><td>Contract</td></tr>
                    <tr><td>Sending agreements to co-signatories</td><td>Name and email of parties</td><td>Contract and Legitimate Interests</td></tr>
                    <tr><td>Verifying identity for digital signatures</td><td>Name, IP, timestamp</td><td>Contract and Legal Obligation</td></tr>
                    <tr><td>Sending transactional emails (receipts, alerts)</td><td>Email address</td><td>Contract</td></tr>
                    <tr><td>Customer support</td><td>Any information you share with us</td><td>Contract and Legitimate Interest</td></tr>
                    <tr><td>Platform security and fraud prevention</td><td>IP address, usage logs</td><td>Legitimate Interests</td></tr>
                    <tr><td>Analytics and platform improvement</td><td>Anonymized and aggregated usage data</td><td>Legitimate Interests</td></tr>
                    <tr><td>Compliance with legal obligations</td><td>As required</td><td>Legal Obligation</td></tr>
                    <tr><td>Marketing communications</td><td>Email address</td><td>Consent (opt-in only; withdrawal available at any time)</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                We do not sell your personal information. We do not share your personal information with
                third parties for their independent marketing purposes.
              </p>

              {/* ======== Section 5 ======== */}
              <h2>5. How Long We Retain Your Data</h2>
              <p>
                We retain personal information only for as long as necessary for the purpose for which it was
                collected, subject to applicable legal retention requirements.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data Category</th>
                      <th>Retention Period</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Account information</td><td>Duration of account plus 3 years after closure</td><td>Service delivery and legal dispute window</td></tr>
                    <tr><td>Signed agreements</td><td>7 years from date of signing</td><td>Legal enforceability and copyright dispute evidence</td></tr>
                    <tr><td>Digital signature logs</td><td>7 years</td><td>Legal enforceability under ESIGN Act and eIDAS</td></tr>
                    <tr><td>Usage logs and IP addresses</td><td>90 days</td><td>Security and fraud prevention</td></tr>
                    <tr><td>Marketing preferences</td><td>Until withdrawn plus 30 days</td><td>Consent withdrawal processing</td></tr>
                    <tr><td>Support correspondence</td><td>2 years from resolution</td><td>Quality assurance and dispute resolution</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                When retention periods expire, data is deleted or anonymized in a way that prevents reconstruction.
                You may request early deletion subject to the exceptions described in Section 7.
              </p>

              {/* ======== Section 6 ======== */}
              <h2>6. How We Share Your Data</h2>
              <p>We share your personal information only in the following circumstances.</p>

              <h3>6.1 With Co-Signatories on Your Agreements</h3>
              <p>
                When you create a split sheet agreement and add other parties, those parties will receive an
                invitation containing your name and contact information to facilitate the agreement process.
                This sharing is necessary to perform the contract.
              </p>

              <h3>6.2 With Service Providers (Data Processors)</h3>
              <p>
                We work with vetted third-party service providers who process data on our behalf under written
                Data Processing Agreements. Our current service providers include:
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Service Category</th>
                      <th>Provider</th>
                      <th>Purpose</th>
                      <th>Data Shared</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Cloud hosting and infrastructure</td><td>Vercel, Supabase</td><td>Platform hosting and storage</td><td>All Platform data</td></tr>
                    <tr><td>Email delivery</td><td>Resend</td><td>Sending system and agreement emails</td><td>Email address, name</td></tr>
                    <tr><td>Document signing</td><td>Avalanche C-Chain</td><td>Cryptographic signature anchoring</td><td>Agreement hash only (no personal data written onchain)</td></tr>
                    <tr><td>Analytics</td><td>Google Analytics</td><td>Platform usage analytics</td><td>Anonymized usage data</td></tr>
                  </tbody>
                </table>
              </div>
              <p>Our service providers are contractually prohibited from using your data for their own purposes.</p>

              <h3>6.3 Legal Compliance and Protection</h3>
              <p>We may disclose personal information if we believe in good faith that such disclosure is necessary to:</p>
              <ul>
                <li>Comply with applicable law, regulation, or legal process, including valid court orders or subpoenas</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect the rights, property, or safety of Sama Studios LLC, our users, or the public</li>
                <li>Detect, prevent, or respond to fraud, security incidents, or technical issues</li>
              </ul>

              <h3>6.4 Business Transfers</h3>
              <p>
                If we are involved in a merger, acquisition, asset sale, or bankruptcy, your personal information
                may be transferred as part of that transaction. We will notify you by email and/or prominent
                notice on the Platform before your personal information becomes subject to a materially different
                privacy policy.
              </p>

              <h3>6.5 With Your Explicit Consent</h3>
              <p>We will share your information with any other party only with your explicit prior consent.</p>

              {/* ======== Section 7 ======== */}
              <h2>7. Your Privacy Rights</h2>
              <p>
                Depending on where you are located, you may have the following rights regarding your personal
                information. We honor these rights regardless of jurisdiction and treat them as universal to
                the extent technically feasible.
              </p>
              <p>
                <strong>Right to Know and Access:</strong> You may request a copy of the personal information
                we hold about you, including what categories we hold, how we use it, and who we share it with.
              </p>
              <p>
                <strong>Right to Correction and Rectification:</strong> You may request that we correct
                inaccurate or incomplete personal information.
              </p>
              <p>
                <strong>Right to Erasure and Deletion:</strong> You may request that we delete your personal
                information. We will fulfill this request unless retention is required by law. Note that signed
                split sheet agreements may be subject to contractual and legal retention obligations. We may
                retain the agreement record itself while anonymizing or deleting your contact details from our
                active systems upon request.
              </p>
              <p>
                <strong>Right to Portability:</strong> You may request your personal information in a structured,
                machine-readable format (JSON or CSV) for transfer to another platform or service.
              </p>
              <p>
                <strong>Right to Restrict Processing:</strong> You may request that we temporarily limit
                processing of your data while you contest its accuracy or our legal basis.
              </p>
              <p>
                <strong>Right to Object:</strong> You may object to processing based on legitimate interests
                or for direct marketing purposes. Marketing objections will be honored immediately and without penalty.
              </p>
              <p>
                <strong>Right to Opt Out of Sale or Sharing (California Residents):</strong> We do not sell or
                share your personal information as defined under the CCPA/CPRA. If our practices change, we
                will update this Policy and provide an opt-out mechanism before doing so.
              </p>
              <p>
                <strong>Right to Non-Discrimination:</strong> Exercising any of your privacy rights will not
                result in denial of service, reduced quality of service, or any other penalty.
              </p>

              <h3>How to Submit a Request</h3>
              <p>Submit any rights request through:</p>
              <ul>
                <li>Email: <a href="mailto:privacy@wav.cash">privacy@wav.cash</a></li>
                <li>Web Form: <a href="/data-request">wav.cash/data-request</a></li>
              </ul>
              <p>
                We will respond within 30 days (extendable to 60 days for complex requests, with notice). We
                may need to verify your identity before processing certain requests. We will not charge a fee
                for reasonable requests.
              </p>
              <p>
                For EU and UK residents: You also have the right to lodge a complaint with your local supervisory
                authority at any time. In Portugal and the EU: CNPD. In the UK: ICO. You may also contact the
                national DPA in the EU member state where you reside or work.
              </p>

              {/* ======== Section 8 ======== */}
              <h2>8. Cookies and Tracking Technologies</h2>
              <p>We use the following types of cookies and similar technologies.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Purpose</th>
                      <th>Can Be Disabled?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Strictly necessary</td><td>Session management, authentication, security</td><td>No; required for platform function</td></tr>
                    <tr><td>Functional</td><td>Saved preferences, UI settings</td><td>Yes</td></tr>
                    <tr><td>Analytics</td><td>Understanding how the platform is used (Google Analytics)</td><td>Yes</td></tr>
                  </tbody>
                </table>
              </div>
              <p>
                You can manage cookie preferences using the cookie consent banner that appears when
                you first visit the Platform. To reset your preferences, clear your browser's local
                storage for wav.cash.
              </p>
              <p>
                For EU and UK users: We will not set non-essential cookies without your prior consent.
                You may withdraw consent at any time by clearing your browser's local storage for
                wav.cash, which will cause the consent banner to reappear on your next visit.
              </p>
              <p>
                <strong>Global Privacy Control (GPC):</strong> We honor browser-level Global Privacy Control
                signals as an opt-out of data sharing, as required by CCPA/CPRA and applicable US state laws.
              </p>
              <p>
                <strong>Google Analytics:</strong> We use Google Analytics to understand how users interact with
                the Platform. Google Analytics collects data such as pages visited, session duration, and general
                geographic location. This data is aggregated and anonymized. You can opt out at any time using
                the Google Analytics Opt-out Browser Add-on. For more information on how Google uses this data,
                see Google&apos;s Privacy Policy.
              </p>

              {/* ======== Section 9 ======== */}
              <h2>9. International Data Transfers</h2>
              <p>
                Your personal information may be transferred to and processed in countries other than your
                country of residence. These countries may have different data protection laws.
              </p>
              <p>
                When transferring personal information outside the EU/EEA or UK, we implement the following safeguards:
              </p>
              <p>
                <strong>Standard Contractual Clauses (SCCs):</strong> We use the EU Commission-approved SCCs
                for transfers to countries without an EU adequacy decision. These clauses contractually bind
                recipients to EU-equivalent data protection standards.
              </p>
              <p>
                <strong>UK International Data Transfer Agreements (IDTAs):</strong> Used for applicable
                transfers from the UK.
              </p>
              <p>
                <strong>Adequacy decisions:</strong> Where the destination country has been granted an adequacy
                decision by the European Commission (currently including the UK, Switzerland, Canada for the
                commercial sector, Japan, and others), we rely on that decision.
              </p>
              <p>
                By using the Platform, you acknowledge that your information may be transferred internationally
                as described above.
              </p>

              {/* ======== Section 10 ======== */}
              <h2>10. Security</h2>
              <p>
                We implement technical and organizational measures appropriate to the risk level of the data
                we process, including:
              </p>
              <ul>
                <li>AES-256 encryption for all data at rest</li>
                <li>TLS 1.2 or higher encryption for all data in transit</li>
                <li>Hashed and salted storage of passwords (bcrypt or equivalent)</li>
                <li>Role-based access controls limiting staff access to personal data on a need-to-know basis</li>
                <li>Multi-factor authentication (MFA) for all internal systems access</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Formal incident response plan with 72-hour breach notification capability</li>
              </ul>
              <p>
                Despite these measures, no system is completely secure. You are responsible for maintaining the
                security of your account credentials. If you suspect unauthorized access to your account, contact
                us immediately at <a href="mailto:privacy@wav.cash">privacy@wav.cash</a>.
              </p>
              <p>
                <strong>Data Breach Notification:</strong> In the event of a breach that poses a risk to your
                rights and freedoms, we will notify the relevant supervisory authority within 72 hours and notify
                affected users without undue delay, as required by applicable law.
              </p>

              {/* ======== Section 11 ======== */}
              <h2>11. Children&apos;s Privacy</h2>
              <p>
                The Platform is not directed at individuals under the age of 18. We do not knowingly collect
                personal information from minors. If you are a parent or guardian and believe your child has
                provided us with personal information, please contact us
                at <a href="mailto:privacy@wav.cash">privacy@wav.cash</a> and we will delete it promptly.
              </p>
              <p>
                If we become aware that we have collected personal information from a person under 18 without
                verified parental consent, we will take immediate steps to delete that information.
              </p>

              {/* ======== Section 12 ======== */}
              <h2>12. Third-Party Links and Services</h2>
              <p>
                The Platform may contain links to third-party websites or services, for example PRO registration
                portals. This Privacy Policy does not apply to those third-party services. We encourage you to
                review the privacy policies of any third-party services you access through the Platform.
              </p>

              {/* ======== Section 13 ======== */}
              <h2>13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices,
                technology, legal requirements, or other factors.
              </p>
              <p>
                Material changes (changes that materially affect your rights or how we use your data) will be
                communicated via:
              </p>
              <ul>
                <li>Email to your registered address at least 30 days before taking effect</li>
                <li>A prominent notice on the Platform</li>
              </ul>
              <p>
                Minor changes (corrections or clarifications) will be reflected with an updated &ldquo;Last
                Updated&rdquo; date at the top of this Policy.
              </p>
              <p>
                Your continued use of the Platform after the effective date of any update constitutes acceptance
                of the revised Policy. If you do not agree with a material change, you may delete your account
                prior to the effective date.
              </p>

              {/* ======== Section 14 ======== */}
              <h2>14. Jurisdiction-Specific Disclosures</h2>

              <h3>14.1 California Residents (CCPA / CPRA)</h3>
              <p>
                In addition to the rights described in Section 7, California residents have the following rights.
              </p>
              <p>
                <strong>Categories of personal information we collect:</strong> See Section 3. This includes
                identifiers (name, email, IP address), commercial information (agreement history), and professional
                information (PRO affiliation, music credits).
              </p>
              <p>
                <strong>Sources of information:</strong> Directly from you, automatically through your use of
                the Platform, and from other Platform users who add you as a collaborator.
              </p>
              <p><strong>Business or commercial purposes:</strong> See Section 4.</p>
              <p>
                We do not sell or share your personal information as defined under the CCPA/CPRA, including for
                cross-context behavioral advertising.
              </p>
              <p><strong>Retention:</strong> See Section 5.</p>
              <p>
                <strong>Shine the Light (Cal. Civ. Code section 1798.83):</strong> We do not disclose personal
                information to third parties for their direct marketing purposes.
              </p>
              <p>
                To exercise California rights, contact <a href="mailto:privacy@wav.cash">privacy@wav.cash</a> or
                submit a request at <a href="/data-request">wav.cash/data-request</a>.
              </p>

              <h3>14.2 EU / EEA Residents (GDPR)</h3>
              <p>
                <strong>Supervisory authority:</strong> You have the right to lodge a complaint with the
                supervisory authority in the EU member state where you reside, work, or where an alleged
                infringement occurred. Our lead supervisory authority as a Portugal-based operator is the
                CNPD (Comissao Nacional de Protecao de Dados): <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">https://www.cnpd.pt</a>
              </p>
              <p><strong>Legal bases:</strong> See Section 4 for the specific legal basis for each processing activity.</p>
              <p>
                <strong>Automated decision-making:</strong> We do not make solely automated decisions that
                produce legal or similarly significant effects on individuals.
              </p>
              <p>
                <strong>Right to withdraw consent:</strong> Where we process your data based on consent (for
                example, marketing emails), you may withdraw that consent at any time. Withdrawal does not
                affect the lawfulness of processing that occurred before withdrawal.
              </p>

              <h3>14.3 UK Residents (UK GDPR)</h3>
              <p>
                Your rights under UK GDPR are substantively identical to those of EU residents described above.
                The relevant supervisory authority is the UK Information Commissioner&apos;s Office
                (ICO): <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">https://ico.org.uk</a>
              </p>

              <h3>14.4 Canadian Residents (PIPEDA / Quebec Law 25)</h3>
              <p>
                We collect, use, and disclose personal information about Canadian residents with their knowledge
                and consent, in accordance with PIPEDA&apos;s Ten Principles. Our designated privacy contact can
                be reached at <a href="mailto:privacy@wav.cash">privacy@wav.cash</a>. Quebec residents have
                additional rights under Law 25, including the right to de-indexation and the right to be informed
                about any automated profiling.
              </p>

              {/* ======== Section 15 ======== */}
              <h2>15. Contact and Complaints</h2>
              <p>For any privacy-related inquiries, rights requests, or complaints:</p>
              <p>
                Sama Studios LLC<br />
                Attn: Privacy Team<br />
                <a href="mailto:privacy@wav.cash">privacy@wav.cash</a>
              </p>
              <p>We aim to respond to all privacy inquiries within 10 business days.</p>
              <p>
                If you are not satisfied with our response, you have the right to escalate your complaint to
                the relevant supervisory authority for your jurisdiction. See Section 7 and Section 14 for
                supervisory authority contacts.
              </p>

            </div>
          </div>

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

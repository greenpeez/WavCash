"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

/* ================================================================
   Scoped CSS
   ================================================================ */

const DATAREQUEST_CSS = `
/* ---- RESET & VARS ---- */
.datarequest-root {
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
.datarequest-root[data-theme="light"] {
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

.datarequest-root {
  position: relative; min-height: 100vh;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: var(--text-primary); overflow-x: hidden;
}
.datarequest-root *, .datarequest-root *::before, .datarequest-root *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}
.datarequest-root canvas {
  position: fixed; inset: 0; width: 100%; height: 100%;
  z-index: 0; pointer-events: none;
}

/* ---- NAV ---- */
.datarequest-root .top-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  transition: background 0.6s ease, border-color 0.6s ease;
}
.datarequest-root .nav-logo {
  font-family: var(--font-general-sans), 'General Sans', sans-serif;
  font-weight: 700; font-size: 22px; letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color 0.8s ease;
}
.datarequest-root .nav-logo:hover { color: var(--accent); }
.datarequest-root .nav-logo svg { color: inherit; transition: transform 0.8s ease, color 0.8s ease; }
.datarequest-root .nav-logo:hover svg { transform: scale(1.08); }
.datarequest-root .nav-links { display: flex; gap: 0; align-items: center; }
.datarequest-root .nav-link {
  font-size: 14px; font-weight: 500; color: var(--text-secondary);
  text-decoration: none; background: none; border: none;
  position: relative; padding: 4px 16px; transition: color 0.8s ease;
  font-family: inherit;
}
.datarequest-root .nav-link::after {
  content: ''; position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px;
  background: var(--nav-underline);
  transition: width 0.5s ease, background 0.5s ease;
}
.datarequest-root .nav-link:hover { color: var(--accent); }
.datarequest-root .nav-link:hover::after { width: 0; }
.datarequest-root .nav-link.active { color: var(--accent); }
.datarequest-root .nav-link.active::after { width: 100%; background: var(--accent); }
.datarequest-root .nav-right { display: flex; align-items: center; gap: 0; }
.datarequest-root .nav-hit { display: flex; align-items: center; padding: 0 16px; }
.datarequest-root .theme-toggle {
  background: none; border: 1px solid var(--border-subtle);
  border-radius: 8px; padding: 7px 9px; display: flex;
  align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.5s ease;
}
.datarequest-root .theme-toggle:hover {
  color: var(--accent);
  border-color: rgba(212,136,58,0.35);
  background: rgba(212,136,58,0.08);
}
.datarequest-root .theme-toggle svg { width: 16px; height: 16px; transition: transform 0.5s ease; }
.datarequest-root .theme-toggle:hover svg { transform: rotate(15deg) scale(1.1); }
.datarequest-root .icon-sun { display: block; }
.datarequest-root .icon-moon { display: none; }
.datarequest-root[data-theme="light"] .icon-sun { display: none; }
.datarequest-root[data-theme="light"] .icon-moon { display: block; }
.datarequest-root .nav-cta {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--text-btn-primary); background: var(--bg-btn-primary);
  border: none; border-radius: 8px; padding: 10px 22px;
  letter-spacing: 0.2px; cursor: pointer;
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease;
}
.datarequest-root .nav-cta:hover {
  background: var(--accent); color: #000;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15);
}
.datarequest-root .nav-cta:active { transform: scale(0.98); }

/* ---- MAIN ---- */
.datarequest-root .main {
  position: relative; z-index: 1;
  max-width: 1100px; margin: 0 auto;
  padding: 0 40px;
}

/* ---- PROSE CONTAINER ---- */
.datarequest-root .prose-container {
  max-width: 760px; margin: 0 auto;
  padding: 140px 0 80px;
}
.datarequest-root .prose-card {
  background: var(--bg-surface);
  -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
  border: 1px solid var(--border-subtle);
  border-radius: 20px; padding: 64px 56px;
}
.datarequest-root[data-theme="light"] .prose-card {
  background: rgba(255,255,255,0.4);
  border-color: rgba(0,0,0,0.08);
}

/* ---- TYPOGRAPHY ---- */
.datarequest-root .prose-card h1 {
  font-family: 'General Sans', sans-serif;
  font-size: 32px; font-weight: 700;
  letter-spacing: -1px; line-height: 1.2;
  margin-bottom: 40px;
}
.datarequest-root .prose-card p {
  font-size: 15px; color: var(--text-secondary);
  line-height: 1.75; margin-bottom: 20px;
}
.datarequest-root .prose-card strong {
  color: var(--text-primary);
  font-weight: 600;
}
.datarequest-root .prose-card em {
  font-style: italic;
}
.datarequest-root .prose-card a {
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.3s ease;
}
.datarequest-root .prose-card a:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* ---- DOWNLOAD LINK ---- */
.datarequest-root .download-link {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 16px;
  font-size: 16px; font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.3s ease;
}
.datarequest-root .download-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}
.datarequest-root .download-link svg {
  width: 18px; height: 18px;
  flex-shrink: 0;
}

/* ---- FOOTER ---- */
.datarequest-root .sp-footer { padding: 100px 0 60px; }
.datarequest-root .footer-grid {
  display: flex; justify-content: center; gap: 80px;
}
.datarequest-root .footer-grid > div {
  display: flex; flex-direction: column; align-items: center;
}
.datarequest-root .footer-col-title {
  font-family: inherit;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: var(--text-tertiary);
  margin-bottom: 12px;
}
.datarequest-root .footer-link {
  display: block; color: var(--text-secondary);
  text-decoration: none; font-size: 13px; margin-bottom: 6px;
  transition: color 0.3s ease;
}
.datarequest-root .footer-link:hover { color: var(--accent); }
.datarequest-root .social-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.datarequest-root .social-icon {
  color: var(--text-secondary); transition: color 0.3s ease;
  display: flex; align-items: center;
}
.datarequest-root .social-icon:hover { color: var(--accent); }

/* ---- RESPONSIVE ---- */
@media (max-width: 768px) {
  .datarequest-root .top-nav { padding: 12px 20px; }
  .datarequest-root .nav-links { display: none; }
  .datarequest-root .nav-hit:has(.nav-cta) { display: none; }
  .datarequest-root .main { padding: 0 20px; }
  .datarequest-root .prose-container { padding: 100px 0 60px; }
  .datarequest-root .prose-card { padding: 40px 24px; }
  .datarequest-root .prose-card h1 { font-size: 26px; }
  .datarequest-root .footer-grid { flex-direction: column; align-items: center; gap: 32px; }
}
`;

/* ================================================================
   Shaders (identical to privacy / pricing / splits / docs / login)
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

export default function DataRequestPage() {
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
      <style dangerouslySetInnerHTML={{ __html: DATAREQUEST_CSS }} />
      <div ref={rootRef} className="datarequest-root">
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

              <h1>Data Rights Request Form</h1>

              <p>
                <strong>How to submit:</strong> Email this completed form
                to <a href="mailto:privacy@wav.cash">privacy@wav.cash</a> from
                the email address registered to your WavCash account. Submitting
                from your registered email is how we verify your identity. We
                cannot process requests submitted from an unrecognized email address.
              </p>

              <p>
                <strong>Response time:</strong> We will acknowledge your request
                within 3 business days and complete it within 30 days. Complex
                requests may take up to 60 days; we will notify you if that applies.
              </p>

              <p>
                If you were added as a collaborator on a split sheet by another
                user and do not have a WavCash account, please describe the
                situation in the <em>Additional Details</em> field and we will
                assist you.
              </p>

              <a
                href="/data-request-form.pdf"
                download
                className="download-link"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Data Request Form
              </a>

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

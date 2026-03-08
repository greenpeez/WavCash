"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  usePrivy,
  useLoginWithEmail,
  useLoginWithOAuth,
  useWallets,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useTheme } from "next-themes";

/* ================================================================
   Login Page — Mercury Surface + Glass Card
   ================================================================ */

const LOGIN_CSS = `
.login-root {
  --bg-body: #0a0a0a;
  --text-primary: #E8ECF0;
  --text-secondary: #9AA8B4;
  --text-tertiary: #788898;
  --accent: #D4883A;
  --bg-surface: rgba(232,236,240,0.06);
  --border-subtle: rgba(232,236,240,0.12);
  position: relative; width: 100%; height: 100vh; overflow: hidden;
  background: var(--bg-body);
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  color: var(--text-primary);
}
.login-root[data-theme="light"] {
  --bg-body: #F8F6F3;
  --text-primary: #1A1A1A;
  --text-secondary: #5A5A5A;
  --text-tertiary: #888;
  --accent: #D4883A;
  --bg-surface: rgba(0,0,0,0.04);
  --border-subtle: rgba(0,0,0,0.10);
}
/* Canvas */
.login-root canvas {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;
}

/* UI overlay */
.login-root .ui-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 10; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
}
.login-root .ui-overlay * { pointer-events: auto; }

/* ---- GLASS CARD ---- */
.login-root .glass-card {
  width: 100%; max-width: 420px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 40px 36px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.login-root[data-theme="light"] .glass-card {
  background: rgba(255,255,255,0.35);
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}

/* Card header */
.login-root .card-logo {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-bottom: 8px;
}
.login-root .card-logo span {
  font-family: 'General Sans', sans-serif;
  font-weight: 700; font-size: 24px; letter-spacing: -0.5px;
}
.login-root .card-subtitle {
  text-align: center; font-size: 14px; color: var(--text-secondary);
  margin-bottom: 28px;
}

/* Social buttons */
.login-root .social-btn {
  width: 100%; padding: 12px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 500;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  transition: all 0.5s ease;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.login-root .social-btn:hover {
  background: rgba(212,136,58,0.08);
  border-color: rgba(212,136,58,0.35);
  color: var(--accent);
  transform: translateY(-1px);
}
.login-root .social-btn:active { transform: scale(0.98); }
.login-root[data-theme="light"] .social-btn {
  background: rgba(0,0,0,0.05);
  border-color: rgba(0,0,0,0.10);
}
.login-root[data-theme="light"] .social-btn:hover {
  background: rgba(0,0,0,0.08);
  border-color: rgba(212,136,58,0.35);
}

/* Divider */
.login-root .divider {
  display: flex; align-items: center; gap: 16px;
  margin: 24px 0;
}
.login-root .divider::before,
.login-root .divider::after {
  content: ''; flex: 1; height: 1px;
  background: var(--border-subtle);
}
.login-root .divider span {
  font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 1px;
}

/* Input fields */
.login-root .input-label {
  display: block; font-size: 13px; font-weight: 500;
  color: var(--text-secondary); margin-bottom: 6px;
}
.login-root .glass-input {
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
.login-root .glass-input::placeholder { color: var(--text-tertiary); transition: color 0.5s ease; }
.login-root .glass-input:hover {
  border-color: rgba(212,136,58,0.25);
  background: rgba(212,136,58,0.03);
}
.login-root .glass-input:hover::placeholder { color: var(--accent); }
.login-root .glass-input:focus {
  border-color: rgba(212,136,58,0.4);
  background: rgba(212,136,58,0.04);
  box-shadow: 0 0 0 3px rgba(212,136,58,0.1), 0 8px 30px rgba(0,0,0,0.2);
  transform: translateY(-1px);
}
.login-root .glass-input:focus::placeholder { color: var(--accent); }
.login-root[data-theme="light"] .glass-input {
  background: rgba(0,0,0,0.06);
  border-color: rgba(0,0,0,0.10);
}
.login-root[data-theme="light"] .glass-input:hover {
  border-color: rgba(212,136,58,0.3);
  background: rgba(212,136,58,0.04);
}
.login-root[data-theme="light"] .glass-input:focus {
  border-color: rgba(212,136,58,0.5);
  background: rgba(212,136,58,0.06);
}

/* Primary button */
.login-root .btn-primary {
  width: 100%; padding: 13px 24px;
  background: var(--accent); color: #000;
  border: none; border-radius: 10px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px; font-weight: 600;
  transition: all 0.5s ease;
  box-shadow: 0 2px 8px rgba(212,136,58,0.2);
}
.login-root .btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(212,136,58,0.3), 0 0 0 1px rgba(212,136,58,0.15);
}
.login-root .btn-primary:active:not(:disabled) { transform: translateY(0); }
.login-root .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed !important;
}

/* Ghost button */
.login-root .btn-ghost {
  width: 100%; padding: 10px 20px;
  background: transparent; border: none;
  color: var(--text-tertiary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  transition: color 0.5s ease;
}
.login-root .btn-ghost:hover { color: var(--accent); }

/* Error */
.login-root .error-text {
  font-size: 13px; color: #e53e3e; margin-top: 8px;
}

/* Helper text */
.login-root .helper-text {
  font-size: 13px; color: var(--text-tertiary); margin-bottom: 4px;
}
`;

// ---- Shaders (same as landing) ----
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background, #0a0a0a)" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#788898" }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lightModeRef = useRef(false);
  const authHandled = useRef(false);
  const { resolvedTheme, setTheme: setNextTheme } = useTheme();

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const signToken = searchParams.get("sign_token");

  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const embeddedWallet = getEmbeddedConnectedWallet(wallets);

  const {
    sendCode: sendEmailCode,
    loginWithCode: loginWithEmailCode,
    state: emailState,
  } = useLoginWithEmail({
    onComplete: () => handleAuthComplete(),
    onError: (err) => setError(String(err) || "Email login failed"),
  });

  const { initOAuth } = useLoginWithOAuth({
    onComplete: () => handleAuthComplete(),
    onError: (err) => setError(String(err) || "Social login failed"),
  });

  useEffect(() => {
    if (ready && authenticated) {
      handleAuthComplete();
    }
  }, [ready, authenticated]);

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

  async function handleAuthComplete() {
    // Prevent concurrent calls from onComplete + useEffect racing
    if (authHandled.current) return;
    authHandled.current = true;
    // Build query string to thread sign_token through the flow
    const qs = signToken ? `?sign_token=${signToken}` : "";
    try {
      const res = await authFetch("/api/user");
      if (res.ok) {
        const user = await res.json();
        if (user && user.onboarding_complete) {
          router.push(signToken ? `/dashboard${qs}` : redirect);
        } else {
          router.push(`/onboarding${qs}`);
        }
      } else if (res.status === 404) {
        try {
          await authFetch("/api/user/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallet_address: embeddedWallet?.address || null }),
          });
        } catch { /* continue */ }
        router.push(`/onboarding${qs}`);
      } else {
        router.push(`/onboarding${qs}`);
      }
    } catch {
      router.push(`/onboarding${qs}`);
    }
  }

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

      // Reveal page after first frame is painted
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
  }, [ready]);

  const awaitingCode = emailState.status === "awaiting-code-input";
  const isSending = emailState.status === "sending-code";
  const isSubmitting = emailState.status === "submitting-code";

  function handleSendCode() {
    setError(null);
    sendEmailCode({ email });
  }
  function handleVerifyCode() {
    setError(null);
    loginWithEmailCode({ code });
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
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />
      <div ref={rootRef} className="login-root" data-theme={resolvedTheme === "light" ? "light" : "dark"}>
        <canvas ref={canvasRef} />

        {/* Glass Card Overlay */}
        <div className="ui-overlay">
          <div className="glass-card">
            <div className="card-logo">
              <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
                <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
                <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
              </svg>
              <span>WavCash</span>
            </div>
            <p className="card-subtitle">Your music. Your money. Finally.</p>

            {/* Social Login */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button className="social-btn" onClick={() => initOAuth({ provider: "google" })}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
              <button className="social-btn" onClick={() => initOAuth({ provider: "spotify" })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Continue with Spotify
              </button>
            </div>

            {/* Divider */}
            <div className="divider"><span>or</span></div>

            {/* Email Flow */}
            {!awaitingCode && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label className="input-label">Email address</label>
                  <input
                    className="glass-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && email && handleSendCode()}
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button
                  className="btn-primary"
                  onClick={handleSendCode}
                  disabled={isSending || !email}
                >
                  {isSending ? "Sending code..." : "Send verification code"}
                </button>
              </div>
            )}

            {/* OTP Code */}
            {awaitingCode && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label className="input-label">Verification code</label>
                  <p className="helper-text">
                    Enter the code sent to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
                  </p>
                  <input
                    className="glass-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && code && handleVerifyCode()}
                    autoFocus
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button
                  className="btn-primary"
                  onClick={handleVerifyCode}
                  disabled={isSubmitting || !code}
                >
                  {isSubmitting ? "Verifying..." : "Verify & continue"}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => { setCode(""); setError(null); handleSendCode(); }}
                >
                  Resend code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

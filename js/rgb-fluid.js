/* RGB fluid pointer: an iridescent liquid trail that follows the mouse across the whole screen.
   Adapted to plain WebGL2 from "Three.js RGB Fluids" by Anton Bobrov (MIT licence,
   https://github.com/antonbobrov/threejs-rgb-fluid), keeping its algorithm and default settings:
   - Pointer: eased toward the mouse; its velocity (screen widths/heights per second) drives the fluid.
   - Flow (fixed 165 Hz substeps): each step splats the pointer velocity with an exponential brush, pulls the
     field along itself (advection) with a touch of noise, mixes in a blurred copy (blur pass) for a soft,
     viscous spread, and decays slowly.
   - Look: the field is shown as a near-white liquid tinted with RGB rainbow bands whose phase follows the flow
     direction, as strong as the flow is fast.
   Because it is drawn over the page rather than inside a 3D scene, the liquid sits on a see-through canvas
   blended by "difference": over the navy sections it reads as the pale, iridescent liquid of the original;
   over the cream sections it inverts into dark ink with the same rainbow edge.
   - The normal system cursor stays; the canvas never catches clicks and is hidden from assistive tech.
   - Mouse, trackpad and pen only (nothing on touch screens); nothing with reduced motion; needs WebGL2 with
     float render targets, otherwise nothing is added.
   - The frame loop stops once the pointer has been still long enough for the liquid to have faded. */
(() => {
  'use strict';
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'rgb-fluid';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return;

  // Settings: based on the original's DEFAULT preset, toned down for a content page - a thinner brush, a
  // weaker push, a faster fade and a fainter liquid (MAX_ALPHA caps how opaque it can ever get).
  const S = {
    ease: 0.2,
    radius: 0.017, strength: 0.6, decay: 0.009, advection: 0.007,
    blurStrength: 0.35, blurRadius: 1, noiseStrength: 0.002, noiseScale: 3,
    rgbFrequency: 10, rgbStrength: 0.07, rgbMix: 0.35, liquid: [0.98, 0.985, 1.0],
  };
  const MAX_ALPHA = 0.3;
  const SIM = 256;               // simulation resolution (longest side), the original uses 512
  const STEP_MS = 1000 / 165;    // fixed simulation step
  const MAX_STEPS = 5;
  const IDLE_MS = 9000;          // stop rendering this long after the last pointer move

  const VERT = `#version 300 es
  in vec2 aPos; out vec2 vUv;
  void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  // Blur pass: a small gaussian of the velocity field.
  const BLUR = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 o;
  uniform sampler2D uVel; uniform vec2 uStep;
  void main() {
    vec2 s = uStep;
    vec2 c = texture(uVel, vUv).rg * 4.0;
    c += (texture(uVel, vUv + vec2(s.x, 0)).rg + texture(uVel, vUv - vec2(s.x, 0)).rg
        + texture(uVel, vUv + vec2(0, s.y)).rg + texture(uVel, vUv - vec2(0, s.y)).rg) * 2.0;
    c += texture(uVel, vUv + s).rg + texture(uVel, vUv - s).rg
       + texture(uVel, vUv + vec2(s.x, -s.y)).rg + texture(uVel, vUv + vec2(-s.x, s.y)).rg;
    o = vec4(c / 16.0, 0.0, 1.0);
  }`;

  // Velocity pass: advect, add noise, mix with the blur, decay, splat the pointer.
  const VEL = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 o;
  uniform sampler2D uVel; uniform sampler2D uBlur; uniform sampler2D uNoise;
  uniform vec2 uMouse; uniform vec2 uVelocity; uniform float uAspect; uniform float uFps;
  uniform float uRadius; uniform float uStrength; uniform float uDecay; uniform float uAdvect;
  uniform float uBlurStrength; uniform float uNoiseStrength; uniform float uNoiseScale;
  void main() {
    vec2 ratio = vec2(uAspect, 1.0);
    float dist = distance(vUv * ratio, uMouse * ratio);
    float mask = exp(-dist / uRadius);
    vec2 splat = uVelocity * uStrength * mask;
    vec2 base = texture(uVel, vUv).rg;
    vec2 advectUv = vUv - base * uAdvect * uFps;
    vec2 noise = (texture(uNoise, vUv * ratio * uNoiseScale).rg - 0.5) * uNoiseStrength;
    vec2 uv = advectUv + noise;
    vec2 advected = texture(uVel, uv).rg;
    vec2 blurred = texture(uBlur, uv).rg;
    vec2 mixed = mix(advected, blurred, uBlurStrength) * exp(-uDecay * uFps);
    o = vec4(mixed + splat, 0.0, 1.0);
  }`;

  // Display: the liquid colour with RGB bands, opacity from the flow speed (premultiplied).
  const SHOW = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 o;
  uniform sampler2D uVel; uniform float uFreq; uniform float uRgbStrength; uniform float uRgbMix; uniform vec3 uLiquid;
  uniform float uMaxAlpha;
  vec3 remapSin(vec3 x) { return sin(x) * 0.5 + 0.5; }
  void main() {
    vec2 flow = texture(uVel, vUv).rg;
    vec2 rgbPhase = clamp(flow, -2.0, 2.0) * -0.15;
    float phase = (rgbPhase.x + rgbPhase.y) * uFreq * 3.14159265;
    vec3 rgb = remapSin(vec3(phase, phase + 2.0, phase + 4.0));
    float a = clamp(length(flow) * uRgbStrength, 0.0, uMaxAlpha);
    vec3 liquid = mix(uLiquid, rgb, uRgbMix);
    o = vec4(liquid * a, a);
  }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (frag) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i += 1) { const { name } = gl.getActiveUniform(p, i); u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  let blurProg; let velProg; let showProg;
  try { blurProg = program(BLUR); velProg = program(VEL); showProg = program(SHOW); } catch { return; }

  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const target = (w, h) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  };
  const drop = (t) => { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fb); } };

  // A tiling noise texture (random, smoothed by linear filtering), standing in for the original's noise image.
  const noiseTex = gl.createTexture();
  {
    const N = 128; const data = new Uint8Array(N * N * 4);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < data.length; i += 1) data[i] = Math.round(rnd() * 255);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  let vel = []; let blur = null; let cur = 0;
  let W = 1; let H = 1; let simW = 1; let simH = 1;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const scale = SIM / Math.max(W, H);
    simW = Math.max(16, Math.round(W * scale)); simH = Math.max(16, Math.round(H * scale));
    vel.forEach(drop); drop(blur);
    vel = [target(simW, simH), target(simW, simH)];
    blur = target(Math.round(simW / 2), Math.round(simH / 2));
    cur = 0;
  };

  // Pointer, eased like the original (frame-rate independent damping) and measured in screen sizes per second.
  const ptr = { tx: 0, ty: 0, x: 0, y: 0, vx: 0, vy: 0, active: false, last: 0, lastMove: -1e9 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ptr.tx = e.clientX; ptr.ty = e.clientY;
    if (!ptr.active) { ptr.x = ptr.tx; ptr.y = ptr.ty; ptr.vx = 0; ptr.vy = 0; ptr.active = true; ptr.last = 0; }
    ptr.lastMove = performance.now();
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.active = false; });
  addEventListener('blur', () => { ptr.active = false; });
  addEventListener('resize', () => { resize(); wake(); });

  const step = () => {
    // Blur pass.
    gl.useProgram(blurProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, blur.fb);
    gl.viewport(0, 0, blur.w, blur.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel[cur].tex);
    gl.uniform1i(blurProg.u.uVel, 0);
    gl.uniform2f(blurProg.u.uStep, S.blurRadius / blur.w, (S.blurRadius * (W / H)) / blur.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Velocity pass.
    const next = vel[1 - cur];
    gl.useProgram(velProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fb);
    gl.viewport(0, 0, next.w, next.h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel[cur].tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blur.tex);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    const u = velProg.u;
    gl.uniform1i(u.uVel, 0); gl.uniform1i(u.uBlur, 1); gl.uniform1i(u.uNoise, 2);
    gl.uniform2f(u.uMouse, ptr.x / W, 1 - ptr.y / H);
    gl.uniform2f(u.uVelocity, ptr.active ? ptr.vx / W : 0, ptr.active ? -ptr.vy / H : 0);
    gl.uniform1f(u.uAspect, W / H);
    gl.uniform1f(u.uFps, STEP_MS * (60 / 1000));
    gl.uniform1f(u.uRadius, S.radius);
    gl.uniform1f(u.uStrength, S.strength);
    gl.uniform1f(u.uDecay, S.decay);
    gl.uniform1f(u.uAdvect, S.advection);
    gl.uniform1f(u.uBlurStrength, S.blurStrength);
    gl.uniform1f(u.uNoiseStrength, S.noiseStrength);
    gl.uniform1f(u.uNoiseScale, S.noiseScale);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    cur = 1 - cur;
  };

  let raf = 0; let lastTime = 0; let acc = 0;
  const frame = (now) => {
    raf = 0;
    // Pointer easing and velocity.
    if (ptr.active) {
      if (!ptr.last) { ptr.x = ptr.tx; ptr.y = ptr.ty; ptr.vx = 0; ptr.vy = 0; } else {
        const dt = Math.max(1, now - ptr.last);
        const k = 1 - Math.exp(-S.ease * (dt / (1000 / 60)) * 1.0);
        const px = ptr.x; const py = ptr.y;
        ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
        ptr.vx = (ptr.x - px) / (dt / 1000); ptr.vy = (ptr.y - py) / (dt / 1000);
      }
      ptr.last = now;
    }
    // Fixed-step simulation.
    const dtMs = lastTime ? Math.min(Math.max(now - lastTime, 0), 100) : STEP_MS;
    lastTime = now;
    acc += dtMs;
    let steps = 0;
    while (acc >= STEP_MS && steps < MAX_STEPS) { step(); acc -= STEP_MS; steps += 1; }
    if (steps === MAX_STEPS) acc = 0;
    // Display.
    gl.useProgram(showProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel[cur].tex);
    gl.uniform1i(showProg.u.uVel, 0);
    gl.uniform1f(showProg.u.uFreq, S.rgbFrequency);
    gl.uniform1f(showProg.u.uRgbStrength, S.rgbStrength);
    gl.uniform1f(showProg.u.uRgbMix, S.rgbMix);
    gl.uniform3f(showProg.u.uLiquid, S.liquid[0], S.liquid[1], S.liquid[2]);
    gl.uniform1f(showProg.u.uMaxAlpha, MAX_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!document.hidden && now - ptr.lastMove < IDLE_MS) raf = requestAnimationFrame(frame);
    else { lastTime = 0; acc = 0; }
  };
  const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && performance.now() - ptr.lastMove < IDLE_MS) wake(); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); canvas.remove(); });

  resize();
  if (gl.getError() !== gl.NO_ERROR) return;
  document.body.append(canvas);
})();

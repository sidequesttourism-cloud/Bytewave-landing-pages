/* Chromatic Screen-Paint Distortion (WebGL2 · flowmap · post-process), contained to its section.
   Any element marked [data-flow] gets one: a canvas behind its content that draws the section's background
   scene in WebGL, bent by a low-resolution velocity field (the flowmap) that the pointer stirs up.
   - The scene: data-flow="photo" uses the section's .hero-bg image; data-flow="stars" draws a navy star field
     (seeded, so it is the same on every visit) for sections without a photo.
   - The flowmap lives in a pair of textures updated every frame in turn (ping-pong): the pointer pushes its own
     velocity in, the field carries itself along a little (self-advection), swirls gently and fades.
   - The final pass bends the scene by that field, sampling red, green and blue at slightly different strengths
     of the bend: a soft turbulent wake with restrained chromatic shading.
   - Pointer only (mouse, trackpad, pen); touch does nothing. Decorative: aria-hidden, no pointer events, so the
     section's text, links and focus order are untouched.
   - Reduced motion, no WebGL2, or any GL error: not started, and the section looks as it did without it.
   - Each one only renders while its section is on screen and for a few seconds after the pointer last moved. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const SIM = 160;          // flowmap width in texels (height follows the section's shape)
  const DECAY = 0.955;      // how much of the field survives each frame
  const STRENGTH = 0.032;   // how far the scene is bent at full velocity, in uv
  const IDLE_MS = 3200;     // keep rendering this long after the last pointer move
  const NAVY = [7 / 255, 28 / 255, 45 / 255];

  const VERT = `#version 300 es
  in vec2 aPos; out vec2 vUv;
  void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  // Velocity field update. Velocity is stored around 0.5 so it fits a normal 8-bit texture.
  const FLOW = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 o;
  uniform sampler2D uPrev; uniform vec2 uMouse; uniform vec2 uVel; uniform float uAspect;
  uniform float uRadius; uniform float uDecay; uniform float uTime;
  vec2 read(vec2 uv) { return texture(uPrev, uv).rg * 2.0 - 1.0; }
  void main() {
    vec2 here = read(vUv);
    vec2 v = read(vUv - here * 0.014);                       // carry the wake along itself
    float n = sin(vUv.x * 11.0 + uTime * 0.9) * cos(vUv.y * 9.0 - uTime * 0.7);
    float a = n * 0.12;                                      // gentle swirl, so the wake turns turbulent
    v = mat2(cos(a), -sin(a), sin(a), cos(a)) * v;
    v *= uDecay;
    vec2 d = vUv - uMouse; d.x *= uAspect;
    float f = smoothstep(uRadius, 0.0, length(d));
    v = clamp(v + uVel * f, -1.0, 1.0);
    o = vec4(v * 0.5 + 0.5, 0.0, 1.0);
  }`;

  // Post-process: bend the scene by the field, colour channels at slightly different strengths.
  const SHOW = `#version 300 es
  precision highp float;
  in vec2 vUv; out vec4 o;
  uniform sampler2D uImg; uniform sampler2D uFlow; uniform vec2 uScale; uniform vec2 uOffset;
  uniform float uStrength; uniform vec3 uBg;
  vec4 scene(vec2 uv) { vec4 c = texture(uImg, uv * uScale + uOffset); return vec4(mix(uBg, c.rgb, c.a), 1.0); }
  void main() {
    vec2 v = texture(uFlow, vUv).rg * 2.0 - 1.0;
    vec2 off = v * uStrength;
    float r = scene(vUv - off * 1.18).r;
    float g = scene(vUv - off).g;
    float b = scene(vUv - off * 0.82).b;
    o = vec4(r, g, b, 1.0);
  }`;

  // A seeded star field on navy, sized to the section, drawn into a 2D canvas to use as the scene.
  const starField = (wPx, hPx) => {
    const c = document.createElement('canvas');
    c.width = wPx; c.height = hPx;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(wPx * 0.5, 0, 0, wPx * 0.5, 0, Math.max(wPx, hPx) * 0.9);
    g.addColorStop(0, '#0a2740'); g.addColorStop(0.55, '#071c2d'); g.addColorStop(1, '#051523');
    x.fillStyle = g; x.fillRect(0, 0, wPx, hPx);
    let seed = 23;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const scale = wPx / 1600;
    const count = Math.round((wPx * hPx) / (9000 * scale * scale + 1));
    for (let i = 0; i < count; i += 1) {
      x.fillStyle = `rgba(247, 245, 241, ${(0.15 + rnd() * 0.5).toFixed(2)})`;
      const s = (rnd() < 0.1 ? 2 : 1.2) * Math.max(1, scale * 1.2);
      x.fillRect(rnd() * wPx, rnd() * hPx, s, s);
    }
    return c;
  };

  const setup = (section) => {
    const kind = section.dataset.flow || 'stars';
    const img = kind === 'photo' ? section.querySelector('.hero-bg') : null;
    if (kind === 'photo' && !img) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'flow-fx';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return;

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
    let flowProg; let showProg;
    try { flowProg = program(FLOW); showProg = program(SHOW); } catch { return; }

    // One big triangle covering the canvas.
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const makeTex = (w, h, data) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return t;
    };

    // The flowmap: two textures + framebuffers, swapped every frame.
    let simW = SIM; let simH = 90; let flow = [];
    const makeFlow = () => {
      flow.forEach(({ tex, fb }) => { gl.deleteTexture(tex); gl.deleteFramebuffer(fb); });
      const still = new Uint8Array(simW * simH * 4);
      for (let i = 0; i < still.length; i += 4) { still[i] = 128; still[i + 1] = 128; still[i + 3] = 255; }
      flow = [0, 1].map(() => {
        const tex = makeTex(simW, simH, still);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        return { tex, fb };
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    // The scene texture: the photo once, or a star field redrawn at each size.
    const sceneTex = makeTex(1, 1, new Uint8Array([7, 28, 45, 255]));
    let sceneW = 1; let sceneH = 1;
    const uploadScene = (source, sw, sh) => {
      gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      sceneW = sw; sceneH = sh;
    };

    let w = 1; let h = 1; let ready = false;
    const resize = () => {
      const r = section.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = Math.max(1, Math.round(r.width * dpr)); h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w; canvas.height = h;
      const nh = Math.max(16, Math.round(SIM * (r.height / r.width)));
      if (nh !== simH || !flow.length) { simH = nh; makeFlow(); }
      if (kind === 'stars') uploadScene(starField(w, h), w, h);
    };

    // Pointer → uv position and a smoothed velocity in "field units".
    const mouse = { x: 0.5, y: 0.5, vx: 0, vy: 0, moved: false, last: 0, t: 0 };
    let raf = 0; let onScreen = true; let cur = 0;
    const frame = (now) => {
      raf = 0;
      if (!ready) return;
      // 1. Update the velocity field into the other texture.
      gl.useProgram(flowProg.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, flow[1 - cur].fb);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, flow[cur].tex);
      gl.uniform1i(flowProg.u.uPrev, 0);
      gl.uniform2f(flowProg.u.uMouse, mouse.x, mouse.y);
      const vlen = Math.hypot(mouse.vx, mouse.vy);
      const vs = vlen > 1 ? 1 / vlen : 1;
      gl.uniform2f(flowProg.u.uVel, mouse.moved ? mouse.vx * vs : 0, mouse.moved ? mouse.vy * vs : 0);
      gl.uniform1f(flowProg.u.uAspect, w / h);
      // Brush radius: about 11% of a hero's height; keep it to a sensible size on short or tall sections.
      gl.uniform1f(flowProg.u.uRadius, Math.min(0.45, Math.max(0.05, 95 / (h / Math.min(devicePixelRatio || 1, 1.5)))));
      gl.uniform1f(flowProg.u.uDecay, DECAY);
      gl.uniform1f(flowProg.u.uTime, now / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = 1 - cur;
      mouse.moved = false;
      // 2. Draw the scene bent by the field.
      gl.useProgram(showProg.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sceneTex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, flow[cur].tex);
      gl.uniform1i(showProg.u.uImg, 0);
      gl.uniform1i(showProg.u.uFlow, 1);
      const ca = w / h; const ia = sceneW / sceneH;             // object-fit: cover, centred
      const sx = ca > ia ? 1 : ca / ia; const sy = ca > ia ? ia / ca : 1;
      gl.uniform2f(showProg.u.uScale, sx, sy);
      gl.uniform2f(showProg.u.uOffset, (1 - sx) / 2, (1 - sy) / 2);
      gl.uniform1f(showProg.u.uStrength, STRENGTH);
      gl.uniform3f(showProg.u.uBg, NAVY[0], NAVY[1], NAVY[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (onScreen && !document.hidden && now - mouse.last < IDLE_MS) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && onScreen && ready) raf = requestAnimationFrame(frame); };

    section.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = section.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      const now = performance.now();
      if (mouse.t) {
        const dt = Math.max(8, now - mouse.t);
        const k = (16 / dt) * 22;                   // per-frame speed, scaled into the field's -1..1 range
        mouse.vx = mouse.vx * 0.35 + (x - mouse.x) * k * 0.65;
        mouse.vy = mouse.vy * 0.35 + (y - mouse.y) * k * 0.65;
      }
      mouse.x = x; mouse.y = y; mouse.t = now; mouse.moved = true; mouse.last = now;
      wake();
    }, { passive: true });
    section.addEventListener('pointerleave', () => { mouse.t = 0; mouse.vx = 0; mouse.vy = 0; });

    const start = () => {
      try {
        resize();
        if (kind === 'photo') uploadScene(img, img.naturalWidth, img.naturalHeight);
      } catch { return; }
      if (gl.getError() !== gl.NO_ERROR) return;
      ready = true;
      // Behind everything else in the section: right after the photo, or first in the section.
      if (img) img.after(canvas); else section.prepend(canvas);
      requestAnimationFrame((t) => { mouse.last = t; frame(t); section.classList.add('has-flow'); });
      let rt = 0;
      new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { resize(); mouse.last = performance.now(); wake(); }, 120); }).observe(section);
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) { mouse.last = performance.now(); wake(); } }).observe(section);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); section.classList.remove('has-flow'); ready = false; });
    };
    if (!img || (img.complete && img.naturalWidth)) start(); else img.addEventListener('load', start, { once: true });
  };

  document.querySelectorAll('[data-flow]').forEach(setup);
})();

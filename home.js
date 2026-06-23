/* ============================================================
   MONTANA CAPITAL — HOME hero (2.5D depth parallax)
   The mountain image fills the screen edge-to-edge (cover).
   A procedural depth map drives a real parallax: on pointer
   move ONLY the mountain shifts/pops forward in 3D while the
   night sky stays put. Single full-screen shader quad — very
   light. Render-on-demand. Motion only on interaction.
   ============================================================ */
import * as THREE from 'three';

animateTitle();

const canvas = document.getElementById('scene');
if (canvas) boot();

/* ---- HERO title: staggered letter-by-letter reveal ----
   Splits the headline into per-letter spans while keeping whole
   words intact (so responsive line-wrapping still works) and the
   gradient <em> word as a single continuous-gradient unit.        */
function animateTitle() {
  const title = document.querySelector('.portal__title');
  if (!title) return;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
    || location.search.includes('noanim');

  const segments = [];
  title.childNodes.forEach(node => {
    if (node.nodeType === 3) segments.push({ text: node.textContent, grad: false });
    else if (node.nodeName === 'EM') segments.push({ text: node.textContent, grad: true });
  });

  title.textContent = '';
  const BASE = 0.25, STEP = 0.038;
  let i = 0;

  segments.forEach(seg => {
    if (seg.grad) {
      const w = document.createElement('span'); w.className = 'word grad';
      const s = document.createElement('span'); s.className = 'ch';
      s.textContent = seg.text;
      if (!reduce) s.style.animationDelay = (BASE + i * STEP) + 's';
      i += seg.text.length;
      w.appendChild(s); title.appendChild(w);
      return;
    }
    seg.text.split(/(\s+)/).forEach(tok => {
      if (tok === '') return;
      if (/^\s+$/.test(tok)) { title.appendChild(document.createTextNode(tok)); return; }
      const w = document.createElement('span'); w.className = 'word';
      for (const ch of tok) {
        const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch;
        if (!reduce) s.style.animationDelay = (BASE + i * STEP) + 's';
        i++; w.appendChild(s);
      }
      title.appendChild(w);
    });
  });

  if (reduce) title.classList.add('no-anim');
  title.style.opacity = '1';
}

function boot() {
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const DEBUG = location.search.includes('debug=depth');
  const W = () => window.innerWidth, H = () => Math.max(window.innerHeight, 600);
  const IMG_A = 1536 / 1024;  // hero_ref.png aspect

  /* ---- procedural depth map: bright = mountain (near), dark = sky (far) ---- */
  function buildDepth() {
    const dw = 240, dh = 160, c = document.createElement('canvas');
    c.width = dw; c.height = dh;
    const g = c.getContext('2d'), im = g.createImageData(dw, dh), d = im.data;
    const cx = 0.5, cy = 0.46;
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const u = x / dw, v = y / dh;          // v=0 top, v=1 bottom
        const vert = v;                         // base of mountain (bottom) is nearest
        const dx = (u - cx) * 1.18, dy = (v - cy) * 1.05;
        const r = Math.sqrt(dx * dx + dy * dy);
        const radial = Math.max(0, 1 - r / 0.60);
        const tri = v > 0.05 ? Math.max(0, 1 - Math.abs(u - 0.5) / Math.max(0.08, v * 0.9)) : 0;
        let depth = 0.30 * vert + 0.62 * radial + 0.18 * tri;
        depth = Math.max(0, Math.min(1, depth));
        const i = (y * dw + x) * 4, val = depth * 255;
        d[i] = d[i + 1] = d[i + 2] = val; d[i + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
    // soft blur so parallax is smooth, no banding
    g.globalAlpha = 0.5;
    for (let k = 0; k < 6; k++) { g.filter = 'blur(3px)'; g.drawImage(c, 0, 0); }
    g.filter = 'none'; g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();   // fullscreen-quad trick: no projection needed

  const map = new THREE.TextureLoader().load('assets/hero_ref.png', () => wake());
  map.colorSpace = THREE.SRGBColorSpace;
  map.minFilter = THREE.LinearFilter; map.magFilter = THREE.LinearFilter;
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const depth = buildDepth();

  const uniforms = {
    uMap:     { value: map },
    uDepth:   { value: depth },
    uMouse:   { value: new THREE.Vector2(0, 0) },
    uImgA:    { value: IMG_A },
    uScrA:    { value: W() / H() },
    uStrength:{ value: 0.045 },   // max parallax shift (uv units)
    uPop:     { value: 0.05 },    // depth-based zoom toward cursor
    uDebug:   { value: DEBUG ? 1 : 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uMap, uDepth;
      uniform vec2  uMouse;
      uniform float uImgA, uScrA, uStrength, uPop, uDebug;

      vec2 coverUV(vec2 uv){
        // fill the screen edge-to-edge (cover), keep image aspect
        vec2 s = (uScrA > uImgA) ? vec2(1.0, uImgA/uScrA) : vec2(uScrA/uImgA, 1.0);
        s *= 0.92;                       // overscan → headroom for parallax
        return (uv - 0.5) * s + 0.5;
      }
      void main(){
        vec2 cuv = coverUV(vUv);
        float d  = texture2D(uDepth, cuv).r;
        float mag = length(uMouse);

        // parallax: near (mountain) shifts, far (sky) stays
        vec2 disp = -uMouse * d * uStrength;
        vec2 suv  = cuv + disp;
        // depth-based pop: the mountain grows slightly toward the cursor
        suv = (suv - 0.5) * (1.0 - d * uPop * mag) + 0.5;

        vec3 col = texture2D(uMap, suv).rgb;

        if (uDebug > 0.5) { gl_FragColor = vec4(vec3(d), 1.0); return; }

        // gentle dimensionality: lift the near mass, sink the far sky
        col *= mix(0.90, 1.10, d);
        // soft cinematic vignette
        float vig = smoothstep(1.25, 0.35, length(vUv - 0.5));
        col *= mix(0.70, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  /* ---- interaction-only eased parallax ---- */
  const m = { tx: 0, ty: 0, cx: 0, cy: 0 };
  let running = true, idle = 0;
  // QA hook: ?mx=..&my=.. presets the parallax target (range -1..1)
  const qp = new URLSearchParams(location.search);
  if (qp.has('mx')) m.tx = parseFloat(qp.get('mx')) || 0;
  if (qp.has('my')) m.ty = parseFloat(qp.get('my')) || 0;

  function frame() {
    if (running) {
      m.cx += (m.tx - m.cx) * 0.06;
      m.cy += (m.ty - m.cy) * 0.06;
      uniforms.uMouse.value.set(m.cx, m.cy);
      renderer.render(scene, camera);
      const settled = Math.abs(m.tx - m.cx) < 4e-4 && Math.abs(m.ty - m.cy) < 4e-4;
      if (settled) { if (++idle > 8) running = false; } else idle = 0;
    }
    requestAnimationFrame(frame);
  }
  function wake() { idle = 0; running = true; }

  window.addEventListener('pointermove', e => {
    m.tx = (e.clientX / innerWidth) * 2 - 1;
    m.ty = (e.clientY / innerHeight) * 2 - 1;
    wake();
  }, { passive: true });
  window.addEventListener('pointerleave', () => { m.tx = 0; m.ty = 0; wake(); });
  window.addEventListener('blur', () => { m.tx = 0; m.ty = 0; wake(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  window.addEventListener('resize', () => {
    renderer.setSize(W(), H());
    uniforms.uScrA.value = W() / H();
    wake();
  });

  /* ---- start ---- */
  renderer.render(scene, camera);
  if (!reduce) requestAnimationFrame(frame);
}

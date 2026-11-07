/* =========================================================
   WebCraft Studio — Viaje 3D por la galaxia (Fase 1)
   El scroll mueve la cámara: galaxia desde fuera → entrada en un brazo
   → cinturón de rocas volcánicas (diapositiva) → el Sol con 4 planetas
   (servicios) → órbita lenta durante el resto de la web.

   Fuente: src/journey.js → se empaqueta en js/journey.js con:
   npx esbuild src/journey.js --bundle --minify --format=esm --outfile=js/journey.js
   ========================================================= */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, BufferGeometry, BufferAttribute, Points, ShaderMaterial,
  AdditiveBlending, Group, Vector3, CatmullRomCurve3, IcosahedronGeometry, MeshStandardMaterial, InstancedMesh,
  Object3D, Matrix4, Quaternion, Euler, TextureLoader, SRGBColorSpace, RepeatWrapping, PointLight, AmbientLight,
  SphereGeometry, MeshBasicMaterial, Mesh, Sprite, SpriteMaterial, CanvasTexture, RingGeometry, DoubleSide,
  LineLoop, LineBasicMaterial, MathUtils, Timer, HemisphereLight, DirectionalLight
} from "three";

const root = document.documentElement;
const canvas = document.getElementById("journey-canvas");

if (root.classList.contains("has-3d") && canvas) {
  try { init(); } catch (e) {
    // Si algo falla, volvemos a la versión 2D sin romper la página
    console.warn("Viaje 3D desactivado:", e);
    root.classList.remove("has-3d");
  }
}

function init() {
  const mobile = window.innerWidth <= 640;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
  renderer.setClearColor(0x05070f, 1);
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(mobile ? 62 : 52, 1, 0.01, 2000);

  const rand = (a, b) => a + Math.random() * (b - a);
  const smooth = (e0, e1, x) => { const t = MathUtils.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------------------------------------------------------
     Texturas auxiliares (canvas)
     --------------------------------------------------------- */
  function glowTexture(stops) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }
  function bandTexture(colors, seed) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d");
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < 256;) { const h = 4 + r() * 22; x.fillStyle = colors[(r() * colors.length) | 0]; x.fillRect(0, y, 512, h + 1); y += h; }
    for (let i = 0; i < 900; i++) { x.fillStyle = colors[(r() * colors.length) | 0]; x.globalAlpha = 0.25; x.fillRect(r() * 512, r() * 256, 10 + r() * 60, 1 + r() * 3); }
    x.globalAlpha = 1;
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }

  /* ---------------------------------------------------------
     Galaxia espiral (partículas con shader)
     --------------------------------------------------------- */
  const G = { count: mobile ? 22000 : 65000, radius: 100, arms: 3, spin: 0.052, rnd: 0.32, power: 2.6 };
  const galaxy = new Group(); scene.add(galaxy);
  let galaxyMat;
  galaxy.rotation.y = 0.4;

  // Punto del brazo donde está "nuestro" sistema solar
  const PR = 46, armAngle = 0;
  const P = new Vector3(Math.cos(armAngle + PR * G.spin) * PR, 0, Math.sin(armAngle + PR * G.spin) * PR);
  const n = P.clone().normalize();               // del centro hacia el sistema
  const up = new Vector3(0, 1, 0);
  const tang = new Vector3().crossVectors(up, n).normalize();

  {
    const N = G.count + (mobile ? 5000 : 14000);
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    const inner = new Color("#FFF1E6"), outer = new Color("#6E8CFF"), cyan = new Color("#22D3EE"), lilac = new Color("#A78BFA");
    const tmp = new Color();
    let i = 0;
    while (i < N) {
      let x, y, z, r;
      if (i < G.count) {
        r = Math.pow(Math.random(), 1.25) * G.radius;
        const arm = (i % G.arms) / G.arms * Math.PI * 2;
        const a = arm + r * G.spin;
        const spread = G.rnd * (0.35 + r / G.radius);
        const rx = Math.pow(Math.random(), G.power) * (Math.random() < 0.5 ? 1 : -1) * spread * r * 0.55;
        const rz = Math.pow(Math.random(), G.power) * (Math.random() < 0.5 ? 1 : -1) * spread * r * 0.55;
        const ry = Math.pow(Math.random(), G.power) * (Math.random() < 0.5 ? 1 : -1) * (5 - 3.5 * r / G.radius);
        x = Math.cos(a) * r + rx; y = ry; z = Math.sin(a) * r + rz;
      } else { // bulbo central
        r = Math.abs(randn()) * 11;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * 0.55; z = r * Math.sin(ph) * Math.sin(th);
      }
      // burbuja vacía alrededor del sistema solar
      const dx = x - P.x, dy = y - P.y, dz = z - P.z;
      if (dx * dx + dy * dy + dz * dz < 64) continue;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      tmp.copy(inner).lerp(outer, Math.min(1, Math.hypot(x, z) / G.radius * 1.15));
      const t = Math.random(); if (t < 0.06) tmp.lerp(cyan, 0.7); else if (t < 0.11) tmp.lerp(lilac, 0.7);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      size[i] = Math.random() < 0.03 ? rand(2.2, 3.4) : rand(0.6, 1.6);
      i++;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("color", new BufferAttribute(col, 3));
    geo.setAttribute("aSize", new BufferAttribute(size, 1));
    galaxyMat = starMaterial(1); galaxy.add(new Points(geo, galaxyMat));

    // núcleo brillante
    const core = new Sprite(new SpriteMaterial({ map: glowTexture([[0, "rgba(255,240,230,0.9)"], [0.2, "rgba(255,220,200,0.35)"], [0.55, "rgba(140,120,255,0.08)"], [1, "rgba(0,0,0,0)"]]), blending: AdditiveBlending, depthWrite: false, transparent: true }));
    core.scale.set(70, 70, 1); galaxy.add(core); galaxy.userData.core = core;
  }

  function starMaterial(scale) {
    return new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, vertexColors: true,
      uniforms: { uPx: { value: renderer.getPixelRatio() * scale }, uFade: { value: 1 }, uTime: { value: 0 } },
      vertexShader: `
        attribute float aSize; uniform float uPx; uniform float uTime; varying vec3 vColor; varying float vA;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          float s = aSize * uPx * 260.0 / max(d, 0.001);
          gl_PointSize = clamp(s, 0.9, 4.5 * uPx);
          float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aSize) + position.x * 13.0);
          vA = smoothstep(0.6, 14.0, d) * tw;
          vColor = color;
        }`,
      fragmentShader: `
        uniform float uFade; varying vec3 vColor; varying float vA;
        void main(){
          float r = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, r); a *= a;
          gl_FragColor = vec4(vColor, a * vA * uFade);
        }`
    });
  }
  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // Estrellas lejanas fuera de la galaxia
  {
    const N = mobile ? 1800 : 4000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = rand(500, 900);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph); pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = Math.random() < 0.1 ? [0.55, 0.85, 0.95] : [0.85, 0.88, 1]; col.set(c, i * 3); size[i] = rand(0.8, 2.2) * 2.6;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3)); geo.setAttribute("color", new BufferAttribute(col, 3)); geo.setAttribute("aSize", new BufferAttribute(size, 1));
    scene.add(new Points(geo, starMaterial(1)));
  }

  /* ---------------------------------------------------------
     Sistema solar (hijo de la galaxia, en el punto P)
     --------------------------------------------------------- */
  const system = new Group(); system.position.copy(P); galaxy.add(system);
  const loader = new TextureLoader();
  const rockTex = loader.load("assets/textures/roca.webp"); rockTex.colorSpace = SRGBColorSpace; rockTex.wrapS = rockTex.wrapT = RepeatWrapping;

  // Sol: blanco caliente con corona celeste y halo lila
  const sun = new Mesh(new SphereGeometry(0.42, 48, 32), new MeshBasicMaterial({ color: 0xfff6ea }));
  system.add(sun);
  const corona = new Sprite(new SpriteMaterial({ map: glowTexture([[0, "rgba(255,255,255,1)"], [0.12, "rgba(230,250,255,0.9)"], [0.3, "rgba(34,211,238,0.35)"], [0.6, "rgba(167,139,250,0.1)"], [1, "rgba(0,0,0,0)"]]), blending: AdditiveBlending, depthWrite: false, transparent: true }));
  corona.scale.set(3.4, 3.4, 1); system.add(corona);
  const halo = new Sprite(new SpriteMaterial({ map: glowTexture([[0, "rgba(167,139,250,0.25)"], [0.4, "rgba(34,211,238,0.06)"], [1, "rgba(0,0,0,0)"]]), blending: AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(11, 11, 1); system.add(halo);

  const light = new PointLight(0xfff1e4, 3.2, 0, 0); system.add(light);
  scene.add(new AmbientLight(0x2a3560, 0.55));
  scene.add(new HemisphereLight(0x6fa8ff, 0x0b0a12, 0.25));
  // luz suave desde la cámara para que las rocas no se vean negras a contraluz
  const camLight = new DirectionalLight(0xc8dcff, 1.9), camTarget = new Object3D();
  camTarget.position.set(0, 0, -1); camera.add(camTarget); camLight.position.set(0.4, 0.5, 0.2); camLight.target = camTarget;
  camera.add(camLight); scene.add(camera);

  // 4 planetas = 4 servicios
  const planetDefs = [
    { r: 1.35, size: 0.14, speed: 0.22, mat: () => new MeshStandardMaterial({ map: rockTex, color: 0x9a9aa0, roughness: 1 }) },                       // Diseño (volcánico)
    { r: 1.95, size: 0.19, speed: 0.16, mat: () => new MeshStandardMaterial({ map: bandTexture(["#0E3A4A", "#14627A", "#1C8FA8", "#7FD9EA", "#0B2A38"], 7), roughness: 0.8 }) }, // Desarrollo (océano)
    { r: 2.6, size: 0.27, speed: 0.11, mat: () => new MeshStandardMaterial({ map: bandTexture(["#241E4A", "#3A3478", "#5B4BA8", "#8C7AD6", "#1A1838"], 19), roughness: 0.9 }), ring: true }, // Puesta en marcha (gaseoso)
    { r: 3.25, size: 0.12, speed: 0.08, mat: () => new MeshStandardMaterial({ map: rockTex, color: 0xb9c4d6, roughness: 1 }) }                         // Mantenimiento (luna helada)
  ];
  const planets = planetDefs.map((d, i) => {
    const pivot = new Group(); system.add(pivot);
    const m = new Mesh(new SphereGeometry(d.size, 40, 28), d.mat()); m.position.set(d.r, 0, 0); pivot.add(m);
    if (d.ring) {
      const ring = new Mesh(new RingGeometry(d.size * 1.45, d.size * 2.3, 64), new MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.35, side: DoubleSide, depthWrite: false }));
      ring.rotation.x = Math.PI / 2.3; m.add(ring);
    }
    // órbita
    const pts = []; for (let k = 0; k <= 128; k++) { const a = k / 128 * Math.PI * 2; pts.push(new Vector3(Math.cos(a) * d.r, 0, Math.sin(a) * d.r)); }
    const orbit = new LineLoop(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.1 }));
    system.add(orbit);
    // anillo de "activo" (cuando su servicio está en pantalla)
    const mark = new Sprite(new SpriteMaterial({ map: glowTexture([[0, "rgba(0,0,0,0)"], [0.62, "rgba(0,0,0,0)"], [0.7, "rgba(34,211,238,0.9)"], [0.76, "rgba(34,211,238,0.15)"], [1, "rgba(0,0,0,0)"]]), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    mark.scale.set(d.size * 4.2, d.size * 4.2, 1); m.add(mark);
    pivot.rotation.y = i * 1.7 + 0.6;
    return { pivot, mesh: m, def: d, mark, orbit };
  });

  /* ---------------------------------------------------------
     Cinturón de rocas volcánicas (asteroides instanciados)
     --------------------------------------------------------- */
  function rockGeometry(seed) {
    const g = new IcosahedronGeometry(1, 4); const p = g.attributes.position; const v = new Vector3();
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const bumps = Array.from({ length: 7 }, () => [new Vector3(r() - .5, r() - .5, r() - .5).normalize(), r() * 0.35 + 0.1]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let k = 1; for (const [d, a] of bumps) k += a * Math.pow(Math.max(0, v.dot(d)), 3) * (r() < .5 ? -1 : 1) * 0.6;
      k += (r() - 0.5) * 0.06;
      v.multiplyScalar(k); v.y *= 0.78; p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals(); return g;
  }
  const rockMat = new MeshStandardMaterial({ map: rockTex, color: 0xd2d4dc, roughness: 0.92, metalness: 0.06, emissive: 0x1c1f28 });
  const BELT_R = 7.4, beltCount = mobile ? 110 : 260;
  const belts = [rockGeometry(11), rockGeometry(29), rockGeometry(53)].map(g => new InstancedMesh(g, rockMat, Math.ceil(beltCount / 3)));
  const beltData = [];
  const dummy = new Object3D();
  belts.forEach((mesh, b) => {
    for (let i = 0; i < mesh.count; i++) {
      const a = Math.random() * Math.PI * 2, r = BELT_R + randn() * 0.45, y = randn() * 0.18;
      const sc = Math.random() < 0.06 ? rand(0.09, 0.16) : rand(0.015, 0.06);
      beltData.push({ mesh, i, a, r, y, sc, rot: new Euler(rand(0, 6), rand(0, 6), rand(0, 6)), spin: rand(-0.4, 0.4), speed: 0.03 / Math.sqrt(r) });
    }
    system.add(mesh);
  });
  // Rocas "protagonistas" alrededor de la diapositiva (grandes y cerca de la cámara)
  const heroRocks = [];
  const beltCam = P.clone().add(n.clone().multiplyScalar(BELT_R + 1.6)).add(new Vector3(0, 0.35, 0));
  [[-1.25, 0.45, 0.32], [1.3, -0.4, 0.26], [-1.05, -0.55, 0.18], [1.1, 0.6, 0.15], [0.2, -0.85, 0.12], [-0.4, 0.82, 0.1]].forEach(([sx, sy, s], k) => {
    const m = new Mesh(rockGeometry(101 + k * 7), rockMat); m.scale.setScalar(s * (mobile ? 0.8 : 1));
    m.userData = { sx, sy, spin: new Vector3(rand(-.3, .3), rand(-.3, .3), rand(-.2, .2)) };
    scene.add(m); heroRocks.push(m);
  });

  /* ---------------------------------------------------------
     Ruta de la cámara (en coordenadas de la galaxia)
     t: 0 galaxia · .5 cinturón · .58 sale del cinturón · .8 el Sol · 1 órbita
     --------------------------------------------------------- */
  const right = new Vector3().crossVectors(n.clone().negate(), up).normalize(); // derecha de la pantalla mirando al Sol
  const K = (t, pos, look) => ({ t, pos, look });
  const keys = [
    K(0, new Vector3(0, mobile ? 175 : 120, mobile ? 245 : 170), mobile ? new Vector3(-10, 62, 10) : new Vector3(-98, -22, 18)),
    K(0.08, new Vector3(P.x * 0.2, mobile ? 135 : 100, (mobile ? 190 : 140)), mobile ? new Vector3(P.x * 0.3, 20, P.z * 0.3) : new Vector3(P.x * 0.3 - 30, -6, P.z * 0.3)),
    K(0.26, P.clone().add(n.clone().multiplyScalar(26)).add(new Vector3(0, 30, 0)), P.clone()),
    K(0.4, P.clone().add(n.clone().multiplyScalar(11)).add(tang.clone().multiplyScalar(3)).add(new Vector3(0, 4.5, 0)), P.clone().add(n.clone().multiplyScalar(3))),
    K(0.5, beltCam.clone(), P.clone().add(n.clone().multiplyScalar(BELT_R - 0.6)).add(new Vector3(0, 0.25, 0))),
    K(0.58, beltCam.clone().add(n.clone().multiplyScalar(-0.9)).add(tang.clone().multiplyScalar(0.5)), P.clone().add(n.clone().multiplyScalar(BELT_R - 1.8))),
    K(0.8, P.clone().add(n.clone().multiplyScalar(mobile ? 6.4 : 5.6)).add(new Vector3(0, mobile ? 3.2 : 1.5, 0)),
      mobile ? P.clone().add(right.clone().multiplyScalar(-1.25)).add(new Vector3(0, -2.9, 0)) : P.clone().add(right.clone().multiplyScalar(-2.9))),
    K(1, P.clone().add(n.clone().applyAxisAngle(up, 0.9).multiplyScalar(mobile ? 6.8 : 5.8)).add(new Vector3(0, mobile ? 3.4 : 2.2, 0)),
      mobile ? P.clone().add(right.clone().applyAxisAngle(up, 0.9).multiplyScalar(-1.25)).add(new Vector3(0, -2.9, 0)) : P.clone().add(right.clone().applyAxisAngle(up, 0.9).multiplyScalar(-3)))
  ];
  const posCurve = new CatmullRomCurve3(keys.map(k => k.pos), false, "centripetal");
  const lookCurve = new CatmullRomCurve3(keys.map(k => k.look), false, "centripetal");
  function curveU(t) { // t (0..1 por paradas) → u (0..1 a lo largo de la curva)
    for (let i = 0; i < keys.length - 1; i++) {
      if (t <= keys[i + 1].t) { const f = (t - keys[i].t) / (keys[i + 1].t - keys[i].t); return (i + smooth(0, 1, f)) / (keys.length - 1); }
    }
    return 1;
  }

  /* ---------------------------------------------------------
     Scroll → t (las paradas se ajustan a la posición real de cada sección)
     --------------------------------------------------------- */
  let anchors = [];
  function top(sel) { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : 0; }
  function computeAnchors() {
    const vh = window.innerHeight, end = Math.max(1, document.documentElement.scrollHeight - vh);
    let pinStart = top("#animacion") - vh * 0.2, pinEnd = pinStart + vh;
    const ST = window.ScrollTrigger;
    if (ST) { const pin = ST.getAll().find(s => s.pin && s.trigger && s.trigger.closest && s.trigger.closest("#animacion")); if (pin) { pinStart = pin.start; pinEnd = pin.end; } }
    const heroEnd = top("#animacion") - vh * 0.85;
    const serv = top("#servicios") - vh * 0.15;
    anchors = [[0, 0], [Math.max(1, heroEnd * 0.55), 0.04], [pinStart, 0.5], [pinEnd, 0.58], [serv, 0.8], [end, 1]]
      .sort((a, b) => a[0] - b[0]);
  }
  function scrollToT(y) {
    if (y <= anchors[0][0]) return anchors[0][1];
    for (let i = 0; i < anchors.length - 1; i++) {
      const [y0, t0] = anchors[i], [y1, t1] = anchors[i + 1];
      if (y <= y1) return t0 + (t1 - t0) * ((y - y0) / Math.max(1, y1 - y0));
    }
    return 1;
  }

  // Servicio activo → su planeta se marca
  let activePlanet = -1;
  const rows = Array.from(document.querySelectorAll(".service"));
  if (rows.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) activePlanet = rows.indexOf(e.target); }), { rootMargin: "-45% 0px -45% 0px" });
    rows.forEach(r => io.observe(r));
  }

  /* ---------------------------------------------------------
     Bucle
     --------------------------------------------------------- */
  let tCur = 0, galaxySpin = 0;
  const clock = new Timer();
  const tmpV = new Vector3(), lookW = new Vector3(), camLocal = new Vector3(), q = new Quaternion(), m4 = new Matrix4();

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    computeAnchors();
  }
  window.addEventListener("resize", resize);
  if (window.ScrollTrigger) window.ScrollTrigger.addEventListener("refresh", computeAnchors);
  window.addEventListener("load", computeAnchors);
  resize();
  tCur = scrollToT(window.scrollY);

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    clock.update(); const dt = Math.min(clock.getDelta(), 0.05), time = clock.getElapsed();

    const target = scrollToT(window.scrollY);
    tCur += (target - tCur) * Math.min(1, dt * 3.2);

    // La galaxia gira despacio solo mientras la ves desde fuera
    galaxySpin += dt * 0.025 * (1 - smooth(0.02, 0.2, tCur));
    galaxy.rotation.y = 0.4 + galaxySpin;
    galaxy.updateMatrixWorld();

    // Cámara: la clave 0 es fija en el mundo; el resto viaja con la galaxia
    const u = curveU(tCur);
    posCurve.getPoint(u, camLocal); lookCurve.getPoint(u, lookW);
    const w0 = 1 - smooth(0, 0.08, tCur); // mezcla mundo/galaxia al principio
    tmpV.copy(camLocal).applyMatrix4(galaxy.matrixWorld);
    camera.position.copy(camLocal).lerp(tmpV, 1 - w0);
    tmpV.copy(lookW).applyMatrix4(galaxy.matrixWorld);
    lookW.lerp(tmpV, 1 - w0);
    camera.lookAt(lookW);

    // Núcleo de la galaxia: se apaga al entrar
    galaxy.userData.core.material.opacity = 1 - smooth(0.15, 0.4, tCur);
    galaxyMat.uniforms.uFade.value = 1 - 0.5 * smooth(0.3, 0.55, tCur);

    // Sol
    const pulse = 1 + Math.sin(time * 1.3) * 0.03;
    corona.scale.setScalar(3.4 * pulse); halo.scale.setScalar(9 * (2 - pulse));
    sun.visible = corona.visible = halo.visible = tCur > 0.18;
    light.intensity = 3.2 * smooth(0.2, 0.45, tCur);

    // Planetas
    planets.forEach((p, i) => {
      p.pivot.rotation.y += dt * p.def.speed * 0.25;
      p.mesh.rotation.y += dt * 0.3;
      const on = i === activePlanet && tCur > 0.7 ? 1 : 0;
      p.mark.material.opacity += (on - p.mark.material.opacity) * Math.min(1, dt * 5);
      p.orbit.material.opacity = 0.06 + 0.12 * smooth(0.6, 0.8, tCur) + on * 0.15;
    });

    // Cinturón
    for (const b of beltData) {
      b.a += b.speed * dt * 0.4;
      b.rot.x += b.spin * dt; b.rot.y += b.spin * dt * 0.7;
      dummy.position.set(Math.cos(b.a) * b.r, b.y, Math.sin(b.a) * b.r);
      dummy.rotation.copy(b.rot); dummy.scale.setScalar(b.sc); dummy.updateMatrix();
      b.mesh.setMatrixAt(b.i, dummy.matrix);
    }
    belts.forEach(m => { m.instanceMatrix.needsUpdate = true; });

    // Rocas protagonistas: se colocan alrededor del encuadre durante la diapositiva
    const showRocks = smooth(0.38, 0.47, tCur) * (1 - smooth(0.62, 0.72, tCur));
    const fwd = new Vector3(); camera.getWorldDirection(fwd);
    const camRight = new Vector3().crossVectors(fwd, camera.up).normalize();
    const camUp = new Vector3().crossVectors(camRight, fwd).normalize();
    const spread = mobile ? 0.62 : 1;
    heroRocks.forEach((r, k) => {
      r.visible = showRocks > 0.01;
      if (!r.visible) return;
      const d = 2.2 + k * 0.12;
      r.position.copy(camera.position).addScaledVector(fwd, d)
        .addScaledVector(camRight, r.userData.sx * d * 0.62 * spread * (1.25 - 0.25 * showRocks))
        .addScaledVector(camUp, r.userData.sy * d * 0.42 * (mobile ? 1.5 : 1) + Math.sin(time * 0.6 + k) * 0.03);
      r.rotation.x += r.userData.spin.x * dt; r.rotation.y += r.userData.spin.y * dt; r.rotation.z += r.userData.spin.z * dt;
      r.scale.setScalar(r.userData.base || (r.userData.base = r.scale.x));
      r.scale.multiplyScalar(0.3 + 0.7 * showRocks);
    });

    scene.traverse(o => { if (o.material && o.material.uniforms && o.material.uniforms.uTime) o.material.uniforms.uTime.value = time; });
    renderer.render(scene, camera);
  }
  frame();
  root.classList.add("journey-ready");
  window.__journey = { camera, sun, get t() { return tCur; }, anchors: () => anchors, P, galaxy };
}

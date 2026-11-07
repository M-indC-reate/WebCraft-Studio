/* =========================================================
   WebCraft Studio — Viaje espacial
   · Galaxia fija que se recorre (y se acerca) al bajar
   · Estrellas con zoom: al bajar se abren hacia fuera (zoom in),
     al subir vuelven hacia el centro (zoom out)
   · Estrellas fugaces con distintas perspectivas y estelas
   · Estrellas que caen sobre las palabras destacadas y las escriben
   · Planetas y rocas volcánicas que pasan junto a ti entre secciones
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("space-canvas");
  var galaxy = document.getElementById("space-galaxy");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slow = (function () {
    var c = navigator.connection || {};
    return !!(c.saveData || /(^|-)2g/.test(c.effectiveType || "") ||
      (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  })();
  var still = reduced || slow;
  // En el viaje 3D, este lienzo solo pinta las estrellas fugaces (el resto lo hace WebGL)
  var mode3d = document.documentElement.classList.contains("has-3d");

  var W = 0, H = 0, dpr = 1, mobile = false, lastW = 0, lastH = 0;
  var scrollY = window.scrollY, prevScroll = scrollY, scrollVel = 0;
  var stars = [], shooters = [], sparks = [], rocks = [], bodies = [];
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var CYAN = "34,211,238", LILAC = "167,139,250", WHITE = "236,242,255";

  function img(src) { var im = new Image(); im.decoding = "async"; im.src = src; im.onload = function () { buildBodies(); if (still) draw(0); }; return im; }
  var rockTex = img("assets/textures/roca.webp");
  var rockImgs = [1, 2, 3, 4].map(function (n) { return img("assets/space/roca-" + n + ".webp"); });

  /* =======================================================
     Estrellas en coordenadas polares: el scroll hace zoom
     ======================================================= */
  function makeStars() {
    if (mode3d) { stars = []; return; }
    var n = Math.round(W * H / (mobile ? 3400 : 2400));
    stars = [];
    for (var i = 0; i < n; i++) stars.push(newStar(rand(0.02, 1.25)));
  }
  function newStar(dist) {
    var t = Math.random();
    return {
      ang: Math.random() * 6.283, dist: dist, depth: rand(0.4, 1.6),
      r: Math.random() < 0.06 ? rand(1.1, 1.6) : rand(0.3, 1), a: rand(0.35, 0.95),
      sp: rand(0.4, 1.8), ph: Math.random() * 6.28,
      col: t < 0.08 ? CYAN : t < 0.14 ? LILAC : WHITE
    };
  }
  function zoomStars(dy) {
    // dy > 0 (bajar) → las estrellas se alejan del centro: avanzamos hacia ellas
    var k = dy * 0.00055;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.dist *= Math.exp(k * s.depth);
      if (s.dist > 1.3) { stars[i] = newStar(rand(0.01, 0.12)); }
      else if (s.dist < 0.008) { stars[i] = newStar(rand(0.95, 1.25)); }
    }
  }

  /* =======================================================
     Planetas y cuerpos (prerenderizados una vez)
     ======================================================= */
  function off(size, fn) { var c = document.createElement("canvas"); c.width = c.height = size; fn(c.getContext("2d"), size); return c; }

  function shade(x, S, rim) {
    // terminador: luz fría arriba-izquierda, sombra abajo-derecha + atmósfera
    var g = x.createRadialGradient(S * 0.36, S * 0.34, S * 0.05, S * 0.5, S * 0.5, S * 0.5);
    g.addColorStop(0, "rgba(255,255,255,0.06)"); g.addColorStop(0.55, "rgba(0,0,0,0.15)"); g.addColorStop(1, "rgba(0,0,0,0.88)");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.restore();
    if (rim) {
      x.save(); x.shadowColor = "rgba(" + rim + ",0.9)"; x.shadowBlur = S * 0.05;
      x.strokeStyle = "rgba(" + rim + ",0.55)"; x.lineWidth = S * 0.008;
      x.beginPath(); x.arc(S / 2, S / 2, S * 0.4, Math.PI * 0.75, Math.PI * 1.7); x.stroke(); x.restore();
    }
  }

  function buildBodies() {
    if (mode3d) return;
    if (!rockTex.complete || !rockTex.naturalWidth) return;
    var S = 520;

    var volcanic = off(S, function (x) {
      x.save(); x.beginPath(); x.arc(S / 2, S / 2, S * 0.4, 0, 6.283); x.clip();
      x.drawImage(rockTex, 0, 0, 1024, 1024, 0, 0, S * 1.1, S * 1.1);
      shade(x, S, CYAN);
    });

    var giant = off(S, function (x) {
      var c = S / 2, R = S * 0.3;
      function ring(front) {
        x.save(); x.translate(c, c); x.rotate(-0.38); x.scale(1, 0.28);
        x.beginPath(); x.arc(0, 0, R * 1.75, front ? 0 : Math.PI, front ? Math.PI : 6.283);
        x.lineWidth = R * 0.32; x.strokeStyle = "rgba(167,139,250,0.28)"; x.stroke();
        x.lineWidth = R * 0.06; x.strokeStyle = "rgba(34,211,238,0.35)";
        x.beginPath(); x.arc(0, 0, R * 1.5, front ? 0 : Math.PI, front ? Math.PI : 6.283); x.stroke();
        x.restore();
      }
      ring(false);
      x.save(); x.beginPath(); x.arc(c, c, R, 0, 6.283); x.clip();
      var cols = ["#141B3A", "#1E2550", "#2B2A5E", "#3A3478", "#1A2247", "#262E62", "#4A3F8C", "#18203F"];
      for (var y = c - R, i = 0; y < c + R; i++) {
        var h = R * (0.06 + ((i * 37) % 11) / 90);
        x.fillStyle = cols[i % cols.length]; x.fillRect(c - R, y, R * 2, h + 1); y += h;
      }
      x.globalAlpha = 0.25; x.drawImage(rockTex, 0, 0, 1024, 1024, c - R, c - R, R * 2, R * 2); x.globalAlpha = 1;
      x.translate(0, 0);
      var g = x.createRadialGradient(c - R * 0.4, c - R * 0.45, R * 0.1, c, c, R);
      g.addColorStop(0, "rgba(255,255,255,0.08)"); g.addColorStop(0.6, "rgba(0,0,0,0.1)"); g.addColorStop(1, "rgba(0,0,0,0.85)");
      x.fillStyle = g; x.fillRect(0, 0, S, S); x.restore();
      ring(true);
    });

    var moon = off(S, function (x) {
      x.save(); x.beginPath(); x.arc(S / 2, S / 2, S * 0.4, 0, 6.283); x.clip();
      x.fillStyle = "#5C6676"; x.fillRect(0, 0, S, S);
      x.globalCompositeOperation = "multiply"; x.drawImage(rockTex, 300, 300, 600, 600, 0, 0, S, S);
      x.globalCompositeOperation = "source-over";
      shade(x, S, LILAC);
    });

    var sun = off(S, function (x) {
      var g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.06, "rgba(220,245,255,0.95)");
      g.addColorStop(0.16, "rgba(34,211,238,0.35)"); g.addColorStop(0.45, "rgba(167,139,250,0.08)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, S, S);
      x.strokeStyle = "rgba(220,245,255,0.35)"; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(S * 0.5, S * 0.08); x.lineTo(S * 0.5, S * 0.92); x.moveTo(S * 0.08, S * 0.5); x.lineTo(S * 0.92, S * 0.5); x.stroke();
    });

    // Cada cuerpo se ancla a una sección: al acercarte crece (zoom) y pasa por un lateral
    var plan = [
      { el: "#animacion", img: sun, side: -1, vy: -0.25, size: 0.55, glow: true },
      { el: "#servicios", img: volcanic, side: 1, vy: -0.15, size: 0.95 },
      { el: "#proceso", img: moon, side: -1, vy: 0.2, size: 0.6 },
      { el: "#proyectos", img: giant, side: 1, vy: 0.05, size: 1.25 },
      { el: "#contacto", img: volcanic, side: -1, vy: -0.1, size: 0.45 }
    ];
    bodies = plan.map(function (p) {
      var el = document.querySelector(p.el);
      return { el: el, img: p.img, side: p.side, vy: p.vy, size: p.size, glow: p.glow, rot: Math.random() * 6.28 };
    }).filter(function (b) { return b.el; });
  }

  function bodyAnchor(b) { return b.el.getBoundingClientRect().top + scrollY; }

  /* =======================================================
     Rocas flotando
     ======================================================= */
  function makeRocks() {
    if (mode3d) { rocks = []; return; }
    var defs = mobile
      ? [{ i: 2, s: 60, side: 1, y: 0.2, f: 0.22 }, { i: 3, s: 44, side: 0, y: 0.65, f: 0.12 }, { i: 1, s: 76, side: 1, y: 1.2, f: 0.3 }]
      : [{ i: 0, s: 140, side: 1, y: 0.22, f: 0.32 }, { i: 2, s: 66, side: 0, y: 0.45, f: 0.14 },
         { i: 1, s: 104, side: 0, y: 1.05, f: 0.26 }, { i: 3, s: 44, side: 1, y: 0.8, f: 0.08 }, { i: 2, s: 84, side: 1, y: 1.55, f: 0.2 }];
    rocks = defs.map(function (d) {
      var edge = mobile ? rand(-0.08, 0.04) : rand(-0.02, 0.09);
      return { img: rockImgs[d.i], size: d.s, f: d.f, x: d.side ? W * (1 - edge) - d.s * 0.4 : W * edge, y0: H * d.y,
        rot: Math.random() * 6.28, vr: rand(-0.0015, 0.0015) || 0.0008, vx: rand(-0.05, 0.05), bob: Math.random() * 6.28, alpha: 0.55 + d.f * 1.2 };
    });
  }

  /* =======================================================
     Estrellas fugaces: perspectivas y estelas distintas
     ======================================================= */
  var TYPES = ["cross", "cross", "cross", "far", "toward", "away"];
  var TRAILS = ["clean", "clean", "sparkle", "double"];

  function shoot(opts) {
    opts = opts || {};
    var type = opts.type || TYPES[(Math.random() * TYPES.length) | 0];
    var trail = opts.trail || TRAILS[(Math.random() * TRAILS.length) | 0];
    var tint = Math.random() < 0.5 ? CYAN : Math.random() < 0.6 ? LILAC : WHITE;
    var s = { type: type, trail: trail, tint: tint, life: 0, hist: [] };
    var cx = W * rand(0.35, 0.65), cy = H * rand(0.3, 0.5);
    if (type === "cross" || type === "far") {
      var fromLeft = Math.random() < 0.5, ang = rand(0.12, 1.05);
      var sp = type === "far" ? rand(3, 5) : rand(8, 15);
      s.x = fromLeft ? rand(-0.05, 0.6) * W : rand(0.4, 1.05) * W; s.y = rand(-0.08, 0.4) * H;
      s.vx = (fromLeft ? 1 : -1) * Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
      s.w = type === "far" ? rand(0.5, 0.9) : rand(1, 2.4); s.len = type === "far" ? rand(30, 70) : rand(90, 260);
      s.max = type === "far" ? rand(60, 110) : rand(40, 75); s.acc = 1;
    } else {
      // hacia ti: nace cerca del punto de fuga y sale acelerando, cada vez más grande
      // alejándose: entra por un borde y se pierde hacia el centro, encogiendo
      var a = Math.random() * 6.283;
      s.ox = cx; s.oy = cy; s.dir = [Math.cos(a), Math.sin(a)];
      s.d = type === "toward" ? rand(0.02, 0.08) : rand(0.75, 0.95);
      s.dd = type === "toward" ? 0.006 : -0.009;
      s.max = type === "toward" ? rand(70, 100) : rand(60, 90);
    }
    shooters.push(s);
  }

  function scheduleShooting() {
    setTimeout(function () {
      if (!document.hidden) {
        shoot();
        if (Math.random() < 0.3) setTimeout(shoot, rand(200, 900)); // a veces dos
      }
      scheduleShooting();
    }, rand(2200, 6500));
  }

  function drawShooter(s) {
    s.life++;
    var k = Math.sin(Math.PI * clamp(s.life / s.max, 0, 1));
    var hx, hy, tx, ty, w;
    if (s.type === "cross" || s.type === "far") {
      s.x += s.vx; s.y += s.vy;
      var sp = Math.hypot(s.vx, s.vy);
      hx = s.x; hy = s.y; tx = s.x - s.vx / sp * s.len; ty = s.y - s.vy / sp * s.len; w = s.w;
    } else {
      s.d += s.dd; s.dd *= s.type === "toward" ? 1.045 : 0.985;
      var R = Math.hypot(W, H) * 0.6;
      var d0 = Math.max(0, s.d - (s.type === "toward" ? s.d * 0.35 : 0.08));
      hx = s.ox + s.dir[0] * s.d * R; hy = s.oy + s.dir[1] * s.d * R;
      tx = s.ox + s.dir[0] * d0 * R; ty = s.oy + s.dir[1] * d0 * R;
      w = s.type === "toward" ? 0.4 + s.d * 3.2 : Math.max(0.3, s.d * 2);
    }
    var g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, "rgba(255,255,255," + 0.95 * k + ")");
    g.addColorStop(0.18, "rgba(" + s.tint + "," + 0.65 * k + ")");
    g.addColorStop(1, "rgba(" + s.tint + ",0)");
    ctx.lineCap = "round";
    if (s.trail === "double") {
      var nx = -(hy - ty), ny = hx - tx, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      var o = 1.6 + w;
      ctx.lineWidth = w * 0.7;
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(hx + nx * o, hy + ny * o); ctx.lineTo(tx + nx * o * 2, ty + ny * o * 2); ctx.stroke();
      var g2 = ctx.createLinearGradient(hx, hy, tx, ty);
      g2.addColorStop(0, "rgba(255,255,255," + 0.9 * k + ")"); g2.addColorStop(0.2, "rgba(" + (s.tint === CYAN ? LILAC : CYAN) + "," + 0.6 * k + ")"); g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle = g2; ctx.beginPath(); ctx.moveTo(hx - nx * o, hy - ny * o); ctx.lineTo(tx - nx * o * 2, ty - ny * o * 2); ctx.stroke();
    } else {
      ctx.lineWidth = w; ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
    }
    if (s.trail === "sparkle" && s.life % 2 === 0 && k > 0.2) {
      sparks.push({ x: hx, y: hy, vx: rand(-0.4, 0.4), vy: rand(-0.2, 0.6), life: 0, max: rand(25, 50), col: s.tint, r: rand(0.6, 1.4) });
    }
    // cabeza con halo
    ctx.fillStyle = "rgba(255,255,255," + k + ")";
    ctx.beginPath(); ctx.arc(hx, hy, Math.max(0.8, w * 0.75), 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(" + s.tint + "," + 0.18 * k + ")";
    ctx.beginPath(); ctx.arc(hx, hy, w * 4 + 2, 0, 6.283); ctx.fill();
    return s.life < s.max;
  }

  function drawSparks(list, c) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i]; p.life++; p.x += p.vx; p.y += p.vy; p.vy += 0.01;
      var a = 1 - p.life / p.max;
      c.fillStyle = "rgba(" + p.col + "," + (a * 0.9) + ")";
      c.beginPath(); c.arc(p.x, p.y, p.r * a + 0.2, 0, 6.283); c.fill();
      if (p.life >= p.max) list.splice(i, 1);
    }
  }

  /* =======================================================
     Galaxia: se recorre y se acerca al bajar
     ======================================================= */
  function moveGalaxy() {
    if (mode3d) return;
    if (!galaxy.naturalHeight || reduced) return;
    var gh = galaxy.getBoundingClientRect().height / (galaxy._scale || 1);
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var p = clamp(scrollY / max, 0, 1);
    var sc = 1 + 0.18 * Math.sin(p * Math.PI); // zoom in hasta la mitad, zoom out al final
    galaxy._scale = sc;
    galaxy.style.transformOrigin = "50% " + (p * 100).toFixed(1) + "%";
    galaxy.style.transform = "translate3d(0," + (-(gh - H) * p).toFixed(1) + "px,0) scale(" + sc.toFixed(4) + ")";
  }

  /* =======================================================
     Dibujo principal
     ======================================================= */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.45, R = Math.hypot(W, H) * 0.55;

    // estrellas (zoom radial)
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var x = cx + Math.cos(s.ang) * s.dist * R, y = cy + Math.sin(s.ang) * s.dist * R;
      if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue;
      var tw = still ? 1 : 0.55 + 0.45 * Math.sin(t / 1000 * s.sp + s.ph);
      var near = 0.6 + s.dist * 0.7;
      ctx.globalAlpha = clamp(s.a * tw * Math.min(1, s.dist * 6), 0, 1);
      ctx.fillStyle = "rgb(" + s.col + ")";
      // al hacer scroll rápido, pequeñas estelas radiales (sensación de velocidad)
      var streak = Math.min(18, Math.abs(scrollVel) * 0.35 * s.depth * s.dist);
      if (streak > 1.2) {
        ctx.strokeStyle = "rgb(" + s.col + ")"; ctx.lineWidth = s.r * near;
        var dir = scrollVel > 0 ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(s.ang) * streak * dir, y + Math.sin(s.ang) * streak * dir); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, s.r * near, 0, 6.283); ctx.fill();
        if (s.r > 1.05) { ctx.globalAlpha *= 0.35; ctx.fillRect(x - 4.5, y - 0.3, 9, 0.6); ctx.fillRect(x - 0.3, y - 4.5, 0.6, 9); }
      }
    }
    ctx.globalAlpha = 1;

    // planetas: crecen al acercarte a su sección y pasan por un lateral
    for (var b = 0; b < bodies.length; b++) {
      var body = bodies[b];
      var d = (bodyAnchor(body) - scrollY - H * 0.3) / H; // viewports hasta la sección
      if (d > 2.6 || d < -1.4) continue;
      var tt = clamp((2.6 - d) / 4, 0, 1);                 // 0 lejos → 1 ya pasado
      var size = Math.min(W, H) * body.size * (0.05 + 1.25 * Math.pow(tt, 2.4)) * (mobile ? 0.8 : 1);
      var spread = 0.06 + 0.62 * Math.pow(tt, 1.7);
      var bx = cx + body.side * W * spread, by = cy + body.vy * H * tt * 2 - H * 0.05;
      var alpha = clamp(tt * 5, 0, 1) * clamp((1 - tt) * 6, 0, 1) * (body.glow ? 1 : 0.92);
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.save(); ctx.translate(bx, by); if (!body.glow) ctx.rotate(body.rot + tt * 0.25);
      ctx.drawImage(body.img, -size / 2, -size / 2, size, size); ctx.restore();
    }
    ctx.globalAlpha = 1;

    // rocas flotando
    for (var r = 0; r < rocks.length; r++) {
      var rk = rocks[r];
      if (!rk.img.complete || !rk.img.naturalWidth) continue;
      var span = (H + rk.size * 2) * 1.6;
      var ry = (rk.y0 - scrollY * rk.f + (still ? 0 : Math.sin(t / 2400 + rk.bob) * 8)) % span;
      if (ry < -rk.size) ry += span;
      if (ry > H + rk.size) continue;
      if (!still) { rk.rot += rk.vr; rk.x += rk.vx; if (rk.x < -rk.size * 0.6 || rk.x > W + rk.size * 0.2) rk.vx *= -1; }
      ctx.save(); ctx.globalAlpha = Math.min(1, rk.alpha); ctx.translate(rk.x + rk.size / 2, ry); ctx.rotate(rk.rot);
      ctx.drawImage(rk.img, -rk.size / 2, -rk.size / 2, rk.size, rk.size); ctx.restore();
    }

    if (!still) {
      shooters = shooters.filter(drawShooter);
      drawSparks(sparks, ctx);
    }
  }

  function loop(t) {
    var dy = scrollY - prevScroll; prevScroll = scrollY;
    scrollVel = scrollVel * 0.85 + dy * 0.15;
    if (dy) zoomStars(dy);
    if (!document.hidden) draw(t);
    requestAnimationFrame(loop);
  }

  /* =======================================================
     Estrellas que escriben las palabras destacadas
     (capa por encima del contenido, sin bloquear clics)
     ======================================================= */
  var fx = null, fctx = null, writers = [], fxSparks = [], fxRunning = false;

  function setupWriters() {
    var words = Array.prototype.slice.call(document.querySelectorAll(".hl"));
    if (!words.length) return;
    if (still) return; // sin animación: las palabras se quedan tal cual
    // partir cada palabra en letras (antes de que SplitText divida las líneas;
    // SplitText pone el texto completo en aria-label del titular)
    words.forEach(function (w) {
      var text = w.textContent; w.textContent = "";
      text.split("").forEach(function (ch) {
        var s = document.createElement("span"); s.className = "ch"; s.textContent = ch; w.appendChild(s);
      });
    });

    fx = document.createElement("canvas"); fx.className = "fx-canvas"; fx.setAttribute("aria-hidden", "true");
    document.body.appendChild(fx); fctx = fx.getContext("2d");
    document.documentElement.classList.add("fx-writing");
    sizeFx();

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        setTimeout(function () { launchWriter(en.target); }, 380);
      });
    }, { threshold: 0.9, rootMargin: "0px 0px -12% 0px" });
    words.forEach(function (w) {
      io.observe(w);
      // seguridad: si por lo que sea no llega la estrella, la palabra aparece igualmente
      setTimeout(function () { revealAll(w); }, 12000);
    });
  }
  function revealAll(w) { Array.prototype.forEach.call(w.querySelectorAll(".ch"), function (c) { c.classList.add("lit"); }); }
  // las copias vacías que deja SplitText al partir líneas no necesitan estrella
  function litEmpty() { Array.prototype.forEach.call(document.querySelectorAll(".hl .ch"), function (c) { if (!c.textContent.trim()) c.classList.add("lit"); }); }
  function sizeFx() { if (!fx) return; fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

  function launchWriter(word) {
    var chars = Array.prototype.slice.call(word.querySelectorAll(".ch")).filter(function (c) { return c.textContent.trim(); });
    litEmpty();
    if (!chars.length || chars[0].classList.contains("lit")) return;
    var r0 = chars[0].getBoundingClientRect();
    var fromRight = r0.left < W * 0.5;
    var col = word.classList.contains("hl--violet") ? LILAC : CYAN;
    writers.push({
      word: word, chars: chars, col: col, phase: "fly", t: 0,
      sx: fromRight ? W * rand(0.75, 1.05) : W * rand(-0.05, 0.25), sy: -H * rand(0.05, 0.2),
      idx: 0, hist: [], x: 0, y: 0
    });
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  }

  function charCenter(c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.55, r.height]; }

  function fxLoop() {
    fctx.clearRect(0, 0, W, H);
    for (var i = writers.length - 1; i >= 0; i--) {
      var w = writers[i];
      var target;
      if (w.phase === "fly") {
        // vuelo curvo hasta la primera letra (1 s aprox.)
        w.t = Math.min(1, w.t + 1 / 55);
        target = charCenter(w.chars[0]);
        var e = 1 - Math.pow(1 - w.t, 3);
        var mx = (w.sx + target[0]) / 2 + (w.sx < target[0] ? -1 : 1) * W * 0.08, my = Math.min(w.sy, target[1]) - H * 0.05;
        var a = 1 - e;
        w.x = a * a * w.sx + 2 * a * e * mx + e * e * target[0];
        w.y = a * a * w.sy + 2 * a * e * my + e * e * target[1];
        if (w.t >= 1) { w.phase = "write"; w.t = 0; }
      } else if (w.phase === "write") {
        // recorre la palabra encendiendo cada letra
        var c = w.chars[w.idx];
        target = charCenter(c);
        w.x += (target[0] - w.x) * 0.45; w.y += (target[1] - w.y) * 0.45;
        if (Math.abs(target[0] - w.x) < 3) {
          c.classList.add("lit");
          for (var k = 0; k < 5; k++) fxSparks.push({ x: w.x, y: w.y, vx: rand(-1.2, 1.2), vy: rand(-1.4, 0.6), life: 0, max: rand(20, 40), col: w.col, r: rand(0.8, 1.8) });
          w.idx++;
          if (w.idx >= w.chars.length) { w.phase = "out"; w.t = 0; w.ox = w.x; w.oy = w.y; }
        }
      } else {
        // sale disparada y se apaga
        w.t += 1 / 30; w.x += 9 + w.t * 10; w.y -= 3 + w.t * 3;
        if (w.t >= 1) { writers.splice(i, 1); continue; }
      }
      w.hist.push([w.x, w.y]); if (w.hist.length > 22) w.hist.shift();
      // estela
      var fade = w.phase === "out" ? 1 - w.t : 1;
      for (var h = 1; h < w.hist.length; h++) {
        var p0 = w.hist[h - 1], p1 = w.hist[h], q = h / w.hist.length;
        fctx.strokeStyle = "rgba(" + w.col + "," + (q * 0.7 * fade) + ")"; fctx.lineWidth = q * 3; fctx.lineCap = "round";
        fctx.beginPath(); fctx.moveTo(p0[0], p0[1]); fctx.lineTo(p1[0], p1[1]); fctx.stroke();
      }
      fctx.fillStyle = "rgba(255,255,255," + fade + ")"; fctx.beginPath(); fctx.arc(w.x, w.y, 2.4, 0, 6.283); fctx.fill();
      fctx.fillStyle = "rgba(" + w.col + "," + 0.25 * fade + ")"; fctx.beginPath(); fctx.arc(w.x, w.y, 11, 0, 6.283); fctx.fill();
    }
    drawSparks(fxSparks, fctx);
    if (writers.length || fxSparks.length) requestAnimationFrame(fxLoop);
    else { fxRunning = false; fctx.clearRect(0, 0, W, H); }
  }

  /* =======================================================
     Tamaño y eventos
     ======================================================= */
  function resize(force) {
    var w = window.innerWidth, h = window.innerHeight;
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return;
    lastW = w; lastH = h; W = w; H = h; mobile = w <= 640;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars(); makeRocks(); sizeFx(); moveGalaxy();
    if (still) draw(0);
  }

  window.addEventListener("resize", function () { resize(false); });
  var ticking = false;
  window.addEventListener("scroll", function () {
    scrollY = window.scrollY;
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; moveGalaxy(); if (still) draw(0); });
  }, { passive: true });
  galaxy.addEventListener("load", moveGalaxy);
  window.addEventListener("load", function () { moveGalaxy(); buildBodies(); });

  resize(true);
  buildBodies();
  setupWriters();
  if (still) { draw(0); return; }
  requestAnimationFrame(loop);
  setTimeout(function () { shoot({ type: "cross", trail: "sparkle" }); }, 1200);
  scheduleShooting();
})();

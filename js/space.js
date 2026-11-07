/* =========================================================
   WebCraft Studio — Fondo espacial
   Galaxia fija que se recorre al bajar, estrellas que titilan,
   estrellas fugaces aleatorias y rocas volcánicas flotando.
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
  var still = reduced || slow; // sin animación continua: se dibuja una vez

  var W = 0, H = 0, dpr = 1, mobile = false;
  var stars = [], shooters = [], rocks = [];
  var scrollY = window.scrollY, lastW = 0, lastH = 0;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ---------- Estrellas ---------- */
  function makeStars() {
    var density = mobile ? 1 / 3600 : 1 / 2600;
    var n = Math.round(W * H * density);
    stars = [];
    for (var i = 0; i < n; i++) {
      var tint = Math.random();
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() < 0.06 ? rand(1.2, 1.7) : rand(0.35, 1.05),
        a: rand(0.35, 0.95), speed: rand(0.4, 1.8), phase: Math.random() * 6.28,
        depth: [0.015, 0.04, 0.08][i % 3], // paralaje: las cercanas se mueven más al bajar
        col: tint < 0.08 ? "34,211,238" : tint < 0.14 ? "167,139,250" : "232,236,248"
      });
    }
  }

  /* ---------- Rocas volcánicas flotando ---------- */
  var rockSrc = ["assets/space/roca-1.webp", "assets/space/roca-2.webp", "assets/space/roca-3.webp", "assets/space/roca-4.webp"];
  var rockImgs = rockSrc.map(function (src) { var im = new Image(); im.decoding = "async"; im.src = src; im.onload = function () { if (still) draw(0); }; return im; });

  function makeRocks() {
    // Pegadas a los laterales para no tapar el texto
    var defs = mobile
      ? [{ i: 2, s: 64, side: 1, y: 0.18, f: 0.22 }, { i: 3, s: 46, side: 0, y: 0.62, f: 0.12 }, { i: 1, s: 80, side: 1, y: 1.15, f: 0.3 }]
      : [{ i: 0, s: 150, side: 1, y: 0.2, f: 0.32 }, { i: 2, s: 70, side: 0, y: 0.42, f: 0.14 },
         { i: 1, s: 110, side: 0, y: 1.05, f: 0.26 }, { i: 3, s: 46, side: 1, y: 0.78, f: 0.08 },
         { i: 2, s: 90, side: 1, y: 1.55, f: 0.2 }];
    rocks = defs.map(function (d) {
      var edge = mobile ? rand(-0.08, 0.04) : rand(-0.02, 0.1);
      return {
        img: rockImgs[d.i], size: d.s, f: d.f,
        x: d.side ? W * (1 - edge) - d.s * 0.4 : W * edge,
        y0: H * d.y, rot: Math.random() * 6.28,
        vr: rand(-0.0015, 0.0015) || 0.0008, vx: rand(-0.06, 0.06), bob: Math.random() * 6.28,
        alpha: 0.55 + d.f * 1.2
      };
    });
  }

  /* ---------- Estrellas fugaces ---------- */
  function shoot() {
    var fromLeft = Math.random() < 0.5;
    var angle = rand(0.28, 0.55); // inclinación hacia abajo
    var speed = rand(mobile ? 7 : 9, mobile ? 10 : 14);
    shooters.push({
      x: fromLeft ? rand(-0.05, 0.55) * W : rand(0.45, 1.05) * W,
      y: rand(-0.05, 0.45) * H,
      vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      len: rand(90, 180), life: 0, max: rand(45, 80)
    });
  }
  function scheduleShooting() {
    // Cada pocos segundos, de forma aleatoria; a veces dos seguidas
    setTimeout(function () {
      if (!document.hidden) {
        shoot();
        if (Math.random() < 0.25) setTimeout(shoot, rand(250, 900));
      }
      scheduleShooting();
    }, rand(2500, 7000));
  }

  /* ---------- Galaxia: se recorre de arriba abajo al bajar ---------- */
  function moveGalaxy() {
    if (!galaxy.naturalHeight || reduced) return;
    var gh = galaxy.getBoundingClientRect().height;
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var p = Math.min(1, Math.max(0, scrollY / max));
    galaxy.style.transform = "translate3d(0," + (-(gh - H) * p).toFixed(1) + "px,0)";
  }

  /* ---------- Dibujo ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // estrellas
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var y = (s.y - scrollY * s.depth) % H; if (y < 0) y += H;
      var tw = still ? 1 : 0.55 + 0.45 * Math.sin(t / 1000 * s.speed + s.phase);
      ctx.globalAlpha = s.a * tw;
      ctx.fillStyle = "rgb(" + s.col + ")";
      ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, 6.283); ctx.fill();
      if (s.r > 1.15) { // destello en cruz en las más brillantes
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(s.x - 4.5, y - 0.3, 9, 0.6); ctx.fillRect(s.x - 0.3, y - 4.5, 0.6, 9);
      }
    }
    ctx.globalAlpha = 1;

    // rocas flotando (paralaje con el scroll + deriva lenta)
    for (var k = 0; k < rocks.length; k++) {
      var r = rocks[k];
      if (!r.img.complete || !r.img.naturalWidth) continue;
      var span = H + r.size * 2;
      var ry = (r.y0 - scrollY * r.f + (still ? 0 : Math.sin(t / 2400 + r.bob) * 8)) % (span * 1.6);
      if (ry < -r.size) ry += span * 1.6;
      if (ry > H + r.size) continue;
      if (!still) { r.rot += r.vr; r.x += r.vx; if (r.x < -r.size * 0.6 || r.x > W + r.size * 0.2) r.vx *= -1; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, r.alpha);
      ctx.translate(r.x + r.size / 2, ry); ctx.rotate(r.rot);
      ctx.drawImage(r.img, -r.size / 2, -r.size / 2, r.size, r.size);
      ctx.restore();
    }

    // estrellas fugaces
    for (var j = shooters.length - 1; j >= 0; j--) {
      var sh = shooters[j];
      sh.life++; sh.x += sh.vx; sh.y += sh.vy;
      var k2 = Math.sin(Math.PI * sh.life / sh.max);
      var sp = Math.hypot(sh.vx, sh.vy);
      var tx = sh.x - sh.vx / sp * sh.len, ty = sh.y - sh.vy / sp * sh.len;
      var g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
      g.addColorStop(0, "rgba(240,250,255," + (0.95 * k2) + ")");
      g.addColorStop(0.2, "rgba(34,211,238," + (0.6 * k2) + ")");
      g.addColorStop(1, "rgba(167,139,250,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + (0.9 * k2) + ")";
      ctx.beginPath(); ctx.arc(sh.x, sh.y, 1.4, 0, 6.283); ctx.fill();
      if (sh.life >= sh.max) shooters.splice(j, 1);
    }
  }

  function loop(t) {
    if (!document.hidden) draw(t);
    requestAnimationFrame(loop);
  }

  /* ---------- Tamaño ---------- */
  function resize(force) {
    var w = window.innerWidth, h = window.innerHeight;
    // En móvil la barra del navegador cambia la altura al hacer scroll: ignorar cambios pequeños
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return;
    lastW = w; lastH = h; W = w; H = h; mobile = w <= 640;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars(); makeRocks(); moveGalaxy();
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
  window.addEventListener("load", moveGalaxy);

  resize(true);
  if (still) { draw(0); return; }
  requestAnimationFrame(loop);
  setTimeout(shoot, 1200);
  scheduleShooting();
})();

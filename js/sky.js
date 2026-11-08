/* =========================================================
   WebCraft Studio — Cielo
   · Dos capas de estrellas que se desplazan muy despacio al bajar
   · Estrellas fugaces pequeñas, de vez en cuando, en direcciones al azar
   · Una estrella fugaz escribe las palabras destacadas (.hl)
   Con "reducir movimiento": estrellas quietas, sin estrellas fugaces.
   ========================================================= */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.innerWidth < 768;
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var accentRGB = function () {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22D3EE";
    var n = parseInt(c.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",");
  };

  /* ---------- Capas de estrellas (mosaico que se repite) ---------- */
  function tile(n, rMin, rMax, aMin, aMax, seed) {
    var S = 1024, c = document.createElement("canvas"); c.width = c.height = S * 2;
    var x = c.getContext("2d"); x.scale(2, 2);
    var s = seed; var r = function () { return (s = (s * 16807) % 2147483647) / 2147483647; };
    for (var i = 0; i < n; i++) {
      var px = r() * S, py = r() * S, rad = rMin + r() * (rMax - rMin);
      x.globalAlpha = aMin + r() * (aMax - aMin); x.fillStyle = r() < 0.08 ? "#CFE3FF" : "#E8ECF8";
      // estrellas cerca del borde se dibujan también en el lado opuesto: mosaico sin cortes
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
        x.beginPath(); x.arc(px + ox * S, py + oy * S, rad, 0, 6.283); x.fill();
      }
    }
    return c.toDataURL("image/png");
  }
  var far = document.getElementById("stars-far"), near = document.getElementById("stars-near");
  if (far && near) {
    far.style.backgroundImage = "url(" + tile(mobile ? 150 : 210, 0.3, 0.75, 0.15, 0.5, 11) + ")";
    near.style.backgroundImage = "url(" + tile(mobile ? 40 : 55, 0.6, 1.25, 0.35, 0.8, 29) + ")";
    if (!reduced) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          ticking = false; var y = window.scrollY;
          far.style.backgroundPosition = "0 " + (-y * 0.025).toFixed(1) + "px";
          near.style.backgroundPosition = "0 " + (-y * 0.06).toFixed(1) + "px";
        });
      }, { passive: true });
    }
  }

  if (reduced) return;

  /* ---------- Estrellas fugaces (fondo, discretas) ---------- */
  var cv = document.getElementById("shooting"), ctx = cv && cv.getContext("2d");
  var W = 0, H = 0, dpr = 1, shooters = [], running = false;
  function size() {
    if (!cv) return; W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function shoot() {
    if (!ctx) return;
    var ang = rand(0, Math.PI * 2);
    // evita trayectorias casi verticales hacia arriba (se ven raras)
    if (Math.sin(ang) < -0.85) ang = rand(0.2, 1.2);
    var far = Math.random() < 0.35;
    var sp = far ? rand(2.4, 4) : rand(5, 9);
    var dx = Math.cos(ang), dy = Math.sin(ang);
    // entra por el lado opuesto a su dirección
    var x = dx > 0 ? rand(-0.05, 0.55) * W : rand(0.45, 1.05) * W;
    var y = dy > 0 ? rand(-0.05, 0.45) * H : rand(0.55, 1.05) * H;
    shooters.push({ x: x, y: y, vx: dx * sp, vy: dy * sp, len: far ? rand(30, 60) : rand(70, 140), w: far ? 0.7 : rand(1, 1.4), life: 0, max: far ? rand(70, 110) : rand(45, 75) });
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    var acc = accentRGB();
    for (var i = shooters.length - 1; i >= 0; i--) {
      var s = shooters[i]; s.life++; s.x += s.vx; s.y += s.vy;
      var k = Math.sin(Math.PI * Math.min(1, s.life / s.max));
      var spd = Math.hypot(s.vx, s.vy), tx = s.x - s.vx / spd * s.len, ty = s.y - s.vy / spd * s.len;
      var g = ctx.createLinearGradient(s.x, s.y, tx, ty);
      g.addColorStop(0, "rgba(255,255,255," + (0.9 * k) + ")");
      g.addColorStop(0.25, "rgba(" + acc + "," + (0.35 * k) + ")");
      g.addColorStop(1, "rgba(" + acc + ",0)");
      ctx.strokeStyle = g; ctx.lineWidth = s.w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      if (s.life >= s.max) shooters.splice(i, 1);
    }
    if (shooters.length && !document.hidden) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0, 0, W, H); shooters = []; }
  }
  if (cv) {
    size(); window.addEventListener("resize", size);
    (function schedule() {
      setTimeout(function () { if (!document.hidden) shoot(); schedule(); }, mobile ? rand(6000, 13000) : rand(4500, 10000));
    })();
    setTimeout(shoot, 2500);
  }

  /* ---------- La estrella que escribe las palabras destacadas ---------- */
  var words = Array.prototype.slice.call(document.querySelectorAll(".hl"));
  if (!words.length) return;
  // partir en letras ANTES de que main.js trocee el título en líneas (al deshacerlo, vuelve este HTML)
  words.forEach(function (w) {
    var text = w.textContent; w.textContent = "";
    w.setAttribute("data-word", text);
    text.split("").forEach(function (ch) { var s = document.createElement("span"); s.className = "ch"; s.textContent = ch; w.appendChild(s); });
  });
  document.documentElement.classList.add("fx-writing");

  var fx = null, fctx = null, writers = [], fxRun = false;
  function fxSize() { fx.width = window.innerWidth * dpr; fx.height = window.innerHeight * dpr; fctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function ensureFx() {
    if (fx) return; fx = document.createElement("canvas"); fx.className = "fx-canvas"; fx.setAttribute("aria-hidden", "true");
    document.body.appendChild(fx); fctx = fx.getContext("2d"); dpr = Math.min(window.devicePixelRatio || 1, 2); fxSize();
    window.addEventListener("resize", fxSize);
  }
  function chars(word) { return Array.prototype.slice.call(word.querySelectorAll(".ch")).filter(function (c) { return c.textContent.trim(); }); }
  function revealAll(word) { word.querySelectorAll(".ch").forEach(function (c) { c.classList.add("lit"); }); }
  function center(c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.55]; }

  function launch(word) {
    var cs = chars(word); if (!cs.length || cs[0].classList.contains("lit")) return;
    word.querySelectorAll(".ch").forEach(function (c) { if (!c.textContent.trim()) c.classList.add("lit"); });
    ensureFx();
    var r0 = cs[0].getBoundingClientRect(), fromRight = r0.left < window.innerWidth * 0.5;
    writers.push({ word: word, phase: "fly", t: 0, idx: 0, hist: [],
      sx: fromRight ? window.innerWidth * rand(0.75, 1.05) : window.innerWidth * rand(-0.05, 0.25), sy: -window.innerHeight * rand(0.05, 0.2), x: 0, y: 0 });
    if (!fxRun) { fxRun = true; requestAnimationFrame(fxLoop); }
  }
  function fxLoop() {
    fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var acc = accentRGB();
    for (var i = writers.length - 1; i >= 0; i--) {
      var w = writers[i], cs = chars(w.word);
      if (!cs.length) { writers.splice(i, 1); continue; }
      if (w.phase === "fly") {
        w.t = Math.min(1, w.t + 1 / 55);
        var tg = center(cs[0]), e = 1 - Math.pow(1 - w.t, 3), a = 1 - e;
        var mx = (w.sx + tg[0]) / 2 + (w.sx < tg[0] ? -1 : 1) * window.innerWidth * 0.08, my = Math.min(w.sy, tg[1]) - window.innerHeight * 0.05;
        w.x = a * a * w.sx + 2 * a * e * mx + e * e * tg[0]; w.y = a * a * w.sy + 2 * a * e * my + e * e * tg[1];
        if (w.t >= 1) w.phase = "write";
      } else if (w.phase === "write") {
        var c = cs[w.idx], t2 = center(c);
        w.x += (t2[0] - w.x) * 0.45; w.y += (t2[1] - w.y) * 0.45;
        if (Math.abs(t2[0] - w.x) < 3) { c.classList.add("lit"); w.idx++; if (w.idx >= cs.length) { w.phase = "out"; w.t = 0; } }
      } else {
        w.t += 1 / 30; w.x += 9 + w.t * 10; w.y -= 3 + w.t * 3;
        if (w.t >= 1) { writers.splice(i, 1); continue; }
      }
      w.hist.push([w.x, w.y]); if (w.hist.length > 14) w.hist.shift();
      // misma estela que el resto de estrellas fugaces
      var fade = w.phase === "out" ? 1 - w.t : 1, h0 = w.hist[0], dx = w.x - h0[0], dy = w.y - h0[1], dl = Math.hypot(dx, dy);
      if (dl > 0.5) {
        var len = Math.min(140, Math.max(40, dl * 1.4)), tx = w.x - dx / dl * len, ty = w.y - dy / dl * len;
        var gr = fctx.createLinearGradient(w.x, w.y, tx, ty);
        gr.addColorStop(0, "rgba(255,255,255," + 0.95 * fade + ")"); gr.addColorStop(0.25, "rgba(" + acc + "," + 0.35 * fade + ")"); gr.addColorStop(1, "rgba(" + acc + ",0)");
        fctx.strokeStyle = gr; fctx.lineWidth = 1.5; fctx.lineCap = "round"; fctx.beginPath(); fctx.moveTo(w.x, w.y); fctx.lineTo(tx, ty); fctx.stroke();
      }
    }
    if (writers.length) requestAnimationFrame(fxLoop); else { fxRun = false; fctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }

  // Empieza cuando el título termina de aparecer (main.js avisa con "wc:revealed")
  var started = new WeakSet();
  function startFor(el) {
    var ws = el.matches && el.matches(".hl") ? [el] : Array.prototype.slice.call(el.querySelectorAll(".hl"));
    ws.forEach(function (w) {
      if (started.has(w)) return; started.add(w);
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return; io.disconnect();
        setTimeout(function () { launch(w); }, 250);
      }, { threshold: 0.9 });
      io.observe(w);
    });
  }
  document.addEventListener("wc:revealed", function (e) { startFor(e.target); });
  // Seguridad: si no llega el aviso (sin animación de títulos), arranca igual; y nunca deja la palabra oculta
  setTimeout(function () { document.querySelectorAll("h1, h2").forEach(function (h) { if (!h.querySelector(".line-mask")) startFor(h); }); }, 2500);
  setTimeout(function () { document.querySelectorAll(".hl").forEach(revealAll); }, 9000);
})();

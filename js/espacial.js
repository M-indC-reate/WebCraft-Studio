/* =========================================================
   WebCraft Studio — UI espacial (prueba)
   - Convierte servicios, proyecto y contacto en paneles de cristal.
   - Entran desde el fondo con un giro 3D.
   - Ordenador: se inclinan hacia el ratón. Móvil: se inclinan con el
     scroll y con el dedo. El reflejo sigue al puntero.
   Usa la propiedad CSS `rotate` (no `transform`) para no pisar las
   animaciones de GSAP. Con "reducir movimiento" no se mueve nada.
   ========================================================= */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var c = navigator.connection || {};
  var slow = !!(c.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  if (slow) document.documentElement.classList.add("lite");

  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var cards = $$(".service, .project, #contact-alt, #contact-form");
  cards.forEach(function (el) { el.classList.add("glass"); });

  // Proyecto: barra de navegador con la dirección y sombra de "flotar"
  $$(".project").forEach(function (p) {
    var media = p.querySelector(".project__media"); if (!media) return;
    var link = p.querySelector(".link-arrow"), url = (window.WEBCRAFT_CONFIG || {}).VESTA_URL || "";
    var bar = document.createElement("div"); bar.className = "browserbar"; bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = "<i></i><i></i><i></i><span></span>";
    bar.querySelector("span").textContent = url.replace(/^https?:\/\//, "") || "vesta-eventos";
    media.classList.add("has-bar"); media.insertBefore(bar, media.firstChild);
    var wrap = document.createElement("div"); wrap.className = "float-wrap";
    p.parentNode.insertBefore(wrap, p); wrap.appendChild(p);
  });

  if (reduced) return;

  // ---------- Entrada desde el fondo ----------
  cards.forEach(function (el) { el.classList.add("space-in"); });
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; el.classList.add("is-in"); io.unobserve(el);
      setTimeout(function () { el.classList.add("is-live"); el._live = true; }, 1150);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  cards.forEach(function (el) { io.observe(el); });

  // ---------- Inclinación ----------
  var MAX = fine ? 7 : 4;
  var state = cards.map(function (el) { return { el: el, tx: 0, ty: 0, x: 0, y: 0, ptr: false }; });

  function setGlare(s, px, py) { s.el.style.setProperty("--gx", (px * 100).toFixed(1) + "%"); s.el.style.setProperty("--gy", (py * 100).toFixed(1) + "%"); }

  state.forEach(function (s) {
    function move(e) {
      var r = s.el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      s.ptr = true; s.tx = (0.5 - py) * MAX * 2; s.ty = (px - 0.5) * MAX * 2; setGlare(s, px, py); s.el.style.setProperty("--glare", 1); kick();
    }
    s.el.addEventListener("pointermove", move, { passive: true });
    s.el.addEventListener("pointerdown", move, { passive: true });
    function leave() { s.ptr = false; s.el.style.setProperty("--glare", .55); kick(); }
    s.el.addEventListener("pointerleave", leave); s.el.addEventListener("pointerup", function () { if (!fine) setTimeout(leave, 600); });
  });

  // Móvil: sin ratón, la tarjeta se inclina según dónde está en la pantalla
  function scrollTilt() {
    if (fine) return;
    var vh = window.innerHeight;
    state.forEach(function (s) {
      if (s.ptr) return;
      var r = s.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var t = ((r.top + r.height / 2) - vh / 2) / vh; // -0,5 arriba … 0,5 abajo
      s.tx = Math.max(-1, Math.min(1, t * 2)) * MAX; s.ty = 0;
      setGlare(s, 0.3, Math.max(0, Math.min(1, 0.5 - t)));
    });
    kick();
  }
  window.addEventListener("scroll", scrollTilt, { passive: true });

  var running = false;
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }
  function tick() {
    var moving = false;
    state.forEach(function (s) {
      if (!s.el._live) { if (s.el.classList.contains("space-in") && !s.el.classList.contains("is-in")) moving = true; return; }
      var gx = s.ptr || !fine ? s.tx : 0, gy = s.ptr || !fine ? s.ty : 0;
      s.x += (gx - s.x) * 0.12; s.y += (gy - s.y) * 0.12;
      if (Math.abs(gx - s.x) > 0.02 || Math.abs(gy - s.y) > 0.02) moving = true;
      var ang = Math.hypot(s.x, s.y);
      s.el.style.rotate = ang < 0.01 ? "0deg" : (s.x / ang).toFixed(3) + " " + (s.y / ang).toFixed(3) + " 0 " + ang.toFixed(2) + "deg";
    });
    if (moving) requestAnimationFrame(tick); else running = false;
  }
  setTimeout(function () { scrollTilt(); kick(); }, 1300);
})();

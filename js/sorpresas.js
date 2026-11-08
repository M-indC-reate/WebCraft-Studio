/* =========================================================
   WebCraft Studio — Planetas con sorpresa
   Solo tres planetas son interactivos; el resto es decoración:
   - Saturno (Proyectos): "Este planeta tiene anillos. Vesta tiene lista de espera."
   - Neptuno (Preguntas): "¿No encuentras tu pregunta?". Aparece solo una vez
     por visita al llegar al final de las preguntas; si se cierra, no vuelve
     (se puede abrir tocando Neptuno).
   - El Sol (Contacto): "¿Te ha gustado el viaje?" con los contactos de
     js/config.js (EMAIL, INSTAGRAM y WHATSAPP). Si están vacíos, no hay botones.
   Cada planeta interactivo es un <button> de verdad (index.html, .planet-btn),
   con aria-label y teclado. Con "reducir movimiento" no hay animaciones.
   La pista del contacto aparece cuando una estrella fugaz choca con ella.
   ========================================================= */
(function () {
  "use strict";
  var C = window.WEBCRAFT_CONFIG || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s) { return document.querySelector(s); };
  var store = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  // ---------- Contactos (se leen de js/config.js) ----------
  var email = (C.EMAIL || "").trim();
  var insta = (C.INSTAGRAM || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  var wa = (C.WHATSAPP || "").replace(/[^\d]/g, "");
  var contacts = [];
  if (email) contacts.push({ href: "mailto:" + email, label: "Email", icon: "i-mail" });
  if (insta) contacts.push({ href: "https://instagram.com/" + insta, label: "Instagram", icon: "i-instagram", ext: true });
  if (wa) contacts.push({ href: "https://wa.me/" + wa + "?text=" + encodeURIComponent(C.WHATSAPP_MENSAJE || ""), label: "WhatsApp", icon: "i-whatsapp", ext: true });
  var vesta = (C.VESTA_URL || "").trim();

  var MSG = {
    saturn: {
      from: "Mensaje desde Saturno",
      title: "Este planeta tiene anillos.",
      text: "Vesta tiene lista de espera.",
      actions: vesta ? [{ href: vesta, label: "Ver Vesta Eventos", icon: "i-arrow-up", ext: true, after: true }] : []
    },
    neptune: {
      from: "Mensaje desde Neptuno",
      title: "¿No encuentras tu pregunta?",
      text: "Estamos a 4.500 millones de kilómetros del Sol, pero te leemos igual.",
      actions: [{ href: "#contacto", label: "Escríbenos", icon: "i-arrow", after: true }]
    },
    sun: {
      from: "Mensaje desde el Sol",
      title: "¿Te ha gustado el viaje?",
      text: contacts.length ? "Aquí termina el recorrido… y empieza tu web. Escríbenos y hablamos." : "Aquí termina el recorrido… y empieza tu web.",
      actions: contacts
    }
  };

  // ---------- Tarjeta de mensaje (cristal) ----------
  var card = document.createElement("div");
  card.className = "planet-msg"; card.id = "planet-msg"; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "false"); card.hidden = true;
  card.innerHTML = '<button class="planet-msg__close" type="button" aria-label="Cerrar el mensaje">×</button>' +
    '<p class="planet-msg__from"></p><p class="planet-msg__title" tabindex="-1"></p><p class="planet-msg__text"></p><div class="planet-msg__actions"></div>';
  document.body.appendChild(card);
  var opener = null, openName = null;
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".planet-btn"));

  function icon(id) { return '<svg aria-hidden="true" width="18" height="18"><use href="#' + id + '"/></svg>'; }
  function open(name, from) {
    var m = MSG[name]; if (!m) return;
    opener = from || null; openName = name;
    card.dataset.planet = name;
    card.querySelector(".planet-msg__from").textContent = m.from;
    card.querySelector(".planet-msg__title").textContent = m.title;
    card.setAttribute("aria-label", m.from + ": " + m.title);
    card.querySelector(".planet-msg__text").textContent = m.text;
    var box = card.querySelector(".planet-msg__actions"); box.innerHTML = "";
    m.actions.forEach(function (a) {
      var el = document.createElement("a"); el.className = "btn btn--primary btn--sm"; el.href = a.href;
      if (a.ext) { el.target = "_blank"; el.rel = "noopener"; }
      if (a.after) { el.textContent = a.label + " "; el.insertAdjacentHTML("beforeend", icon(a.icon)); }
      else { el.innerHTML = icon(a.icon) + " "; el.appendChild(document.createTextNode(a.label)); }
      if (a.href.charAt(0) === "#") el.addEventListener("click", function () { close(true); });
      box.appendChild(el);
    });
    box.hidden = !m.actions.length; // sin contactos: sin botones (nunca botones vacíos)
    buttons.forEach(function (b) { b.setAttribute("aria-expanded", String(b.dataset.msg === name)); });
    card.hidden = false; void card.offsetWidth; card.classList.add("is-open");
    card.querySelector(".planet-msg__title").focus({ preventScroll: true });
  }
  function close(keepFocus) {
    if (card.hidden) return;
    if (openName === "neptune") store.set("wc-neptuno", "visto");
    card.classList.remove("is-open"); openName = null;
    buttons.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    setTimeout(function () { if (!card.classList.contains("is-open")) card.hidden = true; }, reduced ? 0 : 350);
    if (!keepFocus && opener && opener.focus) opener.focus({ preventScroll: true });
  }
  card.querySelector(".planet-msg__close").addEventListener("click", function () { close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  document.addEventListener("pointerdown", function (e) { if (!card.hidden && !card.contains(e.target) && !e.target.closest(".planet-btn, .hint")) close(true); });

  // ---------- Planetas interactivos: botones de verdad ----------
  buttons.forEach(function (b) {
    b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-controls", "planet-msg"); b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", function () {
      if (window.__planetMoved) { window.__planetMoved = false; return; } // fue un arrastre para girarlo, no un toque
      var n = b.dataset.msg;
      if (openName === n) close(true); else open(n, b);
    });
  });

  // ---------- Pista del Sol (aparece cuando una estrella fugaz choca con ella) ----------
  var intro = $("#contacto .contact__intro");
  var hint = null;
  if (intro) {
    var PISTAS = [
      "Algo brilla más de lo normal por aquí. ¿Te atreves a tocarlo?",
      "No todo en esta web es decoración. Busca la estrella más cercana.",
      "¿Quieres hablar con nosotros? Ponte al Sol."
    ];
    hint = document.createElement("button");
    hint.type = "button"; hint.className = "hint";
    hint.textContent = PISTAS[Math.floor(Math.random() * PISTAS.length)] + " ";
    hint.insertAdjacentHTML("beforeend", '<svg aria-hidden="true" width="16" height="16"><use href="#i-destello"/></svg>');
    hint.setAttribute("aria-haspopup", "dialog");
    hint.addEventListener("click", function () { open("sun", hint); });
    var anchor = $("#socials");
    intro.insertBefore(hint, anchor && anchor.parentNode === intro ? anchor : null);
  }
  var brand = $(".footer__brand");
  if (brand) {
    var ps = document.createElement("p"); ps.className = "footer__ps";
    ps.textContent = "P. D.: los planetas no están solo de adorno.";
    brand.parentNode.insertBefore(ps, brand.nextSibling);
  }

  function accent() { var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22D3EE"; var n = parseInt(c.replace("#", ""), 16); return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); }
  function strike(el) {
    var cv = document.createElement("canvas"); cv.className = "hint-fx"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv);
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; var x = cv.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var acc = accent(), t0 = performance.now(), FLY = 700, BURST = 520, REVEAL = 1000;
    var r0 = el.getBoundingClientRect(), sx = W + 30, sy = Math.max(-30, r0.top - H * 0.45);
    function star(px, py, a, R, rot) {
      var g = x.createRadialGradient(px, py, 0, px, py, R * 1.6);
      g.addColorStop(0, "rgba(255,255,255," + 0.95 * a + ")"); g.addColorStop(0.3, "rgba(" + acc + "," + 0.4 * a + ")"); g.addColorStop(1, "rgba(" + acc + ",0)");
      x.fillStyle = g; x.beginPath(); x.arc(px, py, R * 1.6, 0, 7); x.fill();
      x.save(); x.translate(px, py); x.rotate(rot); x.lineCap = "round";
      for (var q = 0; q < 4; q++) { var L = (q % 2 ? 0.7 : 1) * R * 2.6, sg = x.createLinearGradient(0, 0, L, 0); sg.addColorStop(0, "rgba(255,255,255," + a + ")"); sg.addColorStop(1, "rgba(" + acc + ",0)"); x.strokeStyle = sg; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 0); x.lineTo(L, 0); x.stroke(); x.rotate(Math.PI / 2); }
      x.restore();
    }
    function frame(now) {
      var t = now - t0, r = el.getBoundingClientRect(), tx = r.left + 2, ty = r.top + Math.min(r.height, 28) * 0.5;
      x.clearRect(0, 0, W, H);
      if (t < FLY) {
        // la estrella fugaz llega y choca con el principio de la frase
        var p = t / FLY, e = p * p, hx = sx + (tx - sx) * e, hy = sy + (ty - sy) * e;
        var dx = tx - sx, dy = ty - sy, dl = Math.hypot(dx, dy), len = 130;
        var g = x.createLinearGradient(hx, hy, hx - dx / dl * len, hy - dy / dl * len);
        g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.25, "rgba(" + acc + ",.4)"); g.addColorStop(1, "rgba(" + acc + ",0)");
        x.strokeStyle = g; x.lineWidth = 1.6; x.lineCap = "round"; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx - dx / dl * len, hy - dy / dl * len); x.stroke();
      } else {
        var u = t - FLY;
        if (u < BURST) { var q = u / BURST, a = q < 0.2 ? q / 0.2 : Math.pow(Math.max(0, 1 - (q - 0.2) / 0.8), 1.4); star(tx, ty, a, 9 + 5 * Math.min(1, q / 0.2), q * 0.6); }
        // el choque "escribe" la pista de izquierda a derecha, con un brillo que la recorre
        var rv = Math.min(1, u / REVEAL), ev = 1 - Math.pow(1 - rv, 2);
        el.style.setProperty("--rv", (ev * 112 - 12).toFixed(1) + "%");
        if (rv < 1) { var gx = r.left + r.width * ev, gy = r.top + r.height * 0.5, gg = x.createRadialGradient(gx, gy, 0, gx, gy, 26); gg.addColorStop(0, "rgba(255,255,255,.55)"); gg.addColorStop(0.4, "rgba(" + acc + ",.25)"); gg.addColorStop(1, "rgba(" + acc + ",0)"); x.fillStyle = gg; x.beginPath(); x.arc(gx, gy, 26, 0, 7); x.fill(); }
        if (u >= Math.max(BURST, REVEAL)) { el.classList.remove("is-hidden"); el.style.removeProperty("--rv"); cv.remove(); return; }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (hint && !reduced && "IntersectionObserver" in window) {
    hint.classList.add("is-hidden");
    var hio = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; hio.disconnect();
      setTimeout(function () { strike(hint); }, 350);
    }, { threshold: 1, rootMargin: "0px 0px -12% 0px" });
    hio.observe(hint);
  }

  // ---------- Neptuno pregunta una sola vez por visita ----------
  var faqs = document.querySelectorAll("#preguntas .faq__item");
  if (faqs.length && "IntersectionObserver" in window && !store.get("wc-neptuno")) {
    var last = faqs[faqs.length - 1], nTimer = null;
    var nio = new IntersectionObserver(function (en) {
      clearTimeout(nTimer);
      if (!en[0].isIntersecting) return;
      // solo si sigues en las preguntas (si pasas de largo hacia el contacto, no sale)
      nTimer = setTimeout(function () {
        var r = last.getBoundingClientRect(), sec = document.getElementById("preguntas").getBoundingClientRect(), mid = window.innerHeight / 2;
        var inFaq = r.bottom > 0 && r.top < window.innerHeight && sec.top < mid && sec.bottom > mid;
        if (store.get("wc-neptuno") || !card.hidden || !inFaq) return;
        nio.disconnect();
        store.set("wc-neptuno", "visto"); // ya se ha mostrado: no vuelve a salir sola
        open("neptune", null);
      }, 1200);
    }, { threshold: 1 });
    nio.observe(faqs[faqs.length - 1]);
  }
})();

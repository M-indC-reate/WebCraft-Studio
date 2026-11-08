/* =========================================================
   WebCraft Studio — Planetas con sorpresa
   - El Sol (Contacto): al tocarlo, "mensaje desde el Sol" con los
     contactos que haya en js/config.js (WhatsApp, Instagram, email).
   - Neptuno (Preguntas): al llegar al final de las preguntas, o al
     tocarlo, pregunta si no has encontrado la tuya.
   - Pistas en la web: un botón junto al contacto y una posdata en el pie.
   El toque llega desde js/planets.js (evento "wc:planet-tap"); las pistas
   son botones normales, así que también funciona con teclado.
   ========================================================= */
(function () {
  "use strict";
  var C = window.WEBCRAFT_CONFIG || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s) { return document.querySelector(s); };

  var email = (C.EMAIL || "").trim();
  var insta = (C.INSTAGRAM || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  var wa = (C.WHATSAPP || "").replace(/[^\d]/g, "");
  var links = [];
  if (wa) links.push({ href: "https://wa.me/" + wa + "?text=" + encodeURIComponent(C.WHATSAPP_MENSAJE || ""), label: "WhatsApp", icon: "i-whatsapp", ext: true });
  if (insta) links.push({ href: "https://instagram.com/" + insta, label: "Instagram", icon: "i-instagram", ext: true });
  if (email) links.push({ href: "mailto:" + email, label: "Email", icon: "i-mail" });

  var MSG = {
    sun: {
      from: "Mensaje desde el Sol",
      title: "¿Te ha gustado el viaje?",
      text: links.length ? "Aquí termina el recorrido… y empieza tu web. Escríbenos y hablamos." : "Aquí termina el recorrido… y empieza tu web. Muy pronto podrás escribirnos desde aquí.",
      actions: links
    },
    neptune: {
      from: "Mensaje desde Neptuno",
      title: "¿No encuentras tu pregunta?",
      text: "Estamos a 4.500 millones de kilómetros del Sol, pero te leemos igual.",
      actions: [{ href: "#contacto", label: "Escríbenos", icon: "i-arrow" }]
    }
  };

  // ---------- Tarjeta de mensaje (cristal, como la UI espacial) ----------
  var card = document.createElement("div");
  card.className = "planet-msg"; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "false"); card.hidden = true;
  card.innerHTML = '<button class="planet-msg__close" type="button" aria-label="Cerrar">×</button>' +
    '<p class="planet-msg__from"></p><p class="planet-msg__title" tabindex="-1"></p><p class="planet-msg__text"></p><div class="planet-msg__actions"></div>';
  document.body.appendChild(card);
  var opener = null, openName = null;

  function open(name, from) {
    var m = MSG[name]; if (!m) return;
    opener = from || document.activeElement; openName = name;
    card.dataset.planet = name;
    card.querySelector(".planet-msg__from").textContent = m.from;
    card.querySelector(".planet-msg__title").textContent = m.title;
    card.setAttribute("aria-label", m.title);
    card.querySelector(".planet-msg__text").textContent = m.text;
    var box = card.querySelector(".planet-msg__actions"); box.innerHTML = "";
    m.actions.forEach(function (a) {
      var el = document.createElement("a"); el.className = "btn btn--primary btn--sm"; el.href = a.href;
      if (a.ext) { el.target = "_blank"; el.rel = "noopener"; }
      var ico = '<svg aria-hidden="true" width="18" height="18"><use href="#' + a.icon + '"/></svg>';
      if (a.icon === "i-arrow") { el.textContent = a.label + " "; el.insertAdjacentHTML("beforeend", ico); }
      else { el.innerHTML = ico + " "; el.appendChild(document.createTextNode(a.label)); }
      if (a.href.charAt(0) === "#") el.addEventListener("click", function () { close(true); });
      box.appendChild(el);
    });
    box.hidden = !m.actions.length;
    card.hidden = false; void card.offsetWidth; card.classList.add("is-open");
    card.querySelector(".planet-msg__title").focus({ preventScroll: true });
  }
  function close(keepFocus) {
    if (card.hidden) return;
    card.classList.remove("is-open"); openName = null;
    setTimeout(function () { if (!card.classList.contains("is-open")) card.hidden = true; }, reduced ? 0 : 350);
    if (!keepFocus && opener && opener.focus) opener.focus({ preventScroll: true });
  }
  card.querySelector(".planet-msg__close").addEventListener("click", function () { close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  document.addEventListener("pointerdown", function (e) { if (!card.hidden && !card.contains(e.target) && !e.target.closest(".planet, .hint")) close(true); });

  // Toque en un planeta
  document.addEventListener("wc:planet-tap", function (e) {
    var n = e.detail && e.detail.name;
    if (MSG[n]) { if (openName === n) close(true); else open(n); }
  });

  // ---------- Pistas ----------
  var lead = $("#contacto .contact__intro");
  if (lead) {
    var hint = document.createElement("button");
    hint.type = "button"; hint.className = "hint";
    hint.innerHTML = '<svg aria-hidden="true" width="16" height="16"><use href="#i-destello"/></svg> Pista: el planeta más caliente de esta web guarda algo. Tócalo, a ver qué pasa.';
    hint.addEventListener("click", function () { open("sun", hint); });
    var socials = $("#socials");
    lead.insertBefore(hint, socials || null);
  }
  var brand = $(".footer__brand");
  if (brand) {
    var ps = document.createElement("p"); ps.className = "footer__ps";
    ps.textContent = "P. D.: los planetas no están solo de adorno.";
    brand.parentNode.insertBefore(ps, brand.nextSibling);
  }

  // Neptuno pregunta al llegar al final de las preguntas (una sola vez)
  var faqs = document.querySelectorAll("#preguntas .faq__item");
  if (faqs.length && "IntersectionObserver" in window) {
    var asked = false;
    var io = new IntersectionObserver(function (en) {
      if (asked || !en[0].isIntersecting) return;
      asked = true; io.disconnect();
      setTimeout(function () { if (card.hidden) open("neptune", null); }, 700);
    }, { threshold: 1 });
    io.observe(faqs[faqs.length - 1]);
  }
})();

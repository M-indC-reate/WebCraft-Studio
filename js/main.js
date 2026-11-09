/* =========================================================
   WebCraft Studio — contenido, interacción y movimiento
   ========================================================= */
(function () {
  "use strict";

  var C = window.WEBCRAFT_CONFIG || {};
  var root = document.documentElement;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  var PRE = C.PREAPERTURA !== false;
  var FORM_ON = C.FORMULARIO_ACTIVO === true;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var slowDevice = (function () {
    var c = navigator.connection || {};
    return !!(c.saveData || /(^|-)2g/.test(c.effectiveType || "") || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  })();

  /* =======================================================
     1. Configuración → contenido
     ======================================================= */
  root.classList.toggle("is-open", !PRE);
  var fecha = (C.FECHA_APERTURA || "").trim() || "muy pronto";
  $$("[data-fecha]").forEach(function (el) { el.textContent = fecha; });
  var ctaText = PRE ? "Avísame cuando abráis" : "Pedir presupuesto";
  $$("[data-cta]").forEach(function (el) {
    var icon = el.querySelector("svg");
    el.textContent = ctaText + (icon ? " " : "");
    if (icon) el.appendChild(icon);
  });
  $("#year").textContent = new Date().getFullYear();

  // Redes: solo se muestran las que tienen valor
  var email = (C.EMAIL || "").trim();
  var insta = (C.INSTAGRAM || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  var wa = (C.WHATSAPP || "").replace(/[^\d]/g, "");
  var socials = {
    email: email && { href: "mailto:" + email, label: email },
    instagram: insta && { href: "https://instagram.com/" + insta, label: "@" + insta },
    whatsapp: wa && { href: "https://wa.me/" + wa + "?text=" + encodeURIComponent(C.WHATSAPP_MENSAJE || ""), label: null }
  };
  $$("[data-social]").forEach(function (li) {
    var s = socials[li.dataset.social];
    if (!s) { li.remove(); return; }
    li.hidden = false;
    var a = li.querySelector("a"); a.href = s.href;
    var b = a.querySelector("b"); if (b && s.label) b.textContent = s.label;
  });
  ["#socials", "#footer-social"].forEach(function (s) { var ul = $(s); if (ul && !ul.children.length) ul.remove(); });

  function setLink(sel, url) { var a = $(sel); if (!a) return; if (url) { a.href = url; a.hidden = false; } else { a.remove(); } }
  setLink("#legal-link", C.AVISO_LEGAL_URL);
  setLink("#privacy-footer-link", C.PRIVACIDAD_URL);
  setLink("#privacy-link", C.PRIVACIDAD_URL);
  setLink("#vesta-link", C.VESTA_URL);

  /* =======================================================
     3. Cabecera, menú, mapa del viaje y botón fijo
     ======================================================= */
  var header = $("#header"), nav = $("#nav"), toggle = $("#nav-toggle");
  var hero = $("#inicio"), lenis = null, contactVisible = false, lastY = window.scrollY, ctaShown = false;

  // Botón fijo: solo tras el inicio; se esconde al bajar, vuelve al subir; nunca con el formulario a la vista
  function onScroll() {
    var y = window.scrollY, goingUp = y < lastY - 4, goingDown = y > lastY + 4;
    header.classList.toggle("is-scrolled", y > 8);
    var pastHero = hero ? hero.getBoundingClientRect().bottom < 0 : y > window.innerHeight;
    if (!pastHero || contactVisible) ctaShown = false;
    else if (goingUp) ctaShown = true;
    else if (goingDown) ctaShown = false;
    if (goingUp || goingDown) lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar el menú" : "Abrir el menú");
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { contactVisible = en[0].isIntersecting; onScroll(); }, { threshold: 0.02 }).observe(FORM_ON ? $("#contact-form") : $("#contact-alt"));
    var links = $$(".nav__list a, .journey a");
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + en.target.id;
          a.classList.toggle("is-active", on);
          if (a.closest(".journey")) { if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); }
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { navObs.observe(s); });
  }

  /* =======================================================
     4. Formulario
     Desactivado (FORMULARIO_ACTIVO: false): se oculta y se muestra el contacto por email/Instagram.
     ======================================================= */
  var form = $("#contact-form"), statusEl = $("#form-status"), submitBtn = $("#submit-btn");

  if (!FORM_ON) {
    // Sin formulario: no se muestra ni se guarda nada; en su lugar, email o Instagram (si están configurados).
    // Cuando FORMULARIO_ACTIVO pase a true, el formulario vuelve a mostrarse solo.
    form.hidden = true;
    $$("input, textarea, button", form).forEach(function (el) { el.disabled = true; });
    var alt = $("#contact-alt"), altText = $("#contact-alt-text"), ways = [];
    if (email) { var ae = $("#alt-email"); ae.href = "mailto:" + email + "?subject=" + encodeURIComponent("Avísame cuando abráis"); ae.hidden = false; ways.push("por email"); }
    if (insta) { var ai = $("#alt-instagram"); ai.href = "https://instagram.com/" + insta; ai.hidden = false; ways.push("por Instagram"); }
    if (ways.length) altText.textContent = "Mientras tanto, escríbenos " + ways.join(" o ") + ".";
    alt.hidden = false;
    var leadPre = $("#lead-pre");
    if (leadPre) leadPre.textContent = ways.length ? "¿Tienes una idea en mente? Cuéntanosla." : "Estamos preparando la apertura.";
    var soc = $("#socials"); if (soc) soc.hidden = true; // ya están en el bloque

    // Botones "Avísame cuando abráis": llevan a este bloque y lo resaltan
    $$('a[href="#contacto"]').forEach(function (a) {
      a.addEventListener("click", function () {
        setTimeout(function () { alt.classList.remove("is-attention"); void alt.offsetWidth; alt.classList.add("is-attention"); }, reduced ? 50 : 900);
      });
    });
  } else {
    function setError(field, msg) {
      var wrap = field.closest(".field, .check"); if (!wrap) return;
      wrap.classList.add("has-error"); field.setAttribute("aria-invalid", "true");
      if (wrap.classList.contains("field") && !wrap.querySelector(".field__error")) {
        var err = document.createElement("span"); err.className = "field__error"; err.id = field.id + "-err"; err.textContent = msg;
        wrap.appendChild(err); field.setAttribute("aria-describedby", err.id);
      }
    }
    function clearError(field) {
      var wrap = field.closest(".field, .check"); if (!wrap) return;
      wrap.classList.remove("has-error"); field.removeAttribute("aria-invalid");
      var err = wrap.querySelector(".field__error"); if (err) err.remove();
    }
    form.addEventListener("input", function (e) { clearError(e.target); });
    form.addEventListener("change", function (e) { clearError(e.target); });
    var validate = function () {
      var first = null;
      function fail(el, msg) { setError(el, msg); if (!first) first = el; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim())) fail(form.email, "Escribe un email válido.");
      if (!PRE && form.mensaje.value.trim().length < 10) fail(form.mensaje, "Cuéntanos un poco más (mín. 10 caracteres).");
      if (!form.consentimiento.checked) fail(form.consentimiento, "");
      if (first) first.focus();
      return !first;
    };
    var setStatus = function (text, type) { statusEl.textContent = text; statusEl.className = "form__status" + (type ? " is-" + type : ""); };
    form.addEventListener("submit", function (e) {
      e.preventDefault(); setStatus("");
      if (form.website.value) return; // honeypot
      if (!validate()) { setStatus("Revisa los campos marcados.", "error"); return; }
      if (!C.FORM_ENDPOINT) { setStatus("El formulario aún no está conectado.", "error"); return; }
      var data = { tipo: PRE ? "Lista de espera (pre-apertura)" : "Solicitud de presupuesto", email: form.email.value.trim(), nombre: form.nombre.value.trim(), negocio: form.negocio.value.trim() };
      if (!PRE) data.mensaje = form.mensaje.value.trim();
      submitBtn.disabled = true; var original = submitBtn.innerHTML; submitBtn.textContent = "Enviando…";
      fetch(C.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); setStatus(PRE ? "¡Apuntado! Te escribiremos cuando abramos." : "¡Gracias! Te respondemos lo antes posible.", "success"); })
        .catch(function () { setStatus("No se pudo enviar. Inténtalo de nuevo en un momento.", "error"); })
        .finally(function () { submitBtn.disabled = false; submitBtn.innerHTML = original; });
    });
  }

  /* =======================================================
     5. Movimiento (GSAP + ScrollTrigger + SplitText + Lenis)
     ======================================================= */
  var hasGsap = window.gsap && window.ScrollTrigger;
  var slide = $("#animacion"), card = $(".slide__card", slide);
  var captions = $$(".slide__caption", slide), progressBar = $("#seq-progress");

  if (!hasGsap || reduced || slowDevice) {
    slide.classList.add("is-static");
    return; // sin animaciones grandes: todo el contenido visible
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("motion");

  // Scroll suave solo en ordenador
  if (window.Lenis && finePointer && window.innerWidth >= 1024) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    root.classList.add("has-lenis");
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href"); if (id.length < 2) return;
        var target = $(id); if (!target) return;
        e.preventDefault();
        if (nav.classList.contains("is-open")) setMenu(false);
        lenis.scrollTo(target, { offset: -header.offsetHeight - 12, duration: 1.2 });
        history.replaceState(null, "", id);
      });
    });
  }

  // Diapositiva: se queda fija mientras la forma evoluciona y cambian las frases
  var mm = gsap.matchMedia();
  mm.add({ mobile: "(max-width: 767px)", desktop: "(min-width: 768px)" }, function (ctx) {
    var st = ScrollTrigger.create({
      trigger: slide.querySelector(".slide__pin"),
      start: "center center+=" + Math.round(header.offsetHeight / 2),
      end: "+=" + Math.round(window.innerHeight * (ctx.conditions.mobile ? 0.95 : 1.9)),
      pin: true, scrub: 0.4, anticipatePin: 1,
      onUpdate: function (self) {
        var p = self.progress;
        if (window.__metal) window.__metal.setProgress(p);
        progressBar.style.transform = "scaleX(" + p + ")";
        var k = p < 0.34 ? 0 : p < 0.68 ? 1 : 2;
        captions.forEach(function (c, j) { c.classList.toggle("is-active", j === k); });
      }
    });
    return function () { st.kill(); };
  });

  // Revelados: titulares por líneas. Al terminar se deshace el troceado,
  // así el título queda como texto normal y nunca se ve cortado.
  document.fonts.ready.then(function () {
    if (window.SplitText) {
      gsap.registerPlugin(SplitText);
      $$('[data-reveal="lines"]').forEach(function (el) {
        var split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
        gsap.from(split.lines, {
          yPercent: 105, duration: 1, ease: "expo.out", stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onComplete: function () { split.revert(); el.dispatchEvent(new CustomEvent("wc:revealed", { bubbles: true })); }
        });
      });
    }
    gsap.set('[data-reveal]:not([data-reveal="lines"])', { opacity: 0, y: 20 });
    ScrollTrigger.batch('[data-reveal]:not([data-reveal="lines"])', {
      start: "top 92%", once: true,
      onEnter: function (els) {
        var passed = [], inView = [];
        els.forEach(function (el) { (el.getBoundingClientRect().bottom < 0 ? passed : inView).push(el); });
        if (passed.length) gsap.set(passed, { opacity: 1, y: 0, overwrite: true });
        if (inView.length) gsap.to(inView, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: Math.min(0.07, 0.3 / inView.length), overwrite: true });
      }
    });
    ScrollTrigger.refresh();
  });

  // Ordenador: botones magnéticos y cursor que reacciona a los enlaces
  if (finePointer) {
    $$(".magnetic").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.2); yTo((e.clientY - r.top - r.height / 2) * 0.28);
      });
      el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
    var cursor = $(".cursor");
    root.classList.add("has-cursor");
    var cx = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3.out" });
    var cy = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3.out" });
    cursor.classList.add("is-hidden");
    window.addEventListener("pointermove", function (e) {
      cx(e.clientX); cy(e.clientY); cursor.classList.remove("is-hidden");
      cursor.classList.toggle("is-link", !!e.target.closest("a, button, summary, label, input, textarea"));
    }, { passive: true });
    document.addEventListener("pointerleave", function () { cursor.classList.add("is-hidden"); });
  }
})();

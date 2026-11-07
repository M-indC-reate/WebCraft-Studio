/* =========================================================
   WebCraft Studio — interacción y movimiento
   ========================================================= */
(function () {
  "use strict";

  var C = window.WEBCRAFT_CONFIG || {};
  var root = document.documentElement;
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  var PRE = C.PREAPERTURA !== false;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var slowDevice = (function () {
    var c = navigator.connection || {};
    if (c.saveData) return true;
    if (/(^|-)2g|3g/.test(c.effectiveType || "")) return true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return true;
    return false;
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
  if (C.ANIMACION && C.ANIMACION.MARCADOR) $("#seq-badge").hidden = false;

  /* =======================================================
     2. Cabecera, menú móvil y CTA flotante
     ======================================================= */
  var header = $("#header"), nav = $("#nav"), toggle = $("#nav-toggle"), mobileCta = $("#mobile-cta");
  var lenis = null;
  var contactVisible = false;

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    mobileCta.classList.toggle("is-visible", y > window.innerHeight * 0.7 && !contactVisible);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });
  window.addEventListener("resize", function () { if (window.innerWidth > 960 && nav.classList.contains("is-open")) setMenu(false); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { contactVisible = en[0].isIntersecting; onScroll(); }, { threshold: 0.05 }).observe($("#contacto"));
    var links = $$(".nav__list a");
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach(function (s) { navObs.observe(s); });
  }

  /* =======================================================
     3. Formulario
     ======================================================= */
  var form = $("#contact-form"), statusEl = $("#form-status"), submitBtn = $("#submit-btn");

  function setError(field, msg) {
    var wrap = field.closest(".field, .check"); if (!wrap) return;
    wrap.classList.add("has-error");
    field.setAttribute("aria-invalid", "true");
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

  function validate() {
    var first = null;
    function fail(el, msg) { setError(el, msg); if (!first) first = el; }
    $$(".has-error", form).forEach(function (w) { var f = w.querySelector("input, textarea"); if (f) clearError(f); });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim())) fail(form.email, "Escribe un email válido.");
    if (!PRE && form.mensaje.value.trim().length < 10) fail(form.mensaje, "Cuéntanos un poco más (mín. 10 caracteres).");
    if (!form.consentimiento.checked) fail(form.consentimiento, "");
    if (first) first.focus();
    return !first;
  }
  function setStatus(text, type) { statusEl.textContent = text; statusEl.className = "form__status" + (type ? " is-" + type : ""); }

  form.addEventListener("submit", function (e) {
    e.preventDefault(); setStatus("");
    if (form.website.value) return; // honeypot
    if (!validate()) { setStatus("Revisa los campos marcados.", "error"); return; }

    var data = {
      tipo: PRE ? "Lista de espera (pre-apertura)" : "Solicitud de presupuesto",
      email: form.email.value.trim(), nombre: form.nombre.value.trim(), negocio: form.negocio.value.trim()
    };
    if (!PRE) data.mensaje = form.mensaje.value.trim();
    data._subject = (PRE ? "Avísame cuando abráis — " : "Nuevo proyecto — ") + (data.nombre || data.email);

    if (!C.FORM_ENDPOINT) {
      if (email) {
        var body = Object.keys(data).filter(function (k) { return k[0] !== "_" && data[k]; }).map(function (k) { return k + ": " + data[k]; }).join("\n");
        window.location.href = "mailto:" + email + "?subject=" + encodeURIComponent(data._subject) + "&body=" + encodeURIComponent(body);
        setStatus("Abriendo tu correo…", "success");
      } else {
        // TODO: configurar FORM_ENDPOINT (Formspree) o EMAIL en js/config.js
        setStatus("El formulario aún no está activo. Vuelve en unos días: lo estamos terminando.", "error");
      }
      return;
    }

    submitBtn.disabled = true;
    var original = submitBtn.innerHTML; submitBtn.textContent = "Enviando…";
    fetch(C.FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset();
        setStatus(PRE ? "¡Apuntado! Te escribiremos cuando abramos." : "¡Gracias! Te respondemos lo antes posible.", "success");
      })
      .catch(function () { setStatus("No se pudo enviar. Inténtalo de nuevo en un momento.", "error"); })
      .finally(function () { submitBtn.disabled = false; submitBtn.innerHTML = original; });
  });

  /* =======================================================
     4. Diapositiva: secuencia de fotogramas ligada al scroll
     ======================================================= */
  var slide = $("#animacion"), card = $(".slide__card", slide), canvas = $("#seq-canvas"), still = $("#seq-still");
  var captions = $$(".slide__caption", slide), progressBar = $("#seq-progress");
  var A = C.ANIMACION || {};

  function seqInfo(mobile) {
    return mobile ? { dir: "movil", n: A.FOTOGRAMAS_MOVIL || 48 } : { dir: "escritorio", n: A.FOTOGRAMAS_ESCRITORIO || 96 };
  }
  function frameUrl(info, i) { return "assets/hero/" + info.dir + "/f_" + String(i + 1).padStart(3, "0") + ".webp"; }

  function makeStatic(mobile) {
    var info = seqInfo(mobile);
    slide.classList.add("is-static");
    still.src = frameUrl(info, info.n - 1);
  }

  function initSequence(mobile) {
    var info = seqInfo(mobile), imgs = new Array(info.n), ctx = canvas.getContext("2d");
    var current = -1, loadedAll = false;
    slide.classList.remove("is-static");

    function size() {
      var r = card.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      var c = current; current = -1; draw(c < 0 ? 0 : c);
    }
    function load(i) {
      if (imgs[i]) return imgs[i];
      var im = new Image(); im.decoding = "async"; im.src = frameUrl(info, i);
      im.onload = function () { if (i === current || current === -1) { var c = current; current = -1; draw(c < 0 ? 0 : c); } };
      imgs[i] = im; return im;
    }
    function draw(i) {
      if (i === current) return;
      // fotograma más cercano ya cargado
      var im = null;
      for (var d = 0; d < info.n; d++) {
        var a = imgs[i - d], b = imgs[i + d];
        if (a && a.complete && a.naturalWidth) { im = a; break; }
        if (b && b.complete && b.naturalWidth) { im = b; break; }
      }
      if (!im) return;
      current = i;
      var cw = canvas.width, ch = canvas.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      var w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    function loadAll() { if (loadedAll) return; loadedAll = true; for (var i = 0; i < info.n; i++) load(i); }

    load(0); size();
    // Carga diferida: el resto de fotogramas solo al acercarse a la diapositiva
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { loadAll(); io.disconnect(); } }, { rootMargin: "150% 0px" });
    io.observe(slide);
    window.addEventListener("resize", size);

    var headerH = header.offsetHeight;
    var st = ScrollTrigger.create({
      trigger: slide.querySelector(".slide__pin"),
      start: "center center+=" + Math.round(headerH / 2),
      end: "+=" + Math.round(window.innerHeight * (mobile ? 1.6 : 2.2)),
      pin: true, scrub: 0.4, anticipatePin: 1,
      onUpdate: function (self) {
        var p = self.progress;
        draw(Math.min(info.n - 1, Math.round(p * (info.n - 1))));
        progressBar.style.transform = "scaleX(" + p + ")";
        var k = p < 0.4 ? 0 : p < 0.8 ? 1 : 2;
        captions.forEach(function (c, j) { c.classList.toggle("is-active", j === k); });
      }
    });
    // Entrada suave de la tarjeta
    var intro = gsap.fromTo(card, { scale: 0.94, opacity: 0.6 }, {
      scale: 1, opacity: 1, ease: "none",
      scrollTrigger: { trigger: slide, start: "top bottom", end: "top 35%", scrub: true }
    });

    return function cleanup() {
      st.kill(); intro.scrollTrigger && intro.scrollTrigger.kill(); intro.kill(); io.disconnect();
      window.removeEventListener("resize", size); gsap.set(card, { clearProps: "all" });
    };
  }

  /* =======================================================
     5. Movimiento (GSAP + ScrollTrigger + SplitText + Lenis)
     ======================================================= */
  var hasGsap = window.gsap && window.ScrollTrigger;
  var mobileQuery = "(max-width: 640px)";

  if (!hasGsap || reduced || slowDevice) {
    makeStatic(window.matchMedia(mobileQuery).matches);
    return; // sin animaciones grandes: el contenido queda visible tal cual
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
        lenis.scrollTo(target, { offset: -header.offsetHeight - 12, duration: 1.2 });
        history.replaceState(null, "", id);
      });
    });
  }

  // Diapositiva: escritorio y móvil con fotogramas distintos
  var mm = gsap.matchMedia();
  mm.add({ mobile: mobileQuery, desktop: "(min-width: 641px)" }, function (ctx) {
    return initSequence(ctx.conditions.mobile);
  });

  // Revelados: titulares por líneas, el resto sube con un fundido
  document.fonts.ready.then(function () {
    if (window.SplitText) {
      gsap.registerPlugin(SplitText);
      $$('[data-reveal="lines"]').forEach(function (el) {
        SplitText.create(el, {
          type: "lines", mask: "lines", linesClass: "line", autoSplit: true,
          onSplit: function (self) {
            return gsap.from(self.lines, {
              yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.09,
              scrollTrigger: { trigger: el, start: "top 88%", once: true }
            });
          }
        });
      });
    }
    gsap.set('[data-reveal]:not([data-reveal="lines"])', { opacity: 0, y: 24 });
    ScrollTrigger.batch('[data-reveal]:not([data-reveal="lines"])', {
      start: "top 90%", once: true,
      onEnter: function (els) {
        // Si se salta de golpe (enlace del menú), lo que ya quedó arriba aparece sin esperar
        var passed = [], inView = [];
        els.forEach(function (el) { (el.getBoundingClientRect().bottom < 0 ? passed : inView).push(el); });
        if (passed.length) gsap.set(passed, { opacity: 1, y: 0, overwrite: true });
        if (inView.length) gsap.to(inView, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: Math.min(0.08, 0.32 / inView.length), overwrite: true });
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
        xTo((e.clientX - r.left - r.width / 2) * 0.22); yTo((e.clientY - r.top - r.height / 2) * 0.3);
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

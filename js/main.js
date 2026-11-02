(function () {
  "use strict";

  var config = window.WEBCRAFT_CONFIG || {};
  var header = document.getElementById("header");
  var nav = document.getElementById("nav");
  var toggle = document.getElementById("nav-toggle");
  var mobileCta = document.getElementById("mobile-cta");
  var contact = document.getElementById("contacto");

  document.getElementById("year").textContent = new Date().getFullYear();
  if (config.CONTACT_EMAIL) {
    var emailLink = document.getElementById("contact-email");
    emailLink.href = "mailto:" + config.CONTACT_EMAIL;
    emailLink.textContent = config.CONTACT_EMAIL;
  }

  /* ---------- Header y CTA móvil al hacer scroll ---------- */
  var contactVisible = false;
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 10);
    mobileCta.classList.toggle("is-visible", y > window.innerHeight * 0.6 && !contactVisible);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 960) setMenu(false);
  });

  /* ---------- Animaciones y enlace activo ---------- */
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    // Pequeño escalonado entre elementos hermanos
    document.querySelectorAll(".reveal").forEach(function (el) {
      var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) {
        return c.classList.contains("reveal");
      });
      el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 80 + "ms";
      revealObs.observe(el);
    });

    var links = document.querySelectorAll(".nav__list a");
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { navObs.observe(s); });

    new IntersectionObserver(function (entries) {
      contactVisible = entries[0].isIntersecting;
      onScroll();
    }, { threshold: 0.05 }).observe(contact);

    // Contadores
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach(function (el) { countObs.observe(el); });
  } else {
    document.documentElement.classList.add("no-js");
  }

  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10);
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1400, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Brillo que sigue al cursor en tarjetas ---------- */
  document.querySelectorAll(".service").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* ---------- Botones de plan → preseleccionan el formulario ---------- */
  var planSelect = document.getElementById("plan");
  var planToType = { "Landing": "Landing page", "Business": "Web corporativa", "E-commerce": "Tienda online" };
  document.querySelectorAll("[data-plan]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var plan = btn.dataset.plan;
      planSelect.value = plan;
      var radio = document.querySelector('input[name="tipo"][value="' + planToType[plan] + '"]');
      if (radio) radio.checked = true;
    });
  });

  /* ---------- Formulario ---------- */
  var form = document.getElementById("contact-form");
  var statusEl = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");
  var submitHTML = submitBtn.innerHTML;

  function setError(field, msg) {
    var wrap = field.closest(".field, .check");
    if (!wrap) return;
    wrap.classList.add("has-error");
    var err = wrap.querySelector(".field__error");
    if (!err && wrap.classList.contains("field")) {
      err = document.createElement("span");
      err.className = "field__error";
      wrap.appendChild(err);
    }
    if (err) err.textContent = msg;
  }

  function clearError(field) {
    var wrap = field.closest(".field, .check");
    if (!wrap) return;
    wrap.classList.remove("has-error");
    var err = wrap.querySelector(".field__error");
    if (err) err.remove();
  }

  form.addEventListener("input", function (e) { clearError(e.target); });
  form.addEventListener("change", function (e) { clearError(e.target); });

  function validate() {
    var ok = true;
    var first = null;
    function fail(el, msg) { setError(el, msg); ok = false; if (!first) first = el; }

    var name = form.nombre, email = form.email, msg = form.mensaje, privacy = form.privacidad;
    if (name.value.trim().length < 2) fail(name, "Indica tu nombre.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) fail(email, "Introduce un email válido.");
    var phone = form.telefono.value.trim();
    if (phone && !/^[+\d\s().-]{7,20}$/.test(phone)) fail(form.telefono, "Teléfono no válido.");
    if (!form.querySelector('input[name="tipo"]:checked')) fail(form.querySelector('input[name="tipo"]'), "Elige un tipo de web.");
    if (msg.value.trim().length < 10) fail(msg, "Cuéntanos un poco más (mín. 10 caracteres).");
    if (!privacy.checked) fail(privacy, "");

    if (first) first.focus({ preventScroll: false });
    return ok;
  }

  function collect() {
    var data = {};
    new FormData(form).forEach(function (v, k) { if (k !== "website") data[k] = String(v).trim(); });
    data.privacidad = form.privacidad.checked ? "Sí" : "No";
    return data;
  }

  function mailtoUrl(data) {
    var labels = {
      nombre: "Nombre", email: "Email", telefono: "Teléfono", empresa: "Empresa",
      tipo: "Tipo de web", presupuesto: "Presupuesto", plan: "Plan", mensaje: "Mensaje"
    };
    var body = Object.keys(labels)
      .filter(function (k) { return data[k]; })
      .map(function (k) { return labels[k] + ": " + data[k]; })
      .join("\n");
    return "mailto:" + (config.CONTACT_EMAIL || "") +
      "?subject=" + encodeURIComponent("Nuevo proyecto web — " + data.nombre) +
      "&body=" + encodeURIComponent(body);
  }

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = "form__status" + (type ? " is-" + type : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    setStatus("");
    if (form.website.value) return; // honeypot
    if (!validate()) {
      setStatus("Revisa los campos marcados.", "error");
      return;
    }

    var data = collect();

    if (!config.FORM_ENDPOINT) {
      window.location.href = mailtoUrl(data);
      setStatus("Abriendo tu cliente de correo… Si no se abre, escríbenos a " + config.CONTACT_EMAIL, "success");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando…";

    fetch(config.FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        setStatus("¡Gracias, " + data.nombre + "! Te responderemos en menos de 24 h laborables.", "success");
      })
      .catch(function () {
        setStatus("No se pudo enviar. Inténtalo de nuevo o escríbenos a " + config.CONTACT_EMAIL, "error");
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitHTML;
      });
  });
})();

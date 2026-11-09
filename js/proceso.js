/* =========================================================
   WebCraft Studio — "Cómo trabajamos": una mini web de ejemplo
   (una tienda de zapatillas inventada) que evoluciona paso a paso.

   Todas las mini webs se dibujan con la misma escena y un único valor
   de "etapa" v (0 → 4):
     0 → 1  Hablamos       bocetos en una servilleta (las notas se escriben solas)
     1 → 2  Propuesta      los garabatos se enderezan y forman el plano (wireframe)
     2 → 3  Diseño         partículas de color llenan las cajas
     3 → 4  Publicación    la web entra en una ventana de navegador (+ móvil) y brilla
   La mini web del paso k recorre v = k-1 → k al hacer scroll.
   Con "reducir movimiento" se muestran las cuatro fases fijas.
   Todo es SVG + un pequeño canvas para las partículas: sin imágenes externas.
   ========================================================= */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Con movimiento: una sola mini web fija (data-stage="0") que recorre las 4 fases mientras pasan los pasos.
  // Con "reducir movimiento": una mini web quieta en cada paso (data-stage 1-4).
  var sticky = document.querySelector(".mini[data-stage='0']"), steps = [].slice.call(document.querySelectorAll("#proceso .step"));
  var figs = reduced || !sticky ? [].slice.call(document.querySelectorAll(".step .mini[data-stage]")) : [sticky];
  if (!figs.length) return;
  var NS = "http://www.w3.org/2000/svg";
  var W = 320, H = 200, N = 44;

  /* ---------- utilidades ---------- */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(v, a, b) { return clamp((v - a) / (b - a), 0, 1); }
  function smooth(v, a, b) { var t = seg(v, a, b); return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) {
    return "rgb(" + [0, 1, 2].map(function (i) { return Math.round(lerp(c1[i], c2[i], t)); }).join(",") + ")";
  }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- la maqueta (coordenadas del plano, 320×200) ---------- */
  // Cada forma: recta (plano) y garabato (servilleta) con el mismo número de puntos → se pueden transformar una en otra.
  function rectPts(x, y, w, h) {
    // reparte los N puntos por los 4 lados incluyendo siempre las esquinas (si no, salen achaflanadas)
    var C = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], per = 2 * (w + h), pts = [], left = N - 1;
    for (var e = 0; e < 4; e++) {
      var len = e % 2 ? h : w, n = e === 3 ? left : Math.max(2, Math.round((N - 1) * len / per));
      left -= n;
      for (var i = 0; i < n; i++) { var t = i / n; pts.push([lerp(C[e][0], C[e + 1][0], t), lerp(C[e][1], C[e + 1][1], t)]); }
    }
    pts.push([x, y]);
    return pts;
  }
  function linePts(x1, y1, x2, y2) {
    var pts = [];
    for (var i = 0; i < N; i++) { var t = i / (N - 1); pts.push([lerp(x1, x2, t), lerp(y1, y2, t)]); }
    return pts;
  }
  var SHAPES = [
    // tipo, puntos rectos, "texto" (línea ondulada en el boceto)
    { k: "rect", p: rectPts(14, 12, 292, 22) },          // cabecera
    { k: "rect", p: rectPts(22, 17, 34, 12) },           // logo
    { k: "line", p: linePts(214, 23, 234, 23), wave: 1 },// menú
    { k: "line", p: linePts(242, 23, 262, 23), wave: 1 },
    { k: "line", p: linePts(270, 23, 296, 23), wave: 1 },
    { k: "line", p: linePts(24, 56, 148, 56), wave: 2.4, w: 2.2 },  // titular
    { k: "line", p: linePts(24, 71, 128, 71), wave: 2.4, w: 2.2 },
    { k: "line", p: linePts(24, 87, 150, 87), wave: 1.3 }, // texto
    { k: "line", p: linePts(24, 96, 136, 96), wave: 1.3 },
    { k: "rect", p: rectPts(24, 108, 62, 18) },          // botón
    { k: "rect", p: rectPts(170, 46, 128, 84) },         // imagen
    { k: "rect", p: rectPts(24, 144, 84, 42) },          // tarjetas
    { k: "rect", p: rectPts(118, 144, 84, 42) },
    { k: "rect", p: rectPts(212, 144, 86, 42) }
  ];
  (function makeSketch() {
    var r = rng(7);
    SHAPES.forEach(function (s, si) {
      var cx = 0, cy = 0; s.p.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= N; cy /= N;
      var rot = (r() - .5) * (s.k === "rect" ? .07 : .05), ox = (r() - .5) * 6, oy = (r() - .5) * 5;
      var ph1 = r() * 6.3, ph2 = r() * 6.3, len = Math.hypot(s.p[N - 1][0] - s.p[0][0], s.p[N - 1][1] - s.p[0][1]);
      var over = s.k === "rect" ? [4 + r() * 5, (r() - .5) * 3] : [0, 0];
      s.d = s.w || 1.2;
      s.delay = .05 + si / SHAPES.length * .5;
      s.s = s.p.map(function (q, i) {
        var t = i / (N - 1), x = q[0] - cx, y = q[1] - cy;
        var X = cx + x * Math.cos(rot) - y * Math.sin(rot) + ox, Y = cy + x * Math.sin(rot) + y * Math.cos(rot) + oy;
        if (s.wave) { Y += Math.sin(t * len / 6.5 + ph1) * s.wave; X += Math.sin(t * 9 + ph2) * .8; }
        else { X += Math.sin(t * 11 + ph1) * 1.3; Y += Math.sin(t * 13 + ph2) * 1.3; }
        if (t > .86) { var e = (t - .86) / .14; X += over[0] * e; Y += over[1] * e; } // el trazo se pasa al cerrar
        return [X, Y];
      });
    });
  })();
  function pathOf(pts) { var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1); for (var i = 1; i < pts.length; i++) d += "L" + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1); return d; }

  var INK = [47, 91, 208], BLUE = [142, 235, 250];

  /* ---------- construir el SVG de una mini web ---------- */
  function build(fig, idx) {
    var id = "mw" + idx, svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "mini__svg", "aria-hidden": "true", focusable: "false" });
    var defs = el("defs", {}, svg);
    defs.innerHTML =
      '<pattern id="' + id + 'g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="rgba(142,235,250,.13)" stroke-width=".5"/></pattern>' +
      '<pattern id="' + id + 'G" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="rgba(142,235,250,.22)" stroke-width=".7"/></pattern>' +
      '<linearGradient id="' + id + 'bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121B36"/><stop offset="1" stop-color="#0A1022"/></linearGradient>' +
      '<radialGradient id="' + id + 'img" cx=".52" cy=".45" r=".75"><stop offset="0" stop-color="#22699A"/><stop offset=".55" stop-color="#13294F"/><stop offset="1" stop-color="#0B1330"/></radialGradient>' +
      '<linearGradient id="' + id + 'sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#0A1022" stop-opacity=".3"/></linearGradient>' +
      '<linearGradient id="' + id + 'ped" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4A7E"/><stop offset="1" stop-color="#151C3A"/></linearGradient>' +
      // Zapatilla de diseño propio (marca inventada): el color de la tela es currentColor
      '<symbol id="' + id + 'sn" viewBox="0 0 100 60">' +
        '<path d="M5 42C4 34 5 24 8 16c1-3 4-4 6-2 3 5 10 7 15 3l5-8c2-3 7-3 9 0l4 6c7 9 17 14 29 16 10 1 19 4 21 11z" fill="currentColor"/>' +
        '<path d="M5 42C4 34 5 24 8 16c1-3 4-4 6-2 3 5 10 7 15 3l5-8c2-3 7-3 9 0l4 6c7 9 17 14 29 16 10 1 19 4 21 11z" fill="url(#' + id + 'sh)"/>' +
        '<path d="M10 14c4 5 14 7 19 3-5-1-13-4-19-3z" fill="rgba(10,16,34,.5)"/>' +                                   // interior de la caña
        '<path d="M5 42C4 34 5 26 7 19c4 3 9 5 13 5l2 18z" fill="rgba(10,16,34,.13)"/>' +                               // contrafuerte del talón
        '<path d="M7.2 17.5l4.2 1.2-1.2 6.5-4-1.3z" fill="var(--st, #22D3EE)"/>' +                                       // tirador
        '<path d="M33 12l14 4c7 9 15 13 25 15l-6 3c-10-2-20-7-28-14z" fill="rgba(10,16,34,.1)"/>' +                      // pala de los cordones
        '<path d="M38.5 16.5l6.5-2.5M43.5 20.5l6.5-3M49 24.5l6.5-3M55 27.8l6.5-2.6" stroke="rgba(10,16,34,.5)" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M78 31.5c10 1.5 17 5 19 10.5H74c0-4 1-8 4-10.5z" fill="rgba(255,255,255,.42)"/>' +                 // puntera
        '<path d="M22 36c14 4 30-6 46-1" stroke="var(--st, #22D3EE)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="69.5" cy="35.3" r="2.3" fill="var(--st, #22D3EE)"/>' +
        '<path d="M5 41C3 48 5 54 13 54h71c8 0 13-3 14-8 0-2-1-4-3-5z" fill="#F7F9FC"/>' +                              // mediasuela
        '<path d="M4.6 48.5C6 52 9 54 13 54h71c7 0 12-2 13.8-6.5C88 50 30 50 4.6 48.5z" fill="#AEB9CE"/>' +
        '<path d="M5 41.5h90" stroke="rgba(10,16,34,.28)" stroke-width=".8"/>' +
        '<rect x="11" y="44" width="17" height="3" rx="1.5" fill="var(--st, #22D3EE)" opacity=".85"/>' +              // cámara del talón
        '<path d="M36 45.5h7M49 45.5h7M62 45.5h7M75 45.5h7" stroke="rgba(10,16,34,.2)" stroke-width="1"/>' +
      '</symbol>' +
      '<clipPath id="' + id + 'win"><rect x="12" y="20" width="296" height="176" rx="0"/></clipPath>' +
      '<clipPath id="' + id + 'ph"><rect x="3" y="9" width="50" height="91" rx="6"/></clipPath>';

    el("rect", { width: W, height: H, fill: "#070A16" }, svg);                    // espacio (detrás de todo)
    var blueBg = el("g", {}, svg);
    el("rect", { width: W, height: H, fill: "#0A1A36" }, blueBg);
    var grid = el("g", {}, blueBg);
    el("rect", { width: W, height: H, fill: "url(#" + id + "g)" }, grid);
    el("rect", { width: W, height: H, fill: "url(#" + id + "G)" }, grid);

    var napkin = el("g", {}, svg);                                                 // servilleta
    el("rect", { width: W, height: H, fill: "#EEF0F4" }, napkin);
    el("rect", { x: 7, y: 7, width: W - 14, height: H - 14, rx: 3, fill: "none", stroke: "rgba(20,30,60,.13)", "stroke-width": 1.6, "stroke-dasharray": ".1 4.2", "stroke-linecap": "round" }, napkin);
    el("line", { x1: 160, y1: 0, x2: 160, y2: H, stroke: "rgba(20,30,60,.05)", "stroke-width": 1.2 }, napkin);
    el("line", { x1: 161.2, y1: 0, x2: 161.2, y2: H, stroke: "rgba(255,255,255,.7)", "stroke-width": .8 }, napkin);
    el("path", { d: "M252 176a22 22 0 1 1 30 18", fill: "none", stroke: "rgba(150,105,55,.16)", "stroke-width": 3, "stroke-linecap": "round" }, napkin); // marca de café

    /* Capa de color (diseño) — también es el contenido de la ventana del navegador */
    var wrap = el("g", {}, svg);            // recorte de la ventana (fuera de la transformación)
    var content = el("g", {}, wrap);
    var color = el("g", {}, content);
    color.innerHTML =
      '<rect width="320" height="200" fill="url(#' + id + 'bg)"/>' +
      '<circle cx="28" cy="23" r="4.2" fill="none" stroke="#22D3EE" stroke-width="1.4"/><circle cx="31.4" cy="20" r="1.5" fill="#F1F4FA"/>' +
      '<text x="37" y="27" class="mw-logo">Nimbo</text>' +
      '<text x="208" y="26" class="mw-nav">Nuevo</text><text x="236" y="26" class="mw-nav">Modelos</text><text x="274" y="26" class="mw-nav">Cesta</text>' +
      '<line x1="14" y1="36" x2="306" y2="36" stroke="rgba(255,255,255,.08)"/>' +
      '<text x="24" y="60" class="mw-h1">Cometa 01.</text><text x="24" y="77" class="mw-h1">Pisa <tspan fill="#22D3EE">ligero.</tspan></text>' +
      '<text x="24" y="91" class="mw-p">Zapatilla urbana con suela</text><text x="24" y="100" class="mw-p">de nube. Edición limitada.</text>' +
      '<rect x="24" y="108" width="62" height="18" rx="9" fill="#22D3EE"/><text x="55" y="119.6" class="mw-btn">Ver modelo</text>' +
      // Imagen: la zapatilla flota sobre un pedestal, con un anillo que la orbita
      '<rect x="170" y="46" width="128" height="84" rx="8" fill="url(#' + id + 'img)"/>' +
      '<g fill="rgba(255,255,255,.7)"><circle cx="182" cy="62" r=".8"/><circle cx="201" cy="53" r=".6"/><circle cx="286" cy="58" r=".8"/><circle cx="290" cy="96" r=".6"/><circle cx="178" cy="100" r=".6"/></g>' +
      '<ellipse cx="236" cy="122" rx="42" ry="6.5" fill="url(#' + id + 'ped)"/><ellipse cx="236" cy="120.5" rx="42" ry="6" fill="#2B3767" stroke="rgba(142,235,250,.35)" stroke-width=".6"/>' +
      '<ellipse cx="236" cy="120.5" rx="26" ry="3" fill="rgba(4,8,20,.55)" class="mw-shadow"/>' +
      '<g class="mw-float">' +
        '<ellipse cx="236" cy="86" rx="56" ry="14" transform="rotate(-10 236 86)" fill="none" stroke="rgba(142,235,250,.4)" stroke-width=".9"/>' +
        '<use href="#' + id + 'sn" x="191" y="53" width="92" height="55.2" color="#EEF2F8" transform="rotate(-10 236 82)"/>' +
        '<ellipse cx="236" cy="86" rx="56" ry="14" transform="rotate(-10 236 86)" fill="none" stroke="#8EEBFA" stroke-width="1.1" pathLength="2" stroke-dasharray="1 1"/>' +
        '<circle cx="182" cy="97" r="2.6" fill="#F1F4FA"/>' +
      '</g>' +
      ['Blanco:#EEF2F8:24', 'Coral:#FF8A7A:118', 'Lima:#B6F36B:212'].map(function (c) {
        var a = c.split(":"), x = +a[2];
        return '<rect x="' + x + '" y="144" width="' + (x === 212 ? 86 : 84) + '" height="42" rx="7" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.09)"/>' +
          '<use href="#' + id + 'sn" x="' + (x + 6) + '" y="147" width="36" height="21.6" color="' + a[1] + '"' + (a[0] === 'Blanco' ? '' : ' style="--st:#F1F4FA"') + '/>' +
          '<text x="' + (x + 47) + '" y="162" class="mw-card">' + a[0] + '</text>' +
          '<line x1="' + (x + 8) + '" y1="176" x2="' + (x + 62) + '" y2="176" stroke="rgba(255,255,255,.16)" stroke-width="3" stroke-linecap="round"/>';
      }).join("");

    /* Garabatos ↔ plano */
    var lines = el("g", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    var paths = SHAPES.map(function () { return el("path", { pathLength: 1 }, lines); });
    // Extras del boceto: zapatilla dibujada, flecha y notas a mano
    var sketchX = el("g", { fill: "none", stroke: "rgb(47,91,208)", "stroke-width": 1.3, "stroke-linecap": "round" }, svg);
    var SK = "translate(196 60) scale(.8)"; // la zapatilla del boceto usa las mismas coordenadas que el dibujo final
    var doodles = [
      { d: "M5 42C4 34 5 24 8 16c1-3 4-4 6-2 3 5 10 7 15 3l5-8c2-3 7-3 9 0l4 6c7 9 17 14 29 16 10 1 19 4 21 11z", t: SK },
      { d: "M5 42C3 48 5 54 13 54h71c8 0 13-3 14-8M39 16l6-2M44 20l6-3M50 24l6-3M22 36c14 4 30-6 46-1", t: SK },
      { d: "M96 126l-6 -4 7 -1" }
    ].map(function (o) { var e = el("path", { d: o.d, pathLength: 1 }, sketchX); if (o.t) e.setAttribute("transform", o.t); return e; });
    var notes = [
      { x: 25, y: 27, t: "Nimbo", s: 10, r: -3 },
      { x: 92, y: 121, t: "botón: ¡ver!", s: 10, r: -4 },
      { x: 174, y: 141, t: "¡zapatilla en 3D!", s: 10.5, r: -3 },
      { x: 220, y: 47, t: "¿que flote?", s: 9.5, r: 6 }
    ].map(function (n, i) {
      var c = el("clipPath", { id: id + "n" + i }, defs), cr = el("rect", { x: n.x - 4, y: n.y - n.s - 4, width: 0, height: n.s + 10 }, c);
      var t = el("text", { x: n.x, y: n.y, class: "mw-note", "font-size": n.s, transform: "rotate(" + n.r + " " + n.x + " " + n.y + ")", "clip-path": "url(#" + id + "n" + i + ")" }, svg);
      t.textContent = n.t;
      return { el: t, clip: cr, w: n.t.length * n.s * .5 + 10 };
    });

    /* Detalles del plano: aspas de la imagen y etiquetas */
    var blueX = el("g", { stroke: "rgb(142,235,250)", "stroke-width": .8, fill: "none" }, svg);
    var cross = [el("path", { d: "M170 46L298 130", pathLength: 1 }, blueX), el("path", { d: "M298 46L170 130", pathLength: 1 }, blueX)];
    var labels = el("g", { class: "mw-label" }, svg);
    labels.innerHTML = '<text x="62" y="26">CABECERA</text><text x="24" y="47">TÍTULO</text><text x="176" y="56">IMAGEN</text><text x="92" y="120">BOTÓN</text><text x="24" y="140">TARJETAS ×3</text>' +
      '<path d="M170 138v4M298 138v4M170 140H298" stroke="rgba(142,235,250,.6)" stroke-width=".6"/>';
    var labelEls = [].slice.call(labels.children);

    /* Navegador (publicación) y móvil */
    var chrome = el("g", {}, svg);
    chrome.innerHTML =
      '<rect x="12" y="4" width="296" height="192" rx="9" fill="#141A2C" stroke="rgba(255,255,255,.14)"/>' +
      '<circle cx="23" cy="12" r="2.4" fill="#FF5F57"/><circle cx="31" cy="12" r="2.4" fill="#FEBC2E"/><circle cx="39" cy="12" r="2.4" fill="#28C840"/>' +
      '<rect x="96" y="7" width="128" height="10" rx="5" fill="rgba(0,0,0,.35)"/>' +
      '<path d="M138 10.6v-.8a1.6 1.6 0 0 1 3.2 0v.8M137.4 10.6h4.4v3.4h-4.4z" fill="none" stroke="#8B95AD" stroke-width=".7"/>' +
      '<text x="145" y="14.2" class="mw-url">nimbo.ejemplo</text>';
    svg.insertBefore(chrome, wrap); // el marco va detrás del contenido
    var phone = el("g", {}, svg);
    phone.innerHTML =
      '<rect x="0" y="0" width="56" height="109" rx="9" fill="#0B0F1C" stroke="rgba(255,255,255,.22)"/>' +
      '<g clip-path="url(#' + id + 'ph)"><rect x="3" y="9" width="50" height="91" fill="url(#' + id + 'bg)"/>' +
      '<circle cx="9" cy="15" r="2" fill="none" stroke="#22D3EE" stroke-width="1"/><rect x="13" y="13.6" width="14" height="3" rx="1.5" fill="#F1F4FA"/>' +
      '<rect x="7" y="24" width="38" height="4" rx="2" fill="#F1F4FA"/><rect x="7" y="31" width="28" height="4" rx="2" fill="#22D3EE"/>' +
      '<rect x="7" y="40" width="42" height="28" rx="4" fill="url(#' + id + 'img)"/><use href="#' + id + 'sn" x="10" y="43" width="36" height="21.6" color="#EEF2F8" transform="rotate(-10 28 54)"/>' +
      '<rect x="7" y="74" width="30" height="8" rx="4" fill="#22D3EE"/><rect x="7" y="87" width="40" height="2.4" rx="1.2" fill="rgba(255,255,255,.18)"/></g>' +
      '<rect x="22" y="3.5" width="12" height="2.4" rx="1.2" fill="rgba(255,255,255,.2)"/>';

    fig.appendChild(svg);
    var canvas = null;
    var stage = +fig.getAttribute("data-stage");
    if ((stage === 3 || stage === 0) && !reduced) { canvas = document.createElement("canvas"); canvas.className = "mini__fx"; fig.appendChild(canvas); }
    if (stage === 4 || stage === 0) { var holo = document.createElement("div"); holo.className = "mini__holo"; fig.appendChild(holo); }

    return { id: id, wrap: wrap, fig: fig, stage: stage, svg: svg, blueBg: blueBg, grid: grid, napkin: napkin, content: content, color: color, paths: paths,
      doodles: doodles, sketchX: sketchX, notes: notes, cross: cross, blueX: blueX, labels: labelEls, chrome: chrome, phone: phone,
      canvas: canvas, parts: canvas ? makeParticles() : null, last: -1, shone: false };
  }

  /* ---------- partículas (fase 2 → 3): salen del borde de cada caja y la rellenan ---------- */
  function makeParticles() {
    var r = rng(11), out = [], small = window.innerWidth < 700;
    function add(n, box, colors, inside) {
      n = Math.round(n * (small ? .7 : 1));
      for (var i = 0; i < n; i++) {
        var t, sx, sy, per = r() * 4;
        // salida: un punto del borde de la caja
        if (per < 1) { sx = box[0] + per * box[2]; sy = box[1]; } else if (per < 2) { sx = box[0] + box[2]; sy = box[1] + (per - 1) * box[3]; }
        else if (per < 3) { sx = box[0] + (per - 2) * box[2]; sy = box[1] + box[3]; } else { sx = box[0]; sy = box[1] + (per - 3) * box[3]; }
        do { t = [box[0] + r() * box[2], box[1] + r() * box[3]]; } while (inside && !inside(t[0], t[1]));
        out.push({ sx: sx, sy: sy, tx: t[0], ty: t[1], c: colors[(r() * colors.length) | 0], d: r() * .32, bend: (r() - .5) * 26, s: 1.4 + r() * 1.4 });
      }
    }
    add(70, [170, 46, 128, 84], ["#22699A", "#1B4B7A", "#16305A", "#8EEBFA"]);
    add(90, [170, 46, 128, 84], ["#EEF2F8", "#DCE3EE", "#F7F9FC", "#22D3EE"], function (x, y) { var dx = (x - 236) / 42, dy = (y - 84 + (x - 236) * .17) / 20; return dx * dx + dy * dy < 1; });
    add(40, [24, 108, 62, 18], ["#22D3EE", "#5EE5F5", "#A5F3FC"]);
    add(46, [24, 50, 128, 28], ["#F1F4FA", "#DCE3EE", "#22D3EE"]);
    add(20, [24, 84, 126, 16], ["#9AA6BF", "#C6CEDD"]);
    add(54, [24, 144, 274, 42], ["#EEF2F8", "#FF8A7A", "#B6F36B", "#2A3352", "#3A4466"]);
    add(24, [14, 12, 292, 22], ["#22D3EE", "#F1F4FA", "#9AA6BF"]);
    return out;
  }
  function drawParticles(m, pp) {
    var cv = m.canvas, w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext("2d"), k = cv.width / W;
    ctx.clearRect(0, 0, cv.width, cv.height);
    var fade = 1 - smooth(pp, .7, .96);
    if (pp <= 0 || fade <= 0) return;
    for (var i = 0; i < m.parts.length; i++) {
      var p = m.parts[i], t = seg(pp, p.d, p.d + .5);
      if (t <= 0) continue;
      var e = easeOut(t), x = lerp(p.sx, p.tx, e), y = lerp(p.sy, p.ty, e);
      var dx = p.tx - p.sx, dy = p.ty - p.sy, L = Math.hypot(dx, dy) || 1, b = Math.sin(Math.PI * e) * p.bend * .3;
      x += -dy / L * b; y += dx / L * b;
      ctx.globalAlpha = Math.min(1, t * 5) * fade;
      ctx.fillStyle = p.c;
      var s = p.s * (1.6 - .6 * e) * k;
      ctx.fillRect(x * k - s / 2, y * k - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- pintar la escena en la etapa v ---------- */
  function draw(m, v) {
    if (Math.abs(v - m.last) < .0005) return;
    m.last = v;
    var napkinA = 1 - smooth(v, 1, 1.45);
    m.napkin.style.opacity = napkinA;
    m.napkin.style.display = napkinA <= 0 ? "none" : "";
    m.blueBg.style.display = v >= 3 ? "none" : "";
    m.grid.style.opacity = smooth(v, 1.15, 1.8);

    // garabatos → líneas del plano
    var u = easeInOut(seg(v, 1, 1.75)), lineA = 1 - smooth(v, 2.55, 2.95);
    var col = mix(INK, BLUE, smooth(v, 1, 1.5));
    m.paths.forEach(function (p, i) {
      var s = SHAPES[i], pts = s.s.map(function (q, j) { return [lerp(q[0], s.p[j][0], u), lerp(q[1], s.p[j][1], u)]; });
      p.setAttribute("d", pathOf(pts));
      p.setAttribute("stroke", col);
      p.setAttribute("stroke-width", lerp(s.w ? 1.9 : 1.35, s.w ? 1.4 : .9, u));
      var dr = easeOut(seg(v, s.delay * .9, s.delay * .9 + .32));
      if (dr >= 1) p.removeAttribute("stroke-dasharray"); else { p.setAttribute("stroke-dasharray", "1 1"); p.setAttribute("stroke-dashoffset", 1 - dr); }
      p.style.opacity = lineA;
      p.style.display = lineA <= 0 || dr <= 0 ? "none" : "";
    });
    // dibujos y notas a mano (se escriben solos y se borran al pasar al plano)
    var skA = 1 - smooth(v, 1, 1.35);
    m.sketchX.style.opacity = skA;
    m.sketchX.style.display = skA <= 0 ? "none" : "";
    m.doodles.forEach(function (d, i) { var t = easeOut(seg(v, .45 + i * .08, .7 + i * .08)); d.setAttribute("stroke-dasharray", "1 1"); d.setAttribute("stroke-dashoffset", 1 - t); });
    m.notes.forEach(function (n, i) {
      var t = seg(v, .35 + i * .14, .62 + i * .14);
      n.clip.setAttribute("width", (n.w * t).toFixed(1));
      n.el.style.opacity = skA;
      n.el.style.display = skA <= 0 || t <= 0 ? "none" : "";
    });
    // detalles del plano
    var bxA = lineA;
    m.blueX.style.display = v < 1.3 || bxA <= 0 ? "none" : "";
    m.blueX.style.opacity = bxA;
    m.cross.forEach(function (c, i) { c.setAttribute("stroke-dasharray", "1 1"); c.setAttribute("stroke-dashoffset", 1 - easeOut(seg(v, 1.4 + i * .1, 1.75 + i * .1))); });
    m.labels.forEach(function (l, i) { var a = smooth(v, 1.55 + i * .06, 1.75 + i * .06) * lineA; l.style.opacity = a; l.style.display = a <= 0 ? "none" : ""; });

    // color (diseño)
    var cA = smooth(v, 2.6, 2.95);
    m.wrap.style.display = cA <= 0 ? "none" : "";
    m.color.style.opacity = cA;
    if (m.canvas) drawParticles(m, clamp(v - 2, 0, 1));

    // navegador y móvil (publicación)
    var b = easeInOut(seg(v, 3.05, 3.6)), sc = lerp(1, .925, b);
    m.content.setAttribute("transform", "translate(" + lerp(0, 12, b).toFixed(2) + " " + lerp(0, 20, b).toFixed(2) + ") scale(" + sc.toFixed(4) + ")");
    if (b > 0) m.wrap.setAttribute("clip-path", "url(#" + m.id + "win)"); else m.wrap.removeAttribute("clip-path");
    m.chrome.style.opacity = smooth(v, 3.05, 3.45);
    m.chrome.style.display = v <= 3.05 ? "none" : "";
    var ph = easeOut(seg(v, 3.45, 3.95));
    m.phone.setAttribute("transform", "translate(" + lerp(330, 252, ph).toFixed(1) + " " + lerp(96, 84, ph).toFixed(1) + ")");
    m.phone.style.display = ph <= 0 ? "none" : "";
    if ((m.stage === 4 || m.stage === 0) && v >= 3.98 && !m.shone && !reduced) { m.shone = true; m.fig.classList.add("is-shine"); }
  }

  /* ---------- montaje y scroll ---------- */
  var minis = figs.map(build);

  if (reduced || figs[0] !== sticky) { minis.forEach(function (m) { draw(m, m.stage); m.fig.classList.add("is-static"); }); return; }

  document.documentElement.classList.add("mini-scrub");
  var m = minis[0], visible = false, ticking = false, active = -1;
  var wrap = document.querySelector(".steps-wrap"), stageEl = document.querySelector(".proc-stage");
  var dots = [].slice.call(document.querySelectorAll(".proc-dots i"));
  steps.forEach(function (st) { st.removeAttribute("data-reveal"); }); // el paso visible lo decide el scroll
  // La sección se queda fija como una diapositiva: el recorrido se reparte en 4 tramos, uno por paso.
  // En cada tramo se ve solo su texto y la mini web pasa a su fase en el primer 60 % del tramo.
  function setHeader() {
    var h = document.getElementById("header"), hh = h ? h.offsetHeight : 72;
    // se queda fija centrada en el hueco que deja la cabecera
    document.documentElement.style.setProperty("--proc-top", Math.round(hh + Math.max(8, (window.innerHeight - hh - stageEl.offsetHeight) / 2)) + "px");
  }
  setHeader();
  function stageNow() {
    var top = parseFloat(getComputedStyle(stageEl).top) || 0, r = wrap.getBoundingClientRect();
    var D = Math.max(1, wrap.offsetHeight - stageEl.offsetHeight), p = clamp((top - r.top) / D, 0, 1) * 4;
    var cur = Math.min(3, Math.floor(p)), v = cur + clamp((p - cur) / .6, 0, 1);
    if (cur !== active) {
      active = cur;
      steps.forEach(function (st, i) { st.classList.toggle("is-current", i === cur); st.classList.toggle("is-past", i < cur); });
      dots.forEach(function (d, i) { d.classList.toggle("is-on", i <= cur); });
    }
    return v;
  }
  function update() { ticking = false; if (visible) draw(m, stageNow()); }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  draw(m, stageNow());
  window.addEventListener("load", function () { setHeader(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setHeader(); onScroll(); });
  new IntersectionObserver(function (en) { visible = en[0].isIntersecting; draw(m, stageNow()); }, { rootMargin: "80px 0px" }).observe(document.querySelector("#proceso"));
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { setHeader(); m.last = -1; onScroll(); });
})();

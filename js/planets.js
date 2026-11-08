/* =========================================================
   WebCraft Studio — Planetas
   Un único lienzo WebGL se coloca en la sección visible y dibuja
   su planeta (misma luz y acabado para todos). Solo se carga la
   textura del planeta cercano. Parallax suave y rotación muy lenta.
   Texturas: assets/planetas/*.webp (generadas con tools/planetas).
   ========================================================= */
(function () {
  "use strict";

  var slots = Array.prototype.slice.call(document.querySelectorAll(".planet-slot"));
  if (!slots.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = function () { return window.innerWidth < 768; };

  // tipo: 0 planeta · 1 Sol · 2 planeta con anillos
  var PLANETS = {
    earth:   { tex: "earth",   rim: [0.35, 0.62, 1.0], tilt: 0.41, speed: 0.022, kind: 0, r: 0.86 },
    moon:    { tex: "moon",    rim: [0.62, 0.64, 0.7], tilt: 0.12, speed: 0.012, kind: 0, r: 0.86 },
    mars:    { tex: "mars",    rim: [0.95, 0.58, 0.42], tilt: 0.44, speed: 0.02, kind: 0, r: 0.86 },
    jupiter: { tex: "jupiter", rim: [0.95, 0.8, 0.6], tilt: 0.05, speed: 0.03, kind: 0, r: 0.86 },
    saturn:  { tex: "saturn",  rim: [0.95, 0.85, 0.62], tilt: 0.47, speed: 0.028, kind: 2, r: 0.44 },
    neptune: { tex: "neptune", rim: [0.42, 0.58, 1.0], tilt: 0.49, speed: 0.024, kind: 0, r: 0.86 },
    sun:     { tex: null,      rim: [1.0, 0.62, 0.28], tilt: 0.12, speed: 0.01, kind: 1, r: 0.66 }
  };

  var canvas = document.createElement("canvas");
  canvas.className = "planet";
  canvas.setAttribute("aria-hidden", "true");
  var gl = null;
  try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (e) {}
  if (!gl) return; // sin WebGL no hay planetas: la web funciona igual

  var VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  var FS = [
    "precision highp float;",
    "uniform sampler2D uTex; uniform vec2 uRes; uniform float uRot, uTilt, uKind, uR, uTime, uHasTex; uniform vec3 uRim;",
    // ruido para el Sol
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}",
    "float snoise(vec3 v){ const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);",
    " vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);",
    " vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);",
    " vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));",
    " float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);",
    " vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);",
    " vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    " vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);",
    " vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;",
    " vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m; return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }",
    // anillos tipo Saturno (perfil radial con división de Cassini)
    "vec4 ring(float rr){",
    " if(rr<1.28||rr>2.3) return vec4(0.0);",
    " float a=0.25+0.55*smoothstep(1.28,1.55,rr);",
    " a*=1.0-0.92*smoothstep(1.93,1.95,rr)*(1.0-smoothstep(2.0,2.02,rr));",
    " a*=1.0-smoothstep(2.15,2.3,rr); a*=0.85+0.15*sin(rr*160.0);",
    " vec3 c=mix(vec3(0.78,0.7,0.56),vec3(0.9,0.84,0.7),smoothstep(1.5,2.1,rr)); return vec4(c,a*0.8); }",
    "void main(){",
    " vec2 p=(gl_FragCoord.xy/uRes)*2.0-1.0;",
    " vec3 L=normalize(vec3(-0.62,0.42,0.66));",
    " float r=length(p)/uR; vec4 col=vec4(0.0);",
    // anillos: elipse inclinada
    " float ct=cos(uTilt), st=sin(uTilt);",
    " vec2 pr=vec2(ct*p.x+st*p.y, -st*p.x+ct*p.y)/uR;",
    " float open=0.34; float rr=length(vec2(pr.x, pr.y/open)); vec4 rg=vec4(0.0);",
    " if(uKind>1.5) rg=ring(rr);",
    " bool ringFront = pr.y < 0.0;",
    " if(uKind>1.5 && (r>=1.0 || !ringFront) ){ col.rgb=rg.rgb*rg.a*0.85; col.a=rg.a; }",
    " if(r<1.0){",
    "  vec3 n=vec3(p/uR, sqrt(1.0-r*r));",
    "  vec3 q=vec3(ct*n.x+st*n.y, -st*n.x+ct*n.y, n.z);",
    "  float lon=atan(q.z,q.x)+uRot; float lat=asin(clamp(q.y,-1.0,1.0));",
    "  vec2 uv=vec2(fract(lon/6.2831853), 0.5-lat/3.1415926);",
    "  vec3 c; float mu=n.z;",
    "  if(uKind>0.5 && uKind<1.5){",
    "   vec3 sp=q*2.2; float t=uTime*0.03;",
    "   float big=snoise(sp+vec3(t,-t,0.0))*0.5+snoise(sp*2.2-vec3(t))*0.25;",
    "   float gr=snoise(q*22.0+vec3(0.0,t*3.0,0.0));",
    "   float k=0.6+big*0.35+gr*0.12;",
    "   c=mix(vec3(0.72,0.28,0.07),vec3(0.95,0.58,0.2),smoothstep(0.2,0.7,k)); c=mix(c,vec3(1.0,0.82,0.5),smoothstep(0.75,1.05,k));",
    "   c*=0.55+0.45*pow(mu,0.5); c*=0.78;",
    "  } else {",
    "   c=uHasTex>0.5 ? texture2D(uTex,uv).rgb : vec3(0.3);",
    "   float d=dot(n,L); float lit=smoothstep(-0.18,0.55,d);",
    "   c*=0.05+0.95*lit;",
    "   float lum=dot(c,vec3(0.299,0.587,0.114)); c=mix(c,vec3(lum),0.22)*0.8;",
    "   c+=uRim*pow(1.0-mu,3.0)*0.5*(0.25+0.75*smoothstep(-0.3,0.5,d));",
    "  }",
    "  float aa=1.0-smoothstep(1.0-2.5/(uR*uRes.y*0.5),1.0,r);",
    "  col=vec4(c*aa,aa)+col*(1.0-aa);",
    "  if(uKind>1.5 && ringFront && rg.a>0.0){ col.rgb=mix(col.rgb, rg.rgb*0.85, rg.a); col.a=max(col.a,rg.a); }",
    // sombra del planeta sobre el anillo (lado opuesto a la luz)
    " }",
    // halo exterior (atmósfera o corona)
    " if(r>=0.96){",
    "  float g=uKind>0.5&&uKind<1.5 ? exp(-(r-1.0)*5.0)*0.55 : exp(-(r-1.0)*16.0)*0.32;",
    "  float side=uKind>0.5&&uKind<1.5 ? 1.0 : 0.35+0.65*smoothstep(-0.6,0.6,dot(normalize(p),L.xy));",
    "  g*=1.0-smoothstep(0.78,0.98,length(p));",
    "  vec3 h=uRim*g*side; col.rgb+=h*(1.0-col.a*0.6); col.a=max(col.a, g*side*0.9);",
    " }",
    " gl_FragColor=col;",
    "}"
  ].join("\n");

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ["uTex", "uRes", "uRot", "uTilt", "uKind", "uR", "uTime", "uHasTex", "uRim"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.uTex, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* ---------- Texturas: solo la del planeta cercano ---------- */
  var textures = {};
  function loadTex(name, cb) {
    if (!name) { cb && cb(null); return; }
    if (textures[name]) { if (textures[name].ready) cb && cb(textures[name]); else textures[name].cbs.push(cb); return; }
    var t = textures[name] = { ready: false, cbs: [cb], tex: null };
    var img = new Image(); img.decoding = "async";
    img.onload = function () {
      t.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      t.ready = true; t.cbs.forEach(function (f) { f && f(t); }); t.cbs = [];
    };
    img.src = "assets/planetas/" + name + (isMobile() ? "-m" : "") + ".webp";
  }

  /* ---------- Estado ---------- */
  var current = null, slotNow = null, rot = Math.random() * 6.28, quality = 1, running = false;
  var frameTimes = [], last = 0, visible = new Map();

  function size() {
    if (!slotNow) return;
    var r = slotNow.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 2) * quality;
    var w = Math.max(64, Math.round(r.width * dpr)), h = Math.max(64, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  function draw(t) {
    if (!current) return;
    var P = PLANETS[current];
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    var tx = P.tex && textures[P.tex] && textures[P.tex].ready ? textures[P.tex].tex : null;
    if (tx) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx); }
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uRot, rot); gl.uniform1f(U.uTilt, P.tilt); gl.uniform1f(U.uKind, P.kind);
    gl.uniform1f(U.uR, P.r); gl.uniform1f(U.uTime, t / 1000); gl.uniform1f(U.uHasTex, tx ? 1 : 0);
    gl.uniform3f(U.uRim, P.rim[0], P.rim[1], P.rim[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Parallax: el planeta sube más despacio que el texto (limitado para no invadir el contenido)
  function parallax() {
    if (!slotNow || reduced) return;
    var r = slotNow.getBoundingClientRect();
    var c = r.top + r.height / 2 - window.innerHeight / 2;
    var lim = isMobile() ? 10 : 60, k = isMobile() ? 0.03 : 0.12;
    // hacia arriba (hacia el hueco entre secciones) hasta `lim`; hacia su propio contenido, muy poco
    var ty = Math.max(-lim, Math.min(lim * 0.25, -c * k));
    canvas.style.transform = "translate3d(0," + ty.toFixed(1) + "px,0)";
  }

  function loop(t) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden) return;
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016; last = t;
    rot += dt * PLANETS[current].speed;
    // calidad automática: si va lento, menos resolución
    frameTimes.push(dt); if (frameTimes.length > 60) {
      var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length; frameTimes = [];
      if (avg > 0.028 && quality > 0.55) { quality -= 0.15; size(); }
    }
    parallax();
    draw(t);
  }

  function activate(slot) {
    if (slot === slotNow) return;
    var name = slot.getAttribute("data-planet");
    canvas.classList.remove("is-on");
    setTimeout(function () {
      slotNow = slot; current = name;
      slot.appendChild(canvas); size(); parallax();
      loadTex(PLANETS[name].tex, function () {
        if (current !== name) return;
        draw(performance.now()); canvas.classList.add("is-on");
        if (!reduced && !running) { running = true; last = 0; requestAnimationFrame(loop); }
      });
    }, slotNow ? 350 : 0);
  }

  // El planeta más visible se lleva el lienzo; el siguiente se precarga
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible.set(e.target, e.isIntersecting ? e.intersectionRatio : 0); });
    var best = null, br = 0;
    visible.forEach(function (ratio, el) { if (ratio > br) { br = ratio; best = el; } });
    if (best) activate(best);
    else if (running) { running = false; canvas.classList.remove("is-on"); }
  }, { threshold: [0, 0.15, 0.3, 0.5, 0.75, 1] });
  var pre = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) loadTex(PLANETS[e.target.getAttribute("data-planet")].tex); });
  }, { rootMargin: "120% 0px" });
  slots.forEach(function (s) { io.observe(s); pre.observe(s); });

  window.addEventListener("resize", function () { size(); if (!running) draw(performance.now()); });
  window.addEventListener("scroll", function () { if (reduced || !running) return; }, { passive: true });

  // Para generar imágenes fijas del mismo render (herramientas)
  window.__planetStill = function (name, px) {
    return new Promise(function (res) {
      current = name; canvas.width = canvas.height = px || 600; gl.viewport(0, 0, canvas.width, canvas.height);
      loadTex(PLANETS[name].tex, function () { draw(12000); res(canvas.toDataURL("image/png")); });
    });
  };
})();

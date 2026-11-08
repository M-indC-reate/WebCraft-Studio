/* =========================================================
   WebCraft Studio — Diapositiva: metal líquido de roca volcánica
   Raymarching en WebGL: una gota de obsidiana/basalto satinada,
   con destellos minerales y reflejo acero / bronce apagado, que
   flota en el vacío iluminada por un borde de luz.
   El scroll la hace evolucionar: idea (gota) → forma a medida →
   un portátil de metal plateado. Al final la pantalla se enciende con
   el logo (HTML nítido encima del lienzo). Reacciona al ratón o al dedo.
   ========================================================= */
(function () {
  "use strict";

  var slide = document.getElementById("animacion");
  var canvas = document.getElementById("metal-canvas");
  if (!slide || !canvas) return;
  var card = slide.querySelector(".slide__card");
  var screen = slide.querySelector(".slide__screen");
  var mobile = function () { return window.innerWidth < 768; };
  var forceVert = null;

  // Tamaño del portátil y encuadre según la forma de la tarjeta (vertical u horizontal)
  function geom() {
    var r = card.getBoundingClientRect(), vert = forceVert != null ? forceVert : r.height > r.width;
    return { vert: vert, k: vert ? 1.12 : 1.5, s: vert ? 1.4 : 1.0, y: vert ? 0.06 : 0.14, w: r.width, h: r.height };
  }
  // Coloca el logo (HTML nítido) exactamente sobre la pantalla del portátil, que al final queda de frente
  function placeScreen() {
    if (!screen) return;
    var g = geom(); if (!g.w || !g.h) return;
    var f = 1.55 / 3.6 / g.s;                    // proyección de la cámara a la distancia de la pantalla
    var cy = 0.18 * g.k + g.y, hw = 0.585 * g.k, hh = 0.365 * g.k;
    screen.style.left = (50 - hw * f * g.h / g.w * 100) + "%";
    screen.style.width = (hw * 2 * f * g.h / g.w * 100) + "%";
    screen.style.top = (50 - (cy + hh) * f * 100) + "%";
    screen.style.height = (hh * 2 * f * 100) + "%";
    screen.style.fontSize = (hh * 2 * f * g.h * 0.085).toFixed(1) + "px";
  }
  window.addEventListener("resize", placeScreen);
  placeScreen();

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slow = (function () {
    var c = navigator.connection || {};
    return !!(c.saveData || /(^|-)2g/.test(c.effectiveType || "") || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  })();
  var forceStill = /[?&]metalfijo/.test(location.search);
  function makeStatic() { slide.classList.add("is-static"); if (screen) screen.style.opacity = 1; window.__metal = { setProgress: function () {}, static: true }; }
  if ((reduced || slow || forceStill) && !window.__metalRender) { makeStatic(); return; }

  var gl = null;
  try { gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: !!window.__metalRender, powerPreference: "high-performance" }); } catch (e) {}
  if (!gl) { makeStatic(); return; }

  

  var VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes, uMouse; uniform float uTime, uProg, uVert, uSteps, uK, uS, uY; uniform vec3 uAccent;",
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
    "mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }",
    "float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r; }",
    "float hash13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }",
    // forma: gota (idea) → forma retorcida (a medida) → portátil (tu web)
    "float sdBox2(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }",
    // coordenadas locales del portátil: gira suavemente y al final queda de frente
    "vec3 lapQ(vec3 p){ float a=1.0-smoothstep(0.62,0.97,uProg); float t=uTime*0.3;",
    " vec3 q=(p-vec3(0.0,uY,-0.5))/uK; q.xz*=rot(a*(-0.7+0.12*sin(t*0.4))); q.yz*=rot(a*0.25); return q; }",
    "float sdLaptop(vec3 q){",
    " float scr=sdRoundBox(q-vec3(0.0,0.18,0.0), vec3(0.62,0.4,0.018), 0.03);",
    " float base=sdRoundBox(q-vec3(0.0,-0.235,0.38), vec3(0.66,0.016,0.4), 0.02);",
    " return min(scr,base); }",
    "float map(vec3 p){",
    " float t=uTime*0.3; float P=uProg;",
    " float s1=1.0-smoothstep(0.22,0.5,P); float s3=smoothstep(0.6,0.92,P); float s2=(1.0-s1)*(1.0-s3);",
    " vec3 m=vec3(uMouse*vec2(1.25,0.85),0.55); float bulge=exp(-dot(p-m,p-m)*3.2)*0.16;",
    " vec3 q=p; q.xz*=rot(0.35*sin(t*0.5)+P*1.4); q.xy*=rot(0.12*sin(t*0.37));",
    " q.xz*=rot(q.y*s2*1.3);",
    " float rad=mix(0.5,0.8,smoothstep(0.0,0.45,P));",
    " float n=snoise(q*1.5+vec3(0.0,t,0.0))*0.55+snoise(q*3.1-vec3(t*0.6))*0.2;",
    " vec3 st=mix(vec3(1.0), vec3(1.25,0.85,0.9), s2);",
    " float blob=length(q/st)*min(st.x,min(st.y,st.z))-rad-n*mix(0.1,0.2,s2)-bulge;",
    " float lap=sdLaptop(lapQ(p))*uK-n*0.004*(1.0-smoothstep(0.85,1.0,P))-bulge*0.3*(1.0-s3);",
    " return mix(blob,lap,s3);",
    "}",
    "vec3 calcN(vec3 p){ vec2 e=vec2(0.0025,-0.0025);",
    " return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx)); }",
    // entorno: vacío oscuro con una franja de luz acero y un rebote bronce muy bajo
    "vec3 env(vec3 r){",
    " vec3 c=mix(vec3(0.006,0.008,0.014),vec3(0.03,0.036,0.05),smoothstep(-0.3,0.9,r.y));",
    " c+=vec3(0.62,0.68,0.76)*smoothstep(0.75,0.97,1.0-abs(r.y-0.5)*2.2)*smoothstep(0.1,-0.6,r.x)*0.75;",
    " c+=vec3(0.42,0.32,0.22)*smoothstep(0.55,1.0,-r.y)*smoothstep(-0.2,0.6,r.x)*0.28;",
    " return c; }",
    "vec3 sky(vec2 uv){",
    " vec3 c=mix(vec3(0.0035,0.0045,0.008),vec3(0.0012,0.0016,0.003),length(uv)*0.9);",
    " vec2 g=floor(uv*vec2(160.0)); float s=hash13(vec3(g,7.0)); c+=step(0.996,s)*0.05*vec3(0.85,0.9,1.0);",
    " return c; }",
    "void main(){",
    " vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y*uS;",
    " vec3 ro=vec3(0.0,0.0,3.1); vec3 rd=normalize(vec3(uv,-1.55));",
    " vec3 col=sky(uv);",
    // halo suave detrás: el objeto iluminado en el vacío
    " col+=vec3(0.006,0.008,0.012)*exp(-dot(uv,uv)*3.0);",
    " float b=dot(ro,rd); float c=dot(ro,ro)-4.4; float disc=b*b-c;",
    " if(disc>0.0){",
    "  float tt=max(0.0,-b-sqrt(disc)); float hit=-1.0;",
    "  for(int i=0;i<96;i++){ if(float(i)>=uSteps) break; vec3 pp=ro+rd*tt; float d=map(pp); if(d<0.0008){ hit=tt; break; } tt+=d*0.9; if(tt>6.0) break; }",
    "  if(hit>0.0){",
    "   vec3 pos=ro+rd*hit; vec3 N=calcN(pos); vec3 V=-rd; vec3 R=reflect(rd,N);",
    "   float ndv=max(dot(N,V),0.0); float fres=0.04+0.96*pow(1.0-ndv,5.0);",
    "   vec3 base=vec3(0.004,0.0045,0.005);",
    "   vec3 e=env(R); vec3 eb=env(normalize(R+N*0.6));",
    "   vec3 m=base+eb*0.05+e*(0.1+0.75*fres);",
    "   vec3 L1=normalize(vec3(-0.55,0.7,0.55)); vec3 L2=normalize(vec3(0.75,-0.35,0.45));",
    "   m+=pow(max(dot(R,L1),0.0),60.0)*vec3(0.85,0.9,0.96)*0.9;",
    "   m+=pow(max(dot(R,L1),0.0),10.0)*vec3(0.5,0.55,0.62)*0.05;",
    "   m+=pow(max(dot(R,L2),0.0),28.0)*vec3(0.62,0.47,0.32)*0.35;",
    // borde de luz (contraluz)
    "   float rim=pow(1.0-ndv,2.6)*smoothstep(-0.1,0.7,dot(N,normalize(vec3(0.15,0.55,-0.8))));",
    "   m+=rim*vec3(0.62,0.68,0.78)*0.55;",
    // destellos minerales
    "   float sp=step(0.994,hash13(floor(pos*150.0)))*pow(max(dot(R,L1),0.0),3.0)*(0.4+0.6*fres);",
    "   m+=sp*vec3(0.9,0.93,1.0)*0.6;",
    // al final: portátil de aluminio plateado, pantalla de cristal y teclado
    "   float s3=smoothstep(0.6,0.92,uProg);",
    "   if(s3>0.01){",
    "    vec3 q=lapQ(pos);",
    "    vec3 silver=vec3(0.2,0.205,0.215)*(0.25+0.75*max(dot(N,L1),0.0))+env(R)*3.0*(0.6+0.4*fres)+pow(max(dot(R,L1),0.0),70.0)*vec3(1.0)*2.2+pow(max(dot(R,L1),0.0),10.0)*vec3(0.75,0.78,0.82)*0.3+pow(max(dot(R,L2),0.0),22.0)*vec3(0.85,0.87,0.9)*0.5;",
    "    silver+=rim*vec3(0.75,0.8,0.88)*0.5;",
    "    vec3 matc=silver;",
    // pantalla (cara delantera)
    "    float front=step(0.008,q.z)*step(-0.24,q.y);",
    "    float scr=front*(1.0-smoothstep(-0.004,0.002,sdBox2(q.xy-vec2(0.0,0.18),vec2(0.585,0.365),0.012)));",
    "    float on=smoothstep(0.86,1.0,uProg);",
    "    vec3 glass=vec3(0.006,0.008,0.013)+env(R)*0.08*fres+pow(max(dot(R,L1),0.0),140.0)*0.25;",
    "    glass+=uAccent*0.03*on*max(0.0,1.0-length((q.xy-vec2(0.0,0.18))*vec2(1.2,1.8)));",
    "    matc=mix(matc,glass,scr);",
    // cámara
    "    float cam=front*(1.0-smoothstep(0.006,0.009,length(q.xy-vec2(0.0,0.565))));",
    "    matc=mix(matc,vec3(0.01),cam);",
    // teclado y panel táctil en la base
    "    float top=step(-0.222,q.y)*step(q.y,-0.2)*step(q.z,0.79);",
    "    float kb=top*step(abs(q.x),0.54)*step(0.06,q.z)*step(q.z,0.38);",
    "    vec2 kg=fract(vec2(q.x*16.0,q.z*15.0)); float key=step(0.12,kg.x)*step(kg.x,0.88)*step(0.14,kg.y)*step(kg.y,0.86);",
    "    matc=mix(matc, mix(vec3(0.015),vec3(0.03)+env(R)*0.15,key), kb);",
    "    float tp=top*(1.0-smoothstep(-0.002,0.002,sdBox2(vec2(q.x,q.z-0.6),vec2(0.17,0.11),0.02)));",
    "    matc=mix(matc, silver*0.82, tp);",
    "    m=mix(m,matc,s3);",
    "   }",
    "   col=m;",
    "  }",
    " }",
    " col=col/(1.0+col); col=pow(col,vec3(0.4545));",
    " col*=1.0-0.35*dot(uv,uv);",
    " gl_FragColor=vec4(col,1.0);",
    "}"
  ].join("\n");

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { makeStatic(); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ["uRes", "uMouse", "uTime", "uProg", "uVert", "uSteps", "uK", "uS", "uY", "uAccent"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  function accent() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22D3EE";
    var n = parseInt(c.replace("#", ""), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  var progT = 0, progC = 0, mouseT = [0, 0], mouseC = [0, 0], quality = 1, times = [], last = 0, inView = false, running = false;

  // Resolución nítida: densidad de píxeles real limitada (1,5 en móvil, 1,75 en ordenador)
  function size() {
    var r = card.getBoundingClientRect();
    var d = Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 1.75) * quality;
    // tope de píxeles para mantener la fluidez (nítido, pero sin pasarse)
    var budget = mobile() ? 520000 : 1300000; d = Math.min(d, Math.sqrt(budget / Math.max(1, r.width * r.height)));
    canvas.width = Math.max(64, Math.round(r.width * d)); canvas.height = Math.max(64, Math.round(r.height * d));
    gl.viewport(0, 0, canvas.width, canvas.height);
    placeScreen();
  }
  function render(t) {
    var g = geom();
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uMouse, mouseC[0], mouseC[1]);
    gl.uniform1f(U.uTime, t / 1000); gl.uniform1f(U.uProg, progC);
    var a = accent(); gl.uniform3f(U.uAccent, a[0], a[1], a[2]);
    gl.uniform1f(U.uVert, g.vert ? 1 : 0); gl.uniform1f(U.uK, g.k); gl.uniform1f(U.uS, g.s); gl.uniform1f(U.uY, g.y);
    gl.uniform1f(U.uSteps, mobile() ? 72 : 96);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    screen.style.opacity = Math.max(0, Math.min(1, (progC - 0.86) / 0.12)).toFixed(3);
  }
  function loop(t) {
    if (!inView) { running = false; return; }
    requestAnimationFrame(loop);
    var dt = last ? (t - last) / 1000 : 0.016; last = t;
    progC += (progT - progC) * Math.min(1, dt * 5);
    mouseC[0] += (mouseT[0] - mouseC[0]) * Math.min(1, dt * 3); mouseC[1] += (mouseT[1] - mouseC[1]) * Math.min(1, dt * 3);
    times.push(dt); if (times.length > 45) {
      var avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length; times = [];
      if (avg > 0.028 && quality > 0.6) { quality = Math.max(0.6, quality - 0.1); size(); }
    }
    render(t);
  }

  // Ratón o dedo: la gota se deforma hacia él
  function pointer(e) {
    var r = card.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width * 2 - 1, y = -((e.clientY - r.top) / r.height * 2 - 1);
    mouseT[0] = x * (r.width / r.height) * 0.5; mouseT[1] = y * 0.5;
  }
  card.addEventListener("pointermove", pointer, { passive: true });
  card.addEventListener("pointerdown", pointer, { passive: true });
  card.addEventListener("pointerleave", function () { mouseT = [0, 0]; });

  new IntersectionObserver(function (en) {
    inView = en[0].isIntersecting;
    if (inView && !running) { running = true; last = 0; requestAnimationFrame(loop); }
  }, { rootMargin: "20% 0px" }).observe(card);
  window.addEventListener("resize", size);
  size();

  window.__metal = { setProgress: function (p) { progT = p; } };
  // Para generar la imagen fija con el mismo efecto (herramientas)
  window.__metalRender = window.__metalRender || null;
  window.__metalStill = function (p, w, h, vert) { progT = progC = p; forceVert = vert; canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); render(9000); forceVert = null; return canvas.toDataURL("image/webp", 0.88); };
})();

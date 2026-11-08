/* =========================================================
   WebCraft Studio — Diapositiva: metal líquido de roca volcánica
   Raymarching en WebGL: una gota de obsidiana/basalto satinada,
   con destellos minerales y reflejo acero / bronce apagado, que
   flota en el vacío iluminada por un borde de luz.
   El scroll la hace evolucionar (idea → forma → web) y reacciona
   al ratón o al dedo. Sin vídeo.
   ========================================================= */
(function () {
  "use strict";

  var slide = document.getElementById("animacion");
  var canvas = document.getElementById("metal-canvas");
  if (!slide || !canvas) return;
  var card = slide.querySelector(".slide__card");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slow = (function () {
    var c = navigator.connection || {};
    return !!(c.saveData || /(^|-)2g/.test(c.effectiveType || "") || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  })();
  var forceStill = /[?&]metalfijo/.test(location.search);
  function makeStatic() { slide.classList.add("is-static"); window.__metal = { setProgress: function () {}, static: true }; }
  if ((reduced || slow || forceStill) && !window.__metalRender) { makeStatic(); return; }

  var gl = null;
  try { gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: !!window.__metalRender, powerPreference: "high-performance" }); } catch (e) {}
  if (!gl) { makeStatic(); return; }

  var mobile = function () { return window.innerWidth < 768; };

  var VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes, uMouse; uniform float uTime, uProg, uVert, uSteps; uniform sampler2D uLogo; uniform vec3 uAccent;",
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
    // forma: gota (idea) → forma retorcida (a medida) → panel tipo pantalla (tu web)
    "vec3 panelQ(vec3 p){ float t=uTime*0.3; vec3 bq=p; bq.xz*=rot(-0.62+0.1*sin(t*0.4)); bq.yz*=rot(0.22); bq.xy*=rot(-0.06); return bq; }",
    "vec3 panelS(){ return uVert>0.5 ? vec3(0.44,0.88,0.04) : vec3(0.92,0.58,0.045); }",
    "float sdBox2(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }",
    "float map(vec3 p){",
    " float t=uTime*0.3; float P=uProg;",
    " float s1=1.0-smoothstep(0.22,0.5,P); float s3=smoothstep(0.6,0.92,P); float s2=(1.0-s1)*(1.0-s3);",
    " vec3 m=vec3(uMouse*vec2(1.25,0.85),0.55); float bulge=exp(-dot(p-m,p-m)*3.2)*0.16;",
    " vec3 q=p; q.xz*=rot(0.35*sin(t*0.5)+P*1.4); q.xy*=rot(0.12*sin(t*0.37));",
    " q.xz*=rot(q.y*s2*1.3);",
    " float rad=mix(0.5,0.8,smoothstep(0.0,0.45,P));",
    " float n=snoise(q*1.5+vec3(0.0,t,0.0))*0.55+snoise(q*3.1-vec3(t*0.6))*0.2;",
    " vec3 st=mix(vec3(1.0), uVert>0.5 ? vec3(0.8,1.12,0.8) : vec3(1.25,0.85,0.9), s2);",
    " float blob=length(q/st)*min(st.x,min(st.y,st.z))-rad-n*mix(0.1,0.2,s2)-bulge;",
    " vec3 bq=panelQ(p); vec3 bs=panelS();",
    " float panel=sdRoundBox(bq,bs,uVert>0.5?0.09:0.06)-n*0.006-bulge*0.4;",
    " return mix(blob,panel,s3);",
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
    " vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y*(uVert>0.5?1.5:1.0);",
    " vec3 ro=vec3(0.0,0.0,3.1); vec3 rd=normalize(vec3(uv,-1.55));",
    " vec3 col=sky(uv);",
    // halo suave detrás: el objeto iluminado en el vacío
    " col+=vec3(0.006,0.008,0.012)*exp(-dot(uv,uv)*3.0);",
    " float b=dot(ro,rd); float c=dot(ro,ro)-2.1; float disc=b*b-c;",
    " if(disc>0.0){",
    "  float tt=max(0.0,-b-sqrt(disc)); float hit=-1.0;",
    "  for(int i=0;i<64;i++){ if(float(i)>=uSteps) break; vec3 pp=ro+rd*tt; float d=map(pp); if(d<0.0015){ hit=tt; break; } tt+=d*0.85; if(tt>5.0) break; }",
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
    // al final la forma es un móvil (o una pantalla): marco de metal plateado y pantalla de cristal con el logo
    "   float s3=smoothstep(0.6,0.92,uProg);",
    "   if(s3>0.01){",
    "    vec3 bq=panelQ(pos); vec3 bs=panelS(); vec2 inner=bs.xy-vec2(uVert>0.5?0.03:0.04);",
    "    float face=smoothstep(bs.z*0.55,bs.z*0.85,abs(bq.z));",
    "    float scr=face*(1.0-smoothstep(-0.006,0.004,sdBox2(bq.xy,inner,uVert>0.5?0.07:0.045)));",
    // plata: base clara, reflejo nítido del entorno y brillos fuertes
    "    vec3 silver=vec3(0.16,0.165,0.175)*(0.2+0.8*max(dot(N,L1),0.0))+env(R)*3.4*(0.6+0.4*fres)+pow(max(dot(R,L1),0.0),70.0)*vec3(1.0)*2.4+pow(max(dot(R,L1),0.0),12.0)*vec3(0.75,0.78,0.82)*0.35+pow(max(dot(R,L2),0.0),22.0)*vec3(0.85,0.87,0.9)*0.6;",
    "    silver+=rim*vec3(0.75,0.8,0.88)*0.6;",
    // pantalla: cristal muy oscuro con un brillo suave y el logo al encenderse
    "    vec2 luv=vec2(bq.x/(inner.x*2.0)+0.5, 0.5-bq.y/(inner.y*2.0));",
    "    vec4 logo=texture2D(uLogo, luv);",
    "    float on=smoothstep(0.86,1.0,uProg);",
    "    vec3 glass=vec3(0.004,0.005,0.008)+env(R)*0.1*fres+pow(max(dot(R,L1),0.0),120.0)*0.35;",
    "    glass+=uAccent*0.018*on*max(0.0,1.0-length((luv-0.5)*2.0));",
    "    glass+=logo.rgb*logo.a*on*1.15;",
    "    if(uVert>0.5){ float cam=1.0-smoothstep(0.011,0.015,length((luv-vec2(0.5,0.035))*vec2(inner.x/inner.y,1.0))); glass=mix(glass,vec3(0.0)+env(R)*0.25,cam); }",
    "    vec3 phone=mix(silver,glass,scr);",
    "    m=mix(m,phone,s3);",
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
  var U = {}; ["uRes", "uMouse", "uTime", "uProg", "uVert", "uSteps", "uLogo", "uAccent"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  /* ---------- Logo de WebCraft Studio para la pantalla del móvil ---------- */
  function accent() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22D3EE";
    var n = parseInt(c.replace("#", ""), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  var logoTex = gl.createTexture(), logoVert = null;
  function buildLogo() {
    var vert = mobile(); logoVert = vert;
    var W = vert ? 512 : 1024, H = vert ? Math.round(512 * 0.85 / 0.41) : Math.round(1024 * 0.54 / 0.88);
    var c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
    var acc = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#22D3EE";
    var size = vert ? W * 0.42 : H * 0.36, cx = W / 2, cy = vert ? H * 0.44 : H * 0.42;
    // la W del logo (mismo trazo que el icono)
    x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 64, size / 64);
    var path = function () { x.beginPath(); x.moveTo(11, 18); x.lineTo(19.5, 46); x.lineTo(26.5, 28.5); x.lineTo(32, 46); x.lineTo(37.5, 28.5); x.lineTo(44.5, 46); x.lineTo(53, 18); };
    x.lineCap = "round"; x.lineJoin = "round";
    x.shadowColor = acc; x.shadowBlur = 14; x.strokeStyle = acc; x.globalAlpha = 0.55; x.lineWidth = 11.5; path(); x.stroke();
    x.shadowBlur = 0; x.globalAlpha = 1; x.strokeStyle = "#ECEAE6"; x.lineWidth = 7; path(); x.stroke();
    x.restore();
    // nombre de la marca
    x.fillStyle = "#ECEAE6"; x.textAlign = "center"; x.textBaseline = "middle";
    var fs = vert ? W * 0.085 : H * 0.085;
    x.font = "700 " + fs + "px Syne, 'Arial Black', sans-serif";
    x.fillText("WebCraft", cx, cy + size * 0.72);
    x.fillStyle = "rgba(236,234,230,0.6)"; x.font = "600 " + (fs * 0.62) + "px Syne, 'Arial Black', sans-serif";
    x.fillText("STUDIO", cx, cy + size * 0.72 + fs * 1.05);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, logoTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  buildLogo(); gl.uniform1i(U.uLogo, 0);
  if (document.fonts) document.fonts.ready.then(buildLogo);

  var progT = 0, progC = 0, mouseT = [0, 0], mouseC = [0, 0], quality = mobile() ? 0.5 : 0.62, times = [], last = 0, inView = false, running = false;

  function size() {
    var r = card.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(64, Math.round(r.width * dpr * quality)); canvas.height = Math.max(64, Math.round(r.height * dpr * quality));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function render(t) {
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uMouse, mouseC[0], mouseC[1]);
    gl.uniform1f(U.uTime, t / 1000); gl.uniform1f(U.uProg, progC);
    if (logoVert !== mobile()) buildLogo();
    var a = accent(); gl.uniform3f(U.uAccent, a[0], a[1], a[2]);
    gl.uniform1f(U.uVert, mobile() ? 1 : 0); gl.uniform1f(U.uSteps, mobile() ? 40 : 64);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(t) {
    if (!inView) { running = false; return; }
    requestAnimationFrame(loop);
    var dt = last ? (t - last) / 1000 : 0.016; last = t;
    progC += (progT - progC) * Math.min(1, dt * 5);
    mouseC[0] += (mouseT[0] - mouseC[0]) * Math.min(1, dt * 3); mouseC[1] += (mouseT[1] - mouseC[1]) * Math.min(1, dt * 3);
    times.push(dt); if (times.length > 45) {
      var avg = times.reduce(function (a, b) { return a + b; }, 0) / times.length; times = [];
      if (avg > 0.026 && quality > 0.3) { quality = Math.max(0.3, quality - 0.1); size(); }
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
  window.__metalStill = function (p, w, h) { progT = progC = p; quality = 1; canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); render(9000); return canvas.toDataURL("image/webp", 0.86); };
})();

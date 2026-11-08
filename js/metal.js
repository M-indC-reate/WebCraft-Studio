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
    return { vert: vert, k: vert ? 1.2 : 1.36, s: vert ? 1.4 : 1.0, y: vert ? 0.16 : 0.2, w: r.width, h: r.height };
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
    // portátil realista: tapa fina con cantos redondeados, bisagra y base en cuña abierta a ~105°
    "float sdSlab(vec3 p, vec2 b, float rc, float h, float re){ float d2=sdBox2(p.xy,b,rc); vec2 w=vec2(d2+re,abs(p.z)-h+re); return length(max(w,0.0))+min(max(w.x,w.y),0.0)-re; }",
    "const float TILT=0.21;",
    "vec3 baseQ(vec3 q){ vec3 r=q-vec3(0.0,-0.236,0.0); float c=cos(TILT), s=sin(TILT); return vec3(r.x, c*r.y+s*r.z, -s*r.y+c*r.z); }",
    "float sdLaptop(vec3 q){",
    " float lid=sdSlab(q-vec3(0.0,0.18,0.0), vec2(0.62,0.4), 0.03, 0.011, 0.007);",
    " vec3 b=baseQ(q); float th=mix(0.017,0.010,clamp(b.z/0.8,0.0,1.0));",
    " float base=sdSlab(vec3(b.x,b.z-0.4,b.y+th), vec2(0.66,0.4), 0.035, th, 0.008);",
    " vec3 hq=q-vec3(0.0,-0.228,-0.004); float hinge=max(length(hq.yz)-0.013, abs(hq.x)-0.5);",
    " return min(min(lid,base),hinge); }",
    "float map(vec3 p){",
    " float t=uTime*0.3; float P=uProg;",
    " if(P>=0.92) return sdLaptop(lapQ(p))*uK;",
    " float s1=1.0-smoothstep(0.22,0.5,P); float s3=smoothstep(0.6,0.92,P); float s2=(1.0-s1)*(1.0-s3);",
    " vec3 m=vec3(uMouse*vec2(1.25,0.85),0.55); float bulge=exp(-dot(p-m,p-m)*3.2)*0.16;",
    " vec3 q=p; q.xz*=rot(0.35*sin(t*0.5)+P*1.4); q.xy*=rot(0.12*sin(t*0.37));",
    " q.xz*=rot(q.y*s2*1.3);",
    " float rad=mix(0.5,0.8,smoothstep(0.0,0.45,P));",
    " float n=snoise(q*1.5+vec3(0.0,t,0.0))*0.55+snoise(q*3.1-vec3(t*0.6))*0.2;",
    " vec3 st=mix(vec3(1.0), vec3(1.25,0.85,0.9), s2);",
    " float blob=length(q/st)*min(st.x,min(st.y,st.z))-rad-n*mix(0.1,0.2,s2)-bulge;",
    " float lap=sdLaptop(lapQ(p))*uK-n*0.004*(1.0-smoothstep(0.72,0.86,P))-bulge*0.3*(1.0-smoothstep(0.6,0.8,P));",
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
    // estudio de fotografía de producto: ventana de luz grande arriba, tiras laterales y relleno cálido
    "vec3 studio(vec3 r){",
    " vec3 c=vec3(0.012,0.014,0.02)+vec3(0.02,0.024,0.032)*smoothstep(-0.4,0.6,r.y);",
    " c+=vec3(0.95,0.97,1.0)*smoothstep(0.25,0.8,r.y)*smoothstep(1.05,0.35,abs(r.x+0.15))*0.85;",
    " c+=vec3(0.8,0.85,0.95)*exp(-pow((r.x+0.82)*3.5,2.0))*smoothstep(-0.3,0.4,r.y)*0.55;",
    " c+=vec3(1.0,0.86,0.7)*exp(-pow((r.x-0.85)*4.0,2.0))*smoothstep(-0.5,0.3,r.y)*0.22;",
    " return c; }",
    "float calcAO(vec3 p, vec3 n){ float o=0.0, w=1.0; for(int i=1;i<=4;i++){ float h=0.012*float(i*i); o+=(h-map(p+n*h))*w; w*=0.6; } return clamp(1.0-o*6.0,0.25,1.0); }",
    "void main(){",
    " vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y*uS;",
    " vec3 ro=vec3(0.0,0.0,3.1); vec3 rd=normalize(vec3(uv,-1.55));",
    " vec3 col=sky(uv);",
    // halo suave detrás: el objeto iluminado en el vacío
    " col+=vec3(0.006,0.008,0.012)*exp(-dot(uv,uv)*3.0);",
    // resplandor de la pantalla encendida en la oscuridad
    " float onG=smoothstep(0.86,1.0,uProg); if(onG>0.0){ vec2 sc=vec2(0.0,(0.18*uK+uY)*1.55/3.6); vec2 hs=vec2(0.585,0.365)*uK*1.55/3.6;",
    "  float gd=max(sdBox2(uv-sc,hs,0.02),0.0); col+=uAccent*0.016*onG*exp(-gd*7.0); }",
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
    "    vec3 q=lapQ(pos); vec3 bq=baseQ(q);",
    "    float ao=calcAO(pos,N); float on=smoothstep(0.86,1.0,uProg);",
    // aluminio microgranallado: reflejo ancho y suave + destello fino, con grano muy leve
    "    float grain=hash13(floor(pos*900.0))*0.06-0.03;",
    "    vec3 Rr=normalize(mix(R,N,0.35));",
    "    vec3 alb=vec3(0.56,0.57,0.59)*(1.0+grain);",
    "    float dif=0.25+0.75*max(dot(N,L1),0.0);",
    "    vec3 silver=alb*(studio(N)*0.32+dif*0.06)+studio(Rr)*(0.3+0.7*fres)*1.05+pow(max(dot(R,L1),0.0),90.0)*1.6;",
    "    vec3 Lp=normalize(vec3(-1.4,1.9,1.8)-pos); vec3 Hh=normalize(Lp+V);",
    "    silver+=alb*max(dot(N,Lp),0.0)*0.12+vec3(0.9,0.93,1.0)*(pow(max(dot(N,Hh),0.0),28.0)*0.35+pow(max(dot(N,Hh),0.0),300.0)*0.8);",
    "    silver*=ao;",
    "    vec3 matc=silver;",
    // tapa: cristal negro de borde a borde con la pantalla encendida dentro
    "    vec2 lp=q.xy-vec2(0.0,0.18);",
    "    float lidF=step(0.006,q.z)*step(-0.215,q.y);",
    "    float bez=lidF*(1.0-smoothstep(-0.002,0.001,sdBox2(lp,vec2(0.608,0.388),0.024)));",
    "    float scr=lidF*(1.0-smoothstep(-0.002,0.0015,sdBox2(lp,vec2(0.585,0.365),0.006)));",
    "    vec3 glassR=studio(R)*(0.004+0.3*fres)+pow(max(dot(R,L1),0.0),160.0)*0.4;",
    "    vec3 bezel=vec3(0.0015,0.0017,0.0022)+glassR;",
    "    float vg=1.0-length(lp*vec2(1.25,1.9));",
    "    vec3 disp=mix(vec3(0.002,0.003,0.006),vec3(0.004,0.007,0.016),on)+uAccent*0.022*on*max(0.0,vg)*max(0.0,vg)+glassR*0.5;",
    "    disp+=vec3(0.006,0.008,0.014)*on*smoothstep(0.4,-0.4,lp.y);",
    "    matc=mix(matc,bezel,bez); matc=mix(matc,disp,scr);",
    "    float cam=lidF*(1.0-smoothstep(0.004,0.0065,length(lp-vec2(0.0,0.376))));",
    "    matc=mix(matc,vec3(0.012,0.014,0.02)+glassR*2.0,cam);",
    // bisagra oscura
    "    float hz=step(length(vec2(q.y+0.228,q.z+0.004)),0.0145)*step(q.y,-0.214)*step(abs(q.x),0.5);",
    // base: teclado, altavoces y panel táctil sobre la cara superior
    "    float topF=step(-0.004,bq.y)*step(bq.y,0.008)*step(-0.01,bq.z)*step(abs(bq.x),0.64);",
    "    float u=bq.x, v=bq.z;",
    "    float well=topF*(1.0-smoothstep(-0.002,0.001,sdBox2(vec2(u,v-0.215),vec2(0.505,0.168),0.012)));",
    "    float rh=0.0535; float row=floor((v-0.052)/rh); float kw=1.0/14.0;",
    "    float sh=row==1.0?0.0:row==2.0?0.35:row==3.0?0.55:row==4.0?0.8:0.0;",
    "    float cx=u+0.5-sh*kw; vec2 cell=vec2(fract(cx/kw)-0.5, fract((v-0.052)/rh)-0.5);",
    "    float kd=sdBox2(cell*vec2(kw,rh),vec2(kw*0.5-0.0065,rh*(row==0.0?0.3:0.5)-0.0065),0.005);",
    "    float space=row==5.0?(1.0-smoothstep(-0.001,0.001,sdBox2(vec2(u,(fract((v-0.052)/rh)-0.5)*rh),vec2(0.19,rh*0.5-0.0065),0.005))):0.0;",
    "    float key=(row==5.0&&abs(u)<0.2)?space:(1.0-smoothstep(-0.0012,0.0008,kd));",
    "    key*=step(0.0,row)*step(row,5.0)*step(abs(u),0.497);",
    "    vec3 cap=vec3(0.006,0.0065,0.008)+studio(Rr)*0.018+pow(max(dot(R,L1),0.0),40.0)*0.03;",
    "    matc*=mix(1.0,mix(1.08,0.78,clamp(v/0.8,0.0,1.0)),topF);",
    "    matc=mix(matc, silver*0.45, well);",
    "    matc=mix(matc, cap*ao, well*key);",
    "    float spk=topF*step(0.53,abs(u))*step(abs(u),0.615)*step(0.06,v)*step(v,0.37);",
    "    vec2 hg=fract(vec2(u,v)/0.011)-0.5; float hole=1.0-smoothstep(0.17,0.24,length(hg));",
    "    matc=mix(matc, silver*0.25, spk*hole);",
    "    float tpd=sdBox2(vec2(u,v-0.6),vec2(0.21,0.125),0.016);",
    "    float tp=topF*(1.0-smoothstep(-0.001,0.001,tpd)); float tpe=topF*(1.0-smoothstep(0.0,0.0025,abs(tpd)));",
    "    matc=mix(matc, silver*0.9+studio(R)*0.05, tp); matc=mix(matc, silver*0.55, tpe);",
    // luz de la pantalla sobre el teclado
    "    matc+=topF*on*(uAccent*0.05+vec3(0.02,0.025,0.035))*exp(-max(v,0.0)*5.0);",
    "    matc=mix(matc, vec3(0.02,0.021,0.024)+studio(R)*0.12, hz);",
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

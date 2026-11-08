/* =========================================================
   WebCraft Studio — Planetas
   Un único lienzo WebGL se coloca en la sección visible y dibuja
   su planeta. Misma luz y acabado para todos:
   · textura base (assets/planetas, con mipmaps) + detalle fino
     calculado al momento a la resolución de la pantalla
   · nubes y bandas que se mueven, océanos que reflejan la luz,
     relieve en los rocosos, atmósfera en el borde
   · el Sol, dibujado en vivo: granulación, manchas y corona
   Se puede girar arrastrando en horizontal (ratón o dedo).
   ========================================================= */
(function () {
  "use strict";

  var slots = Array.prototype.slice.call(document.querySelectorAll(".planet-slot"));
  if (!slots.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = function () { return window.innerWidth < 768; };

  // kind: 0 rocoso · 1 Sol · 2 gaseoso con anillos · 3 gaseoso · 4 Tierra
  var PLANETS = {
    earth:   { tex: "earth",   rim: [0.36, 0.62, 1.0], tilt: 0.41, speed: 0.07, kind: 4, r: 0.84, detail: 0.08 },
    moon:    { tex: "moon",    rim: [0.6, 0.62, 0.68], tilt: 0.12, speed: 0.05, kind: 0, r: 0.86, detail: 0.14 },
    mars:    { tex: "mars",    rim: [0.95, 0.6, 0.45], tilt: 0.44, speed: 0.07, kind: 0, r: 0.86, detail: 0.12 },
    jupiter: { tex: "jupiter", rim: [0.95, 0.82, 0.62], tilt: 0.05, speed: 0.09, kind: 3, r: 0.86, detail: 0.05 },
    saturn:  { tex: "saturn",  rim: [0.95, 0.86, 0.64], tilt: 0.47, speed: 0.08, kind: 2, r: 0.44, detail: 0.04 },
    neptune: { tex: "neptune", rim: [0.42, 0.6, 1.0], tilt: 0.49, speed: 0.08, kind: 3, r: 0.86, detail: 0.05 },
    sun:     { tex: null,      rim: [1.0, 0.6, 0.25], tilt: 0.12, speed: 0.03, kind: 1, r: 0.56, detail: 0 }
  };

  var canvas = document.createElement("canvas");
  canvas.className = "planet";
  canvas.setAttribute("aria-hidden", "true");
  var gl = null;
  try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true }); } catch (e) {}
  if (!gl) return;

  var VS = "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }";
  var FS = [
    "precision highp float;",
    "uniform sampler2D uTex; uniform vec2 uRes, uTexel; uniform float uRot, uTilt, uKind, uR, uTime, uHasTex, uDetail; uniform vec3 uRim;",
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
    "float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }",
    // celdas de granulación solar (Voronoi 3D): centros brillantes y bordes oscuros
    "vec3 h33(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }",
    "vec2 cells(vec3 p, float t){ vec3 i=floor(p), f=fract(p); float d1=8.0, d2=8.0;",
    " for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){ vec3 g=vec3(float(x),float(y),float(z)); vec3 o=h33(i+g); o=0.5+0.42*sin(t*0.35+6.2831*o);",
    "  float d=length(g+o-f); if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d; }",
    " return vec2(d1,d2); }",
    // anillos (perfil radial con división de Cassini)
    "vec4 ring(float rr){",
    " if(rr<1.28||rr>2.3) return vec4(0.0);",
    " float a=0.25+0.55*smoothstep(1.28,1.55,rr);",
    " a*=1.0-0.92*smoothstep(1.93,1.95,rr)*(1.0-smoothstep(2.0,2.02,rr));",
    " a*=1.0-smoothstep(2.15,2.3,rr); a*=0.82+0.18*sin(rr*170.0)*sin(rr*37.0);",
    " vec3 c=mix(vec3(0.74,0.66,0.52),vec3(0.9,0.84,0.7),smoothstep(1.5,2.1,rr)); return vec4(c,a*0.85); }",
    // Sol
    "vec3 sunCol(float k){",
    " vec3 c=mix(vec3(0.45,0.1,0.02),vec3(0.95,0.42,0.1),smoothstep(0.1,0.5,k));",
    " c=mix(c,vec3(1.0,0.72,0.32),smoothstep(0.45,0.8,k)); return mix(c,vec3(1.0,0.92,0.72),smoothstep(0.8,1.05,k)); }",
    "void main(){",
    " vec2 p=(gl_FragCoord.xy/uRes)*2.0-1.0;",
    " vec3 L=normalize(vec3(-0.62,0.42,0.66));",
    " float r=length(p)/uR; vec4 col=vec4(0.0);",
    " float ct=cos(uTilt), st=sin(uTilt);",
    " vec2 pr=vec2(ct*p.x+st*p.y, -st*p.x+ct*p.y)/uR;",
    " float rr=length(vec2(pr.x, pr.y/0.34)); vec4 rg=vec4(0.0);",
    " bool ringed=uKind>1.5&&uKind<2.5; if(ringed) rg=ring(rr);",
    " bool ringFront=pr.y<0.0;",
    " if(ringed && (r>=1.0 || !ringFront)){",
    "  float sh=1.0; if(!ringFront){ sh=1.0; }",
    "  col.rgb=rg.rgb*rg.a*0.9; col.a=rg.a; }",
    " if(r<1.0){",
    "  vec3 n=vec3(p/uR, sqrt(1.0-r*r)); float mu=n.z;",
    "  vec3 q=vec3(ct*n.x+st*n.y, -st*n.x+ct*n.y, n.z);",
    // q.z>=0 en todo el disco visible: atan continua; la textura se repite sin costura
    "  float lon=atan(q.z,q.x)+uRot; float lat=asin(clamp(q.y,-1.0,1.0));",
    "  vec3 s=vec3(cos(lat)*cos(lon), sin(lat), cos(lat)*sin(lon));",
    "  vec3 c;",
    "  if(uKind>0.5 && uKind<1.5){",
    "   float t=uTime;",
    "   float big=snoise(s*2.2+vec3(t*0.02,0.0,-t*0.015));",
    // granulación: celdas (supergranulación + gránulos) con bordes oscuros
    "   vec2 cg=cells(s*44.0, t); float gran=smoothstep(0.0,0.5,cg.y-cg.x);",
    "   vec2 cs=cells(s*9.0+3.0, t*0.4); float sup=smoothstep(0.0,0.35,cs.y-cs.x);",
    "   float fine=snoise(s*90.0+vec3(t*0.3))*0.5+0.5;",
    // manchas solares con umbra y penumbra
    "   float sn=snoise(s*2.3+vec3(4.0,1.0,t*0.01)); float umbra=smoothstep(0.84,0.9,sn); float pen=smoothstep(0.76,0.84,sn)-umbra;",
    // fáculas: zonas brillantes cerca del borde
    "   float fac=smoothstep(0.3,0.8,snoise(s*6.0+vec3(1.7,t*0.02,0.0)))*pow(1.0-mu,1.5);",
    "   float k=0.56+big*0.16+gran*0.12+sup*0.1+fine*0.04;",
    "   c=sunCol(k);",
    "   c=mix(c, vec3(0.55,0.2,0.04)*0.8, pen*0.7*(0.6+0.4*fine)); c=mix(c, vec3(0.12,0.03,0.0), umbra*0.9);",
    "   c+=vec3(1.0,0.85,0.6)*fac*0.35;",
    // oscurecimiento del borde (más rojizo hacia fuera)
    "   c*=0.3+0.7*pow(mu,0.5);",
    "   c=mix(c, vec3(0.9,0.32,0.06)*0.75, pow(1.0-mu,2.5)*0.55);",
    "   c*=0.95;",
    "  } else {",
    "   float uvLat=0.5-lat/3.1415926; float uvLon=lon/6.2831853;",
    "   if(uKind>1.5 && uKind<3.5){",
    // gaseosos: rotación diferencial y turbulencia lenta en las bandas
    "    uvLon+=uTime*0.0016*sin(lat*7.0)+0.0025*snoise(vec3(s.x*3.0,s.y*14.0,uTime*0.05));",
    "    uvLat+=0.0018*snoise(vec3(s*6.0+uTime*0.04));",
    "   }",
    "   vec2 uv=vec2(uvLon, uvLat);",
    "   c=uHasTex>0.5 ? texture2D(uTex,uv).rgb : vec3(0.3);",
    // detalle fino calculado a la resolución de la pantalla
    "   float d=snoise(s*28.0)*0.6+snoise(s*64.0)*0.4; c*=1.0+d*uDetail;",
    // relieve (rocosos y continentes): normal perturbada por el brillo de la textura
    "   vec3 nn=n;",
    "   if(uKind<0.5 || uKind>3.5){",
    "    float h0=lum(texture2D(uTex,uv).rgb), hx=lum(texture2D(uTex,uv+vec2(uTexel.x,0.0)).rgb), hy=lum(texture2D(uTex,uv+vec2(0.0,uTexel.y)).rgb);",
    "    float k=uKind>3.5 ? 1.2 : 3.0;",
    "    nn=normalize(n+vec3(h0-hx, hy-h0, 0.0)*k);",
    "   }",
    "   float dl=dot(nn,L); float dn=dot(n,L);",
    "   float lit=smoothstep(-0.16,0.6,dl);",
    "   if(uKind>3.5){",
    // Tierra: nubes propias que se mueven, sombras de nubes, océanos con brillo
    "    float water=smoothstep(0.03,0.12,c.b-max(c.r,c.g)*0.92);",
    "    vec3 cs=s; float cl=snoise(vec3(cs.x*2.6+uTime*0.012,cs.y*5.0,cs.z*2.6))*0.55+snoise(cs*7.0+vec3(uTime*0.02,0.0,0.0))*0.3+snoise(cs*16.0)*0.15;",
    "    float cloud=smoothstep(0.12,0.6,cl)*0.85;",
    "    c*=1.0-cloud*0.35;",
    "    vec3 H=normalize(L+vec3(0.0,0.0,1.0)); float spec=pow(max(dot(n,H),0.0),48.0)*water*0.55;",
    "    c=c*(0.04+0.96*lit)+vec3(1.0,0.95,0.85)*spec*smoothstep(0.0,0.3,dn);",
    "    c=mix(c, vec3(0.95,0.97,1.0)*(0.06+0.94*smoothstep(-0.12,0.55,dn)), cloud);",
    "   } else {",
    "    c*=0.04+0.96*lit;",
    "   }",
    "   float lu=lum(c); c=mix(c,vec3(lu),0.14)*0.86;",
    "   c+=uRim*pow(1.0-mu,3.0)*0.55*(0.2+0.8*smoothstep(-0.3,0.5,dn));",
    // sombra del anillo sobre el planeta
    "   if(ringed){ vec2 sp=pr+vec2(0.12,-0.1); float sr=length(vec2(sp.x,sp.y/0.34)); c*=1.0-0.45*ring(sr).a*step(0.0,-sp.y); }",
    "  }",
    "  float aa=1.0-smoothstep(1.0-2.0/(uR*uRes.y*0.5),1.0,r);",
    "  col=vec4(c*aa,aa)+col*(1.0-aa);",
    "  if(ringed && ringFront && rg.a>0.0){ col.rgb=mix(col.rgb, rg.rgb*0.9, rg.a); col.a=max(col.a,rg.a); }",
    " }",
    // halo exterior: atmósfera o corona
    " if(r>=0.97){",
    "  float g;",
    "  if(uKind>0.5&&uKind<1.5){",
    "   float ang=atan(p.y,p.x); float t=uTime;",
    "   float rays=snoise(vec3(cos(ang)*2.5,sin(ang)*2.5,t*0.06))*0.5+snoise(vec3(cos(ang)*7.0,sin(ang)*7.0,t*0.1+r))*0.3+snoise(vec3(cos(ang)*18.0,sin(ang)*18.0,r*3.0-t*0.15))*0.2;",
    "   float prom=smoothstep(0.55,0.8,snoise(vec3(cos(ang)*4.0,sin(ang)*4.0,7.0+t*0.03)))*exp(-(r-1.0)*22.0)*smoothstep(0.0,0.02,r-1.0);",
    "   g=exp(-(r-1.0)*4.2)*(0.62+0.38*rays)+exp(-(r-1.0)*14.0)*0.6;",
    "   vec3 cc=mix(vec3(1.0,0.48,0.14),vec3(1.0,0.78,0.45),exp(-(r-1.0)*10.0));",
    "   g*=1.0-smoothstep(0.82,1.0,length(p));",
    "   g+=prom*0.9;",
    "   col.rgb+=cc*g*(1.0-col.a*0.7)+vec3(1.0,0.4,0.15)*prom*0.5; col.a=max(col.a,g*0.95);",
    "  } else {",
    "   g=exp(-(r-1.0)*16.0)*0.34*(0.35+0.65*smoothstep(-0.6,0.6,dot(normalize(p),L.xy)));",
    "   g*=1.0-smoothstep(0.85,1.0,length(p));",
    "   col.rgb+=uRim*g*(1.0-col.a*0.6); col.a=max(col.a,g*0.9);",
    "  }",
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
  var U = {}; ["uTex", "uRes", "uTexel", "uRot", "uTilt", "uKind", "uR", "uTime", "uHasTex", "uRim", "uDetail"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.uTex, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  var aniso = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

  /* ---------- Texturas (con mipmaps): solo la del planeta cercano ---------- */
  var textures = {};
  function loadTex(name, cb) {
    if (!name) { cb && cb(null); return; }
    if (textures[name]) { if (textures[name].ready) cb && cb(textures[name]); else textures[name].cbs.push(cb); return; }
    var t = textures[name] = { ready: false, cbs: [cb], tex: null, w: 1, h: 1 };
    var img = new Image(); img.decoding = "async";
    img.onload = function () {
      t.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      t.w = img.naturalWidth; t.h = img.naturalHeight;
      t.ready = true; t.cbs.forEach(function (f) { f && f(t); }); t.cbs = [];
    };
    img.src = "assets/planetas/" + name + (isMobile() ? "-m" : "") + ".webp";
  }

  /* ---------- Estado ---------- */
  var current = null, slotNow = null, rot = Math.random() * 6.28, rotVel = 0, quality = 1, running = false;
  var frameTimes = [], last = 0, visible = new Map(), drag = null, clock = 0;

  function size() {
    if (!slotNow) return;
    var r = slotNow.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    var w = Math.max(64, Math.round(r.width * dpr)), h = Math.max(64, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  function draw() {
    if (!current) return;
    var P = PLANETS[current];
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    var T = P.tex && textures[P.tex] && textures[P.tex].ready ? textures[P.tex] : null;
    if (T) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.tex); }
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform2f(U.uTexel, T ? 1 / T.w : 0.001, T ? 1 / T.h : 0.001);
    gl.uniform1f(U.uRot, rot % 6.283185307); gl.uniform1f(U.uTilt, P.tilt); gl.uniform1f(U.uKind, P.kind);
    gl.uniform1f(U.uR, P.r); gl.uniform1f(U.uTime, clock); gl.uniform1f(U.uHasTex, T ? 1 : 0);
    gl.uniform1f(U.uDetail, P.detail);
    gl.uniform3f(U.uRim, P.rim[0], P.rim[1], P.rim[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Parallax suave + flotación lenta (el planeta parece vivo, sin invadir el texto)
  function place(t) {
    if (!slotNow || reduced) return;
    var r = slotNow.getBoundingClientRect();
    var c = r.top + r.height / 2 - window.innerHeight / 2;
    var lim = isMobile() ? 10 : 60, k = isMobile() ? 0.03 : 0.12;
    var ty = Math.max(-lim, Math.min(lim * 0.25, -c * k));
    var bob = isMobile() ? 3 : 6;
    ty += Math.sin(t / 2600) * bob; var tx = Math.sin(t / 3700) * bob * 0.7;
    canvas.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0)";
  }

  function loop(t) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden) { last = 0; return; }
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016; last = t;
    clock += dt;
    if (!drag) { rot += dt * PLANETS[current].speed + rotVel * dt; rotVel *= Math.pow(0.12, dt); }
    frameTimes.push(dt); if (frameTimes.length > 60) {
      var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length; frameTimes = [];
      if (avg > 0.03 && quality > 0.7) { quality -= 0.1; size(); }
    }
    place(t);
    draw();
  }

  function activate(slot) {
    if (slot === slotNow) {
      // vuelve a la vista el mismo planeta (al subir): reanudar
      canvas.classList.add("is-on");
      if (!reduced && !running) { running = true; last = 0; requestAnimationFrame(loop); }
      return;
    }
    var name = slot.getAttribute("data-planet");
    canvas.classList.remove("is-on");
    setTimeout(function () {
      slotNow = slot; current = name; rotVel = 0;
      slot.appendChild(canvas); size(); place(performance.now());
      loadTex(PLANETS[name].tex, function () {
        if (current !== name) return;
        draw(); canvas.classList.add("is-on");
        if (!reduced && !running) { running = true; last = 0; requestAnimationFrame(loop); }
      });
    }, slotNow ? 350 : 0);
  }

  /* ---------- Girar con el ratón o el dedo (arrastre horizontal) ---------- */
  var tap = null;
  canvas.addEventListener("pointerdown", function (e) {
    tap = { x: e.clientX, y: e.clientY, t: performance.now() };
    drag = { x: e.clientX, t: performance.now(), v: 0 };
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-drag");
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var w = canvas.getBoundingClientRect().width || 200, dx = e.clientX - drag.x, now = performance.now();
    var dr = dx / w * 3.4; rot -= dr;
    drag.v = -dr / Math.max(0.008, (now - drag.t) / 1000); drag.x = e.clientX; drag.t = now;
    if (reduced || !running) draw();
  });
  function endDrag() { if (!drag) return; rotVel = Math.max(-6, Math.min(6, drag.v * 0.6)); drag = null; canvas.classList.remove("is-drag"); }
  canvas.addEventListener("pointerup", function (e) {
    // Toque corto sin arrastrar: avisa a la web (los planetas guardan sorpresas, ver js/sorpresas.js)
    if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8 && performance.now() - tap.t < 450) {
      document.dispatchEvent(new CustomEvent("wc:planet-tap", { detail: { name: current, slot: slotNow } }));
    }
    tap = null; endDrag();
  });
  canvas.addEventListener("pointercancel", endDrag);

  /* ---------- El planeta más visible se lleva el lienzo; el siguiente se precarga ---------- */
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

  window.addEventListener("resize", function () { size(); if (!running) draw(); });

  // Imagen fija del mismo render (herramientas)
  window.__planetStill = function (name, px) {
    return new Promise(function (res) {
      current = name; canvas.width = canvas.height = px || 600; gl.viewport(0, 0, canvas.width, canvas.height);
      loadTex(PLANETS[name].tex, function () { clock = 40; draw(); res(canvas.toDataURL("image/png")); });
    });
  };
})();

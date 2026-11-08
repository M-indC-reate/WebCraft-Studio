// Fragment shaders que generan mapas equirectangulares (u = longitud, v = latitud) a partir de ruido 3D sobre la esfera
const NOISE = `
precision highp float;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float a=0.0, w=0.5; for(int i=0;i<7;i++){ a+=w*snoise(p); p*=2.03; w*=0.5; } return a; }
float ridged(vec3 p){ float a=0.0, w=0.5; for(int i=0;i<6;i++){ a+=w*(1.0-abs(snoise(p))); p*=2.1; w*=0.5; } return a; }
// cráteres: Voronoi 3D
vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
float craters(vec3 p){
  vec3 i=floor(p), f=fract(p); float h=0.0;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){
    vec3 g=vec3(x,y,z); vec3 o=hash3(i+g); float r=0.18+0.32*o.x; float d=length(g+o-f)/r;
    if(o.y>0.35){ float bowl = d<1.0 ? (d*d-1.0)*0.9 : 0.0; float rim = exp(-pow((d-1.0)*5.0,2.0))*0.35; h += (bowl+rim)*(0.5+o.z); }
  }
  return h;
}
uniform vec2 uRes; uniform float uSeed;
vec3 sph(){ vec2 uv=gl_FragCoord.xy/uRes; float lon=uv.x*6.2831853; float lat=(uv.y-0.5)*3.1415926;
  return vec3(cos(lat)*cos(lon), sin(lat), cos(lat)*sin(lon)); }
float latv(){ return gl_FragCoord.y/uRes.y*2.0-1.0; }
`;
const SH = {
earth: `
void main(){ vec3 p=sph(); float lat=p.y;
  float h=fbm(p*0.9+uSeed)+0.3*fbm(p*3.0+2.0)-0.02;
  vec3 deep=vec3(0.05,0.16,0.34), shallow=vec3(0.10,0.30,0.52);
  vec3 col=mix(deep,shallow,smoothstep(-0.2,0.12,h));
  if(h>0.12){ float k=smoothstep(0.12,0.6,h);
    vec3 green=vec3(0.16,0.32,0.15), dry=vec3(0.48,0.40,0.26), high=vec3(0.36,0.33,0.28);
    col=mix(green,dry,smoothstep(0.25,0.55,1.0-abs(lat)*1.6+0.2*fbm(p*6.0)));
    col=mix(col,high,k*0.6); col*=0.9+0.15*fbm(p*20.0); }
  float ice=smoothstep(0.975,0.985,abs(lat)+0.01*fbm(p*6.0)); col=mix(col,vec3(0.9,0.93,0.96),ice);
  vec3 w=vec3(fbm(p*2.2+7.0),fbm(p*2.2+3.0),0.0);
  float cl=smoothstep(0.15,0.6,fbm(vec3(p.x*2.0,p.y*4.0,p.z*2.0)+w*1.6));
  col=mix(col,vec3(0.94,0.95,0.97),cl*0.75);
  gl_FragColor=vec4(col,1.0); }`,
moon: `
void main(){ vec3 p=sph();
  float c=craters(p*5.0)+craters(p*12.0)*0.6+craters(p*28.0)*0.35;
  float maria=smoothstep(0.05,0.35,fbm(p*1.4+uSeed));
  vec3 col=mix(vec3(0.66,0.66,0.68),vec3(0.38,0.39,0.42),maria);
  col*=0.86+0.22*c+0.06*fbm(p*30.0);
  gl_FragColor=vec4(col,1.0); }`,

jupiter: `
void main(){ vec3 p=sph(); float lat=p.y;
  vec3 q=p*2.0+uSeed; vec3 w=vec3(fbm(q*1.5),fbm(q*1.5+5.2),fbm(q*1.5+9.1));
  float turb=fbm(vec3(p.x*3.0,p.y*18.0,p.z*3.0)+w*2.4);
  float y=lat+0.05*turb+0.018*fbm(vec3(p.x*10.0,p.y*50.0,p.z*10.0)+w*3.0);
  float b=sin(y*42.0)*0.5+0.5, b2=sin(y*17.0+1.3)*0.5+0.5, b3=sin(y*93.0)*0.5+0.5;
  vec3 cream=vec3(0.93,0.89,0.80), tan=vec3(0.84,0.70,0.53), brown=vec3(0.62,0.42,0.29), dark=vec3(0.42,0.30,0.22), white=vec3(0.97,0.95,0.90);
  vec3 col=mix(cream,tan,smoothstep(0.25,0.75,b));
  col=mix(col,brown,smoothstep(0.55,0.95,b2)*0.75);
  col=mix(col,dark,smoothstep(0.82,1.0,b3)*0.35);
  col=mix(col,white,smoothstep(0.6,0.9,1.0-b)*smoothstep(-0.25,0.25,cos(lat*3.0))*0.35);
  col*=0.92+0.16*fbm(vec3(p.x*8.0,p.y*40.0,p.z*8.0)+w*2.0);
  // Gran Mancha Roja
  vec3 c=normalize(vec3(cos(-0.39)*cos(2.2),sin(-0.39),cos(-0.39)*sin(2.2)));
  float d=length((p-c)*vec3(1.0,2.2,1.0)); float spot=smoothstep(0.24,0.12,d+0.02*turb);
  col=mix(col,mix(vec3(0.74,0.36,0.22),vec3(0.86,0.52,0.36),smoothstep(0.0,0.14,d)),spot);
  col=mix(col,vec3(0.95,0.9,0.82),smoothstep(0.26,0.2,d)*(1.0-spot)*0.5);
  col*=1.0-0.25*pow(abs(lat),3.0);
  gl_FragColor=vec4(col,1.0); }`,
saturn: `
void main(){ vec3 p=sph(); float lat=p.y;
  vec3 w=vec3(fbm(p*2.0+uSeed),fbm(p*2.0+3.7),0.0);
  float y=lat+0.02*fbm(vec3(p.x*4.0,p.y*20.0,p.z*4.0)+w);
  float b=sin(y*36.0)*0.5+0.5, b2=sin(y*13.0+0.7)*0.5+0.5;
  vec3 a=vec3(0.95,0.88,0.70), c=vec3(0.85,0.74,0.52), d=vec3(0.72,0.60,0.42);
  vec3 col=mix(a,c,smoothstep(0.3,0.8,b)); col=mix(col,d,smoothstep(0.6,1.0,b2)*0.5);
  col*=0.95+0.08*fbm(vec3(p.x*6.0,p.y*30.0,p.z*6.0));
  col=mix(col,vec3(0.62,0.66,0.72),smoothstep(0.82,0.98,abs(lat))*0.6);
  gl_FragColor=vec4(col,1.0); }`,
uranus: `
void main(){ vec3 p=sph(); float lat=p.y;
  float b=sin((lat+0.01*fbm(p*3.0))*20.0)*0.5+0.5;
  vec3 col=mix(vec3(0.66,0.86,0.88),vec3(0.60,0.82,0.86),b*0.6);
  col*=0.97+0.05*fbm(vec3(p.x*3.0,p.y*16.0,p.z*3.0)+uSeed);
  col=mix(col,vec3(0.78,0.92,0.93),smoothstep(0.7,1.0,lat)*0.5);
  gl_FragColor=vec4(col,1.0); }`,
neptune: `
void main(){ vec3 p=sph(); float lat=p.y;
  vec3 q=p*1.7+uSeed; vec3 w=vec3(fbm(q),fbm(q+4.1),fbm(q+8.3));
  float y=lat+0.07*fbm(vec3(p.x*2.2,p.y*7.0,p.z*2.2)+w*2.2);
  float b=sin(y*11.0)*0.5+0.5, b2=sin(y*27.0+1.3)*0.5+0.5;
  vec3 deep=vec3(0.12,0.22,0.55), mid=vec3(0.2,0.36,0.76), light=vec3(0.34,0.52,0.88);
  vec3 col=mix(deep,mid,smoothstep(0.15,0.85,b));
  col=mix(col,light,smoothstep(0.65,1.0,b2)*0.3);
  col*=0.88+0.22*fbm(p*5.0+w*1.8);
  float streak=smoothstep(0.42,0.75,fbm(vec3(p.x*5.0,p.y*42.0,p.z*5.0)+w*3.0))*smoothstep(0.55,0.05,abs(lat+0.28));
  col=mix(col,vec3(0.86,0.91,1.0),streak*0.55);
  vec3 c=normalize(vec3(cos(-0.36)*cos(1.0),sin(-0.36),cos(-0.36)*sin(1.0)));
  float d=length((p-c)*vec3(1.0,1.7,1.0))+0.03*w.y;
  col=mix(col,vec3(0.06,0.11,0.32),smoothstep(0.13,0.07,d));
  col=mix(col,vec3(0.8,0.86,1.0),smoothstep(0.04,0.0,abs(d-0.15))*0.12);
  col=mix(col,deep*0.85,smoothstep(0.55,1.0,abs(lat))*0.45);
  gl_FragColor=vec4(col,1.0); }`,
mars: `
void main(){ vec3 p=sph(); float lat=p.y;
  float alb=fbm(p*2.2+uSeed); float det=fbm(p*14.0+3.0);
  vec3 ochre=vec3(0.80,0.48,0.30), rust=vec3(0.66,0.32,0.18), dark=vec3(0.36,0.22,0.16);
  vec3 col=mix(ochre,rust,smoothstep(-0.3,0.4,alb+0.25*det));
  col=mix(col,dark,smoothstep(0.2,0.55,fbm(p*1.1+11.0)+0.15*det)*0.55);
  float cr=craters(p*9.0)*0.5+craters(p*22.0)*0.25;
  col*=0.92+0.18*cr+0.08*det;
  float cap=smoothstep(0.984,0.99,abs(lat)+0.006*fbm(p*8.0));
  col=mix(col,vec3(0.95,0.94,0.92),cap);
  gl_FragColor=vec4(col,1.0); }`,
mars_bump: `
void main(){ vec3 p=sph(); float h=0.5+0.25*fbm(p*3.0+uSeed)+0.25*(craters(p*9.0)*0.5+craters(p*22.0)*0.3)+0.08*ridged(p*12.0);
  gl_FragColor=vec4(vec3(clamp(h,0.0,1.0)),1.0); }`,
mercury: `
void main(){ vec3 p=sph();
  float c=craters(p*6.0)+craters(p*14.0)*0.6+craters(p*32.0)*0.35;
  float alb=fbm(p*3.0+uSeed);
  vec3 col=mix(vec3(0.55,0.52,0.49),vec3(0.42,0.40,0.38),smoothstep(-0.4,0.4,alb));
  col*=0.85+0.25*c+0.08*fbm(p*30.0);
  float rays=smoothstep(0.75,0.95,ridged(p*5.0+2.0)); col=mix(col,vec3(0.7,0.68,0.65),rays*0.25);
  gl_FragColor=vec4(col,1.0); }`,
mercury_bump: `
void main(){ vec3 p=sph(); float h=0.5+0.35*(craters(p*6.0)+craters(p*14.0)*0.6+craters(p*32.0)*0.35)+0.05*fbm(p*20.0);
  gl_FragColor=vec4(vec3(clamp(h,0.0,1.0)),1.0); }`,
venus: `
void main(){ vec3 p=sph();
  vec3 q=p*1.6+uSeed; vec3 w=vec3(fbm(q),fbm(q+5.3),fbm(q+9.7));
  float n=fbm(vec3(p.x*2.0,p.y*5.0,p.z*2.0)+w*2.2);
  vec3 col=mix(vec3(0.86,0.72,0.47),vec3(0.96,0.88,0.68),smoothstep(-0.5,0.5,n));
  col=mix(col,vec3(0.78,0.62,0.40),smoothstep(0.3,0.7,fbm(p*4.0+w))*0.35);
  gl_FragColor=vec4(col,1.0); }`,
clouds: `
void main(){ vec3 p=sph(); float lat=p.y;
  vec3 w=vec3(fbm(p*2.0+uSeed),fbm(p*2.0+7.7),fbm(p*2.0+2.2));
  float n=fbm(vec3(p.x*3.0,p.y*6.0,p.z*3.0)+w*1.6);
  float a=smoothstep(0.05,0.55,n)*0.95;
  a*=0.65+0.35*smoothstep(0.0,0.4,abs(lat));
  gl_FragColor=vec4(vec3(1.0),a); }`,
rock: `
void main(){ vec3 p=sph();
  float n=fbm(p*5.0+uSeed), d=fbm(p*40.0+3.0), dd=snoise(p*160.0);
  vec3 col=mix(vec3(0.27,0.26,0.25),vec3(0.40,0.38,0.36),smoothstep(-0.5,0.5,n));
  col*=0.85+0.2*d+0.06*dd;
  float c=craters(p*7.0)*0.6+craters(p*18.0)*0.35;
  col*=0.9+0.25*c;
  float specks=step(0.92,snoise(p*220.0)); col+=specks*0.05;
  gl_FragColor=vec4(col,1.0); }`,
rock_bump: `
void main(){ vec3 p=sph(); float h=0.5+0.22*fbm(p*6.0+uSeed)+0.14*ridged(p*18.0)+0.3*(craters(p*7.0)*0.6+craters(p*18.0)*0.35)+0.05*snoise(p*120.0);
  gl_FragColor=vec4(vec3(clamp(h,0.0,1.0)),1.0); }`
};
module.exports = { NOISE, SH };

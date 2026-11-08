// Genera las texturas equirectangulares de los planetas (assets/planetas/).
// Uso: npm i playwright && node tools/planetas/run.js [nombre…]
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const { NOISE, SH } = require('./shaders.js');
const OUT = path.join(__dirname, '../../assets/planetas/');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv.slice(2);
const jobs0 = [
  ['earth', 2048, 1024, 3.0], ['moon', 2048, 1024, 6.0], ['mars', 2048, 1024, 5.0],
  ['jupiter', 2048, 1024, 1.0], ['saturn', 2048, 1024, 2.0], ['neptune', 2048, 1024, 4.0]
];
const jobs = ONLY.length ? jobs0.filter(j => ONLY.includes(j[0])) : jobs0;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await p.setContent('<canvas id=c></canvas>');
  for (const [name, w, h, seed] of jobs) {
    const t0 = Date.now();
    const data = await p.evaluate(({ src, w, h, seed, alpha }) => {
      const c = document.getElementById('c'); c.width = w; c.height = h;
      const gl = c.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true });
      const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, 'attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }'); gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, src); gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return 'ERR ' + gl.getShaderInfoLog(fs);
      const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(gl.getUniformLocation(pr, 'uRes'), w, h); gl.uniform1f(gl.getUniformLocation(pr, 'uSeed'), seed);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      // el canvas tiene el origen arriba; el shader usa v=0 abajo → voltear para equirect estándar (norte arriba)
      const o = document.createElement('canvas'); o.width = w; o.height = h; const x = o.getContext('2d');
      x.translate(0, h); x.scale(1, -1); x.drawImage(c, 0, 0);
      return o.toDataURL(alpha ? 'image/png' : 'image/webp', 0.86);
    }, { src: NOISE + SH[name], w, h, seed, alpha: false });
    if (data.startsWith('ERR')) { console.log(name, data); continue; }
    const ext = 'webp';
    fs.writeFileSync(OUT + name + '.' + ext, Buffer.from(data.split(',')[1], 'base64'));
    console.log(name, w + 'x' + h, (fs.statSync(OUT + name + '.' + ext).size / 1024 | 0) + 'KB', (Date.now() - t0) + 'ms');
  }
  await b.close();
})();

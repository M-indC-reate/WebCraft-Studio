// Captura las maquetas de concepto a assets/proyectos/ (1200x750 WebP).
// Uso: npm i playwright && node tools/maquetas/capturar.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const n of ['panaderia', 'fisioterapia']) {
    await p.goto('file://' + path.join(__dirname, n + '.html')); await p.waitForTimeout(400);
    const buf = await p.screenshot({ type: 'png' });
    require('fs').writeFileSync(path.join(__dirname, n + '.png'), buf);
  }
  await b.close();
})();

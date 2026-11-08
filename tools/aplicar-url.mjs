// Aplica SITE_URL (js/config.js) a canonical, Open Graph, sitemap.xml, robots.txt y 404.html.
// Uso: node tools/aplicar-url.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = f => readFileSync(join(root, f), "utf8");
const cfg = read("js/config.js");
const m = cfg.match(/SITE_URL:\s*"([^"]+)"/);
if (!m) { console.error("No encuentro SITE_URL en js/config.js"); process.exit(1); }
const url = m[1].replace(/\/+$/, "");
const old = (read("sitemap.xml").match(/<loc>([^<]+)<\/loc>/) || [])[1]?.replace(/\/+$/, "");
if (!old) { console.error("No encuentro la URL actual en sitemap.xml"); process.exit(1); }
if (old === url) { console.log("La URL ya está aplicada:", url); process.exit(0); }
for (const f of ["index.html", "404.html", "sitemap.xml", "robots.txt"]) {
  const s = read(f); const n = s.split(old).join(url);
  writeFileSync(join(root, f), n); console.log(f, s === n ? "(sin cambios)" : "actualizado");
}
console.log("URL aplicada:", url);

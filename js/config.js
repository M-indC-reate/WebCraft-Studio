/* =========================================================
   WebCraft Studio — Configuración
   Todo lo que se puede cambiar sin tocar el código.
   ========================================================= */
window.WEBCRAFT_CONFIG = {
  /* ---------- Dirección de la web ----------
     Una sola variable. Si cambia (otro subdominio o dominio propio),
     cámbiala aquí y ejecuta:  node tools/aplicar-url.mjs
     para actualizar canonical, Open Graph, sitemap.xml, robots.txt y 404.html. */
  SITE_URL: "https://webcraft-studio.pages.dev", // TODO: confirmar que el nombre está libre en Cloudflare Pages

  /* ---------- Pre-apertura ----------
     true  → aviso arriba y botones "Avísame cuando abráis".
     false → sin aviso; botones "Pedir presupuesto" y formulario de proyecto. */
  PREAPERTURA: true,
  FECHA_APERTURA: "muy pronto", // p. ej. "en enero de 2027"

  /* ---------- Color de acento ----------
     "celeste" (#22D3EE) o "dorado" (#E8C27A). */
  ACENTO: "celeste",

  /* ---------- Contacto y redes ----------
     Si una está vacía, su enlace NO aparece. */
  EMAIL: "",      // TODO: email de contacto
  INSTAGRAM: "",  // TODO: usuario sin @
  WHATSAPP: "",   // TODO: número con prefijo, sin espacios ni + (p. ej. 34600000000)
  WHATSAPP_MENSAJE: "Hola, he visto vuestra web y me interesa una web para mi negocio.",

  /* ---------- Formulario ----------
     Desactivado hasta tener servicio de envío y política de privacidad.
     Mientras sea false: no envía nada; el botón dice "Muy pronto podrás apuntarte"
     (o lleva a Instagram si INSTAGRAM tiene valor). */
  FORMULARIO_ACTIVO: false,
  FORM_ENDPOINT: "", // TODO: endpoint del servicio elegido al lanzar

  /* ---------- Páginas legales (vacías → enlaces ocultos) ---------- */
  AVISO_LEGAL_URL: "", // TODO
  PRIVACIDAD_URL: "",  // TODO

  /* ---------- Proyectos ---------- */
  VESTA_URL: "https://vesta-eventos.pages.dev",
};

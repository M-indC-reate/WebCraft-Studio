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
  EMAIL: "holawebcarftstudio@gmail.com", // correo del estudio
  INSTAGRAM: "",  // TODO: usuario sin @
  WHATSAPP: "",   // TODO: número con prefijo, sin espacios ni + (p. ej. 34600000000)
  WHATSAPP_MENSAJE: "Hola, he visto vuestra web y me interesa una web para mi negocio.",

  /* ---------- Formulario ----------
     Desactivado hasta tener servicio de envío y política de privacidad.
     Mientras sea false: el formulario no se muestra ni guarda nada; en su lugar
     aparece "Escríbenos un email" / "Escríbenos por Instagram" con EMAIL e INSTAGRAM.
     Al ponerlo en true, el formulario vuelve a mostrarse solo. */
  FORMULARIO_ACTIVO: false,
  FORM_ENDPOINT: "", // TODO: endpoint del servicio elegido al lanzar

  /* ---------- Páginas legales (vacías → enlaces ocultos) ---------- */
  AVISO_LEGAL_URL: "", // TODO
  PRIVACIDAD_URL: "",  // TODO

  /* ---------- Proyectos ---------- */
  VESTA_URL: "https://vesta-eventos.pages.dev",
};

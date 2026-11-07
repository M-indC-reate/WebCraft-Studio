/* =========================================================
   WebCraft Studio — Configuración
   Todo lo que se puede cambiar sin tocar el código.
   ========================================================= */
window.WEBCRAFT_CONFIG = {
  /* ---------- Pre-apertura ----------
     true  → aviso arriba, los botones dicen "Avísame cuando abráis"
             y el formulario apunta a la lista de espera.
     false → sin aviso, botones "Pedir presupuesto" y formulario de proyecto. */
  PREAPERTURA: true,

  // Cuándo abrís. Aparece en el aviso y en las preguntas frecuentes.
  // Ejemplos: "muy pronto", "en enero de 2027", "el 15 de enero".
  FECHA_APERTURA: "muy pronto",

  /* ---------- Contacto y redes ----------
     Si una está vacía, su enlace NO aparece en la web. */
  EMAIL: "",      // TODO: p. ej. "hola@webcraftstudio.com"
  INSTAGRAM: "",  // TODO: usuario sin @, p. ej. "webcraftstudio"
  WHATSAPP: "",   // TODO: número con prefijo y sin espacios ni +, p. ej. "34600123456"
  WHATSAPP_MENSAJE: "Hola, he visto vuestra web y me interesa una web para mi negocio.",

  /* ---------- Formulario ----------
     Endpoint de Formspree (https://formspree.io/f/XXXXXXX).
     Vacío → si hay EMAIL, abre el correo; si no, avisa de que aún no está activo. */
  FORM_ENDPOINT: "", // TODO

  /* ---------- Páginas legales ----------
     Vacías → los enlaces no aparecen. */
  AVISO_LEGAL_URL: "",  // TODO: cuando exista la página
  PRIVACIDAD_URL: "",   // TODO: cuando exista la página

  /* ---------- Proyectos ---------- */
  VESTA_URL: "", // TODO: confirmar el enlace público de Vesta (vacío → sin botón "Ver web")

  /* ---------- Animación de la diapositiva ----------
     Fotogramas en assets/hero/escritorio/f_001.webp … y assets/hero/movil/f_001.webp …
     Para generarlos desde el vídeo: bash tools/extraer-fotogramas.sh ruta/al/video.mp4 */
  ANIMACION: {
    FOTOGRAMAS_ESCRITORIO: 96,
    FOTOGRAMAS_MOVIL: 48,
    MARCADOR: true, // TODO: poner en false cuando estén los fotogramas del vídeo real
  },
};

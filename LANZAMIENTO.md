# Lista de lanzamiento · WebCraft Studio

Todo lo que hay que hacer el día que se publique la web, en orden.
Casi todo se cambia en **`js/config.js`**: no hace falta tocar el resto del código.

## 1. Requisitos legales (antes de nada)
- [ ] Tener resuelta el alta de la actividad.
- [ ] Redactar el **aviso legal** y la **política de privacidad** con los datos reales del titular.
      La política debe explicar qué se hace con los emails del formulario y qué servicio los recibe (paso 3).
- [ ] Publicar ambas páginas (por ejemplo `aviso-legal.html` y `privacidad.html`) y poner sus direcciones en
      `AVISO_LEGAL_URL` y `PRIVACIDAD_URL`. Con eso aparecen los enlaces del pie y el de la casilla del formulario.

## 2. Contacto y redes
- [ ] `EMAIL`: email de contacto.
- [ ] `INSTAGRAM`: usuario sin @.
      Mientras el formulario esté desactivado, el bloque de contacto usa estos dos; si los dos están vacíos, solo dice que muy pronto se podrá escribir.
- [ ] `WHATSAPP`: número con prefijo, sin espacios ni + (p. ej. `34600000000`).
      Se abre con el mensaje de `WHATSAPP_MENSAJE`.
- Si una variable se deja vacía, su enlace no aparece.

## 3. Formulario de aviso
- [ ] Elegir el servicio que recibirá los emails (p. ej. Formspree, Basin o Getform).
- [ ] Crear el formulario en ese servicio y copiar su dirección de envío en `FORM_ENDPOINT`.
- [ ] Indicar ese servicio en la política de privacidad (dónde se guardan los datos y durante cuánto tiempo).
- [ ] Poner `FORMULARIO_ACTIVO: true`.
- [ ] Hacer una prueba real: apuntarse con un email propio y comprobar que llega.

## 4. Pre-apertura
- [ ] Si todavía no se aceptan proyectos: dejar `PREAPERTURA: true` y poner la fecha en `FECHA_APERTURA`
      (p. ej. `"en enero de 2027"`).
- [ ] Si ya se aceptan: `PREAPERTURA: false` (desaparece el aviso y los botones pasan a "Pedir presupuesto").
- [ ] Revisar la pregunta "¿Cuándo empezáis a aceptar proyectos?" y, si procede, añadir "¿La web será mía?"
      (está marcada con TODO en `index.html`).

## 5. Contenido pendiente
- [ ] Captura ACTUAL de Vesta Eventos (ordenador) en `assets/proyectos/vesta-eventos.webp` (+ `.jpg`)
      y sustituir el bloque `project__pending` de `index.html` por la imagen (hay un TODO). La anterior estaba anticuada.
- [x] Color de acento: celeste (decidido).

## 6. Dirección de la web
- [ ] Comprobar que el nombre está libre en Cloudflare Pages (provisional: `webcraft-studio.pages.dev`;
      alternativas: `webcraftstudio-bcn.pages.dev`, `webcraft-bcn.pages.dev`).
- [ ] Si cambia, actualizar `SITE_URL` en `js/config.js` y ejecutar `node tools/aplicar-url.mjs`
      (actualiza canonical, Open Graph, `sitemap.xml`, `robots.txt` y `404.html`).

## 7. Publicar en Cloudflare Pages
- [ ] En Cloudflare: Workers & Pages → Create → Pages → Connect to Git → este repositorio.
- [ ] Rama de producción: la que se vaya a publicar (fusionar antes `revision-espacio` en `master` si se aprueba).
- [ ] Framework preset: None · Build command: vacío · Build output directory: `/`.
- [ ] Desactivar la publicación antigua en GitHub Pages (Settings → Pages, o borrar `.github/workflows/pages.yml`)
      para no tener dos copias de la web.

## 8. Comprobaciones finales
- [ ] Móvil (360 y 390 px), tableta (768 px) y ordenador (1366 y 1920 px): sin scroll horizontal, textos legibles,
      botones cómodos, el botón fijo no tapa nada.
- [ ] La diapositiva de metal se mueve con el scroll; con "reducir movimiento" se ve la imagen fija.
- [ ] Los planetas aparecen uno a uno en el lateral y no tapan texto.
- [ ] El formulario envía y llega el email; la casilla enlaza a la política de privacidad.
- [ ] Enlaces del pie (aviso legal, privacidad, redes) y WhatsApp con su mensaje.
- [ ] Vista previa al compartir (Open Graph) en WhatsApp o en un depurador de enlaces.
- [ ] `https://<tu-direccion>/robots.txt`, `/sitemap.xml` y una página inexistente (debe salir la 404).

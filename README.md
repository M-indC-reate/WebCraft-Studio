# WebCraft Studio

Web del estudio de diseño y desarrollo web **WebCraft Studio** (Barcelona). Un solo mundo, el espacio: fondo de estrellas sutil, un planeta por sección en el lateral, una diapositiva de metal líquido hecha con WebGL y un único color de acento.

Sitio estático (HTML + CSS + JS). Las librerías (GSAP, ScrollTrigger, SplitText y Lenis) están en `vendor/` y no hay que compilar nada.

> La web está preparada pero **no publicada**. Lo que falta para lanzarla está en [LANZAMIENTO.md](LANZAMIENTO.md).

## Estructura

```
├── index.html             # Aviso, inicio, diapositiva, servicios, cómo trabajamos, proyectos, preguntas, contacto y pie
├── 404.html               # Página de error con el mismo diseño
├── css/styles.css         # Estilos (colores y tipografías en :root)
├── js/config.js           # ⚙️ Todo lo configurable (ver abajo)
├── js/main.js             # Contenido según config, menú, mapa del viaje, botón fijo, formulario y animaciones
├── js/planets.js          # Planetas en WebGL (uno a la vez, solo se carga el cercano; se giran arrastrando)
├── js/sky.js              # Estrellas con parallax, estrellas fugaces y la estrella que escribe las palabras destacadas
├── js/metal.js            # Diapositiva de metal líquido (WebGL)
├── js/espacial.js         # UI espacial: paneles de cristal que flotan y se inclinan en 3D (css/espacial.css)
├── js/sorpresas.js        # Planetas interactivos (Saturno, Neptuno y el Sol) y la pista del contacto
├── assets/planetas/       # Texturas de los planetas (y versiones -m para móvil)
├── assets/metal/          # Imagen fija del metal (móviles lentos / reducir movimiento)
├── assets/proyectos/      # Captura de Vesta Eventos
├── tools/planetas/        # Generador de las texturas de los planetas
├── tools/maquetas/        # Maquetas de concepto (HTML) y su captura; ahora no se muestran en la web
├── tools/aplicar-url.mjs  # Aplica SITE_URL a canonical, Open Graph, sitemap, robots y 404
├── robots.txt · sitemap.xml · LANZAMIENTO.md
```

## Configuración (`js/config.js`)

| Variable | Qué hace |
|---|---|
| `SITE_URL` | Dirección de la web. Tras cambiarla: `node tools/aplicar-url.mjs`. |
| `PREAPERTURA`, `FECHA_APERTURA` | Aviso superior y botones "Avísame cuando abráis". |
| `ACENTO` | `"celeste"` o `"dorado"`. Para comparar sin tocar nada: `?acento=dorado` en la URL. |
| `EMAIL`, `INSTAGRAM`, `WHATSAPP` | Si están vacías, su enlace no aparece. |
| `FORMULARIO_ACTIVO`, `FORM_ENDPOINT` | Desactivado hasta tener servicio y política de privacidad. |
| `AVISO_LEGAL_URL`, `PRIVACIDAD_URL` | Si están vacías, sus enlaces no aparecen. |
| `VESTA_URL` | Enlace "Ver web" del proyecto Vesta Eventos. |

## Planetas y metal

- Inicio → Tierra · Diapositiva → Luna · Servicios → Marte · Cómo trabajamos → Júpiter · Proyectos → Saturno · Preguntas → Neptuno · Contacto → Sol.
- Todos generados por código con el mismo método (`tools/planetas/`); el Sol se dibuja en vivo.
- Sin WebGL, con "reducir movimiento" o en móviles lentos: planetas quietos o sin animar, y la diapositiva muestra su imagen fija.
- Para ver la imagen fija de la diapositiva: `?metalfijo`.
- Solo tres planetas son interactivos (botones con `aria-label`, funcionan con teclado): Saturno (mensaje sobre Vesta), Neptuno (una vez por visita al final de las preguntas) y el Sol (contactos de `EMAIL`, `INSTAGRAM` y `WHATSAPP`; si están vacíos, sin botones). La pista del contacto solo lleva hasta el Sol; el mensaje se descubre tocándolo. El resto es decoración.

## Ver en local

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Licencias

- Imágenes: todas propias. Planetas, Sol, portátil, cielo e imagen para redes están generados por código (`tools/planetas/`, `js/planets.js`, `js/metal.js`, `js/sky.js`); la captura de Vesta Eventos es de nuestra propia web. No se usa ninguna imagen de la NASA ni de bancos de imágenes.
- GSAP: licencia estándar de GSAP, gratuita también para uso comercial.
- Lenis: MIT.
- Syne, Manrope, Instrument Serif y Hanken Grotesk: SIL Open Font License.
